import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { pathToFileURL, URL } from "node:url";

import { APP_HOST, APP_NAME, APP_PORT, DATA_DIR, PUBLIC_DIR } from "./config.js";
import { ensureDir } from "./utils/fs.js";
import { runFullScan, getDashboardData, getSessionById, saveSessionAnnotation } from "./services/indexer.js";
import { openSessionTargetInVsCode } from "./services/actions.js";
import { exportSessionToMarkdown, saveSessionToMemory } from "./services/exporter.js";

ensureDir(DATA_DIR);

const MAX_BODY_BYTES = 1024 * 1024;
const LOOPBACK_WRITE_HOSTS = ["127.0.0.1", "localhost", "::1"];

function urlHost(host) {
  return host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
}

function normalizeOrigin(origin) {
  if (!origin) {
    return "";
  }

  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "http:") {
      return "";
    }

    const host = parsed.hostname.replace(/^\[(.*)\]$/, "$1").toLowerCase();
    const port = parsed.port || "80";
    return `http://${urlHost(host)}:${port}`;
  } catch {
    return "";
  }
}

function allowedWriteOrigins() {
  const origins = new Set(LOOPBACK_WRITE_HOSTS.map((host) => `http://${urlHost(host)}:${APP_PORT}`));
  const configuredHost = String(APP_HOST || "").replace(/^\[(.*)\]$/, "$1").toLowerCase();
  if (configuredHost && configuredHost !== "0.0.0.0" && configuredHost !== "::") {
    origins.add(`http://${urlHost(configuredHost)}:${APP_PORT}`);
  }
  return origins;
}

const ALLOWED_WRITE_ORIGINS = allowedWriteOrigins();

function isAllowedWriteOrigin(origin) {
  return !origin || ALLOWED_WRITE_ORIGINS.has(normalizeOrigin(origin));
}

export function corsHeaders(request) {
  const origin = request.headers.origin || "";
  if (isAllowedWriteOrigin(origin)) {
    return {
      "Access-Control-Allow-Origin": origin || "*",
      "Vary": "Origin"
    };
  }

  return {
    "Vary": "Origin"
  };
}

export function requestHasAllowedWriteOrigin(request) {
  const origin = request.headers.origin || "";
  return isAllowedWriteOrigin(origin);
}

function baseHeaders(request) {
  return {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self' vscode-webview: https://*.vscode-webview.net https://*.vscode-cdn.net; base-uri 'none'; form-action 'none'",
    ...corsHeaders(request)
  };
}

function hasSessionId(payload) {
  return typeof payload.sessionId === "string" && payload.sessionId.trim().length > 0;
}

function decodePathComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function sendJson(request, response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...baseHeaders(request)
  });
  response.end(JSON.stringify(payload));
}

function sendFile(request, response, filePath, contentType) {
  response.writeHead(200, {
    "Content-Type": contentType,
    ...baseHeaders(request)
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  const stream = fs.createReadStream(filePath);
  stream.on("error", (error) => {
    if (!response.headersSent) {
      sendJson(request, response, 500, {
        ok: false,
        error: String(error.message || error)
      });
    } else {
      response.destroy(error);
    }
  });

  stream.pipe(response);
}

function methodAllowedForStatic(method) {
  return method === "GET" || method === "HEAD";
}

function getContentType(filePath) {
  if (filePath.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }
  if (filePath.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }
  if (filePath.endsWith(".js")) {
    return "application/javascript; charset=utf-8";
  }
  if (filePath.endsWith(".svg")) {
    return "image/svg+xml";
  }
  if (filePath.endsWith(".json")) {
    return "application/json; charset=utf-8";
  }
  return "text/html; charset=utf-8";
}

function resolveStaticPath(pathname) {
  let decodedPathname;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const relativePath = decodedPathname === "/" ? "index.html" : decodedPathname.replace(/^\/+/, "");
  const normalizedPath = path.normalize(relativePath);
  if (normalizedPath.startsWith("..") || path.isAbsolute(normalizedPath)) {
    return null;
  }

  const publicRoot = path.resolve(PUBLIC_DIR);
  const filePath = path.resolve(publicRoot, normalizedPath);
  const normalizedRoot = publicRoot.toLowerCase();
  const normalizedFile = filePath.toLowerCase();
  if (normalizedFile !== normalizedRoot && !normalizedFile.startsWith(`${normalizedRoot}${path.sep}`)) {
    return null;
  }

  return filePath;
}

function serveStatic(request, response, pathname) {
  if (!methodAllowedForStatic(request.method)) {
    sendJson(request, response, 405, {
      ok: false,
      error: "Method not allowed."
    });
    return;
  }

  const filePath = resolveStaticPath(pathname);
  let fileStat = null;
  try {
    fileStat = filePath ? fs.statSync(filePath) : null;
  } catch {
    fileStat = null;
  }

  if (!fileStat?.isFile()) {
    sendJson(request, response, 404, { error: "Not found" });
    return;
  }
  sendFile(request, response, filePath, getContentType(filePath));
}

function readBody(request, response, callback) {
  let body = "";
  let receivedBytes = 0;
  let rejected = false;

  request.on("data", (chunk) => {
    receivedBytes += chunk.length;
    if (receivedBytes > MAX_BODY_BYTES) {
      rejected = true;
      sendJson(request, response, 413, {
        ok: false,
        error: "Request body is too large."
      });
      request.destroy();
      return;
    }

    body += chunk.toString();
  });
  request.on("error", (error) => {
    if (!rejected && !response.headersSent) {
      sendJson(request, response, 400, {
        ok: false,
        error: String(error.message || error)
      });
    }
  });
  request.on("end", () => {
    if (rejected) {
      return;
    }

    let payload;
    try {
      payload = JSON.parse(body || "{}");
    } catch (error) {
      sendJson(request, response, 400, {
        ok: false,
        error: String(error.message || error)
      });
      return;
    }

    try {
      Promise.resolve(callback(payload)).catch((error) => {
        if (!response.headersSent) {
          sendJson(request, response, 500, {
            ok: false,
            error: String(error.message || error)
          });
        }
      });
    } catch (error) {
      if (!response.headersSent) {
        sendJson(request, response, 500, {
          ok: false,
          error: String(error.message || error)
        });
      }
    }
  });
}

function handleApi(request, response, url) {
  if (request.method === "OPTIONS") {
    const allowed = requestHasAllowedWriteOrigin(request);
    sendJson(request, response, allowed ? 200 : 403, { ok: allowed });
    return;
  }

  if (request.method !== "GET" && !requestHasAllowedWriteOrigin(request)) {
    sendJson(request, response, 403, {
      ok: false,
      error: "Cross-origin write requests are not allowed."
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(request, response, 200, {
      ok: true,
      app: APP_NAME,
      host: APP_HOST,
      port: APP_PORT,
      node: process.versions.node
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/scan") {
    const result = runFullScan();
    sendJson(request, response, 200, result);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/sessions") {
    const query = url.searchParams.get("q") || "";
    const sourceId = url.searchParams.get("sourceId") || "";
    const favoritesOnly = url.searchParams.get("favoritesOnly") === "1";
    const includeArchived = url.searchParams.get("includeArchived") === "1";
    const archivedOnly = url.searchParams.get("archivedOnly") === "1";
    sendJson(request, response, 200, getDashboardData(query, {
      sourceId,
      favoritesOnly,
      includeArchived,
      archivedOnly
    }));
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/sessions/")) {
    const sessionId = decodePathComponent(url.pathname.replace("/api/sessions/", ""));
    if (sessionId === null) {
      sendJson(request, response, 400, {
        ok: false,
        error: "Invalid session id encoding."
      });
      return;
    }

    const session = getSessionById(sessionId);
    if (!session) {
      sendJson(request, response, 404, { error: "Session not found" });
      return;
    }
    sendJson(request, response, 200, session);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/open") {
    readBody(request, response, async (payload) => {
      if (!hasSessionId(payload)) {
        sendJson(request, response, 400, {
          ok: false,
          error: "Session id is required."
        });
        return;
      }

      if (!["source", "workspace"].includes(payload.target)) {
        sendJson(request, response, 400, {
          ok: false,
          error: "Open target must be source or workspace."
        });
        return;
      }

      try {
        const result = await openSessionTargetInVsCode(payload.sessionId, payload.target);
        sendJson(request, response, result.ok ? 200 : 404, result);
      } catch (error) {
        sendJson(request, response, 500, {
          ok: false,
          error: String(error.message || error)
        });
      }
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/session-meta") {
    readBody(request, response, (payload) => {
      if (!hasSessionId(payload)) {
        sendJson(request, response, 400, {
          ok: false,
          error: "Session id is required."
        });
        return;
      }

      try {
        const annotation = saveSessionAnnotation(payload.sessionId, {
          favorite: payload.favorite,
          archived: payload.archived,
          tags: payload.tags,
          noteText: payload.noteText
        });
        if (!annotation) {
          sendJson(request, response, 404, {
            ok: false,
            error: "Session not found."
          });
          return;
        }

        sendJson(request, response, 200, {
          ok: true,
          annotation
        });
      } catch (error) {
        sendJson(request, response, 400, {
          ok: false,
          error: String(error.message || error)
        });
      }
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/export") {
    readBody(request, response, (payload) => {
      if (!hasSessionId(payload)) {
        sendJson(request, response, 400, {
          ok: false,
          error: "Session id is required."
        });
        return;
      }

      try {
        const result = exportSessionToMarkdown(payload.sessionId);
        sendJson(request, response, result.ok ? 200 : 404, result);
      } catch (error) {
        sendJson(request, response, 500, {
          ok: false,
          error: String(error.message || error)
        });
      }
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/memory") {
    readBody(request, response, (payload) => {
      if (!hasSessionId(payload)) {
        sendJson(request, response, 400, {
          ok: false,
          error: "Session id is required."
        });
        return;
      }

      try {
        const result = saveSessionToMemory(payload.sessionId);
        sendJson(request, response, result.ok ? 200 : 404, result);
      } catch (error) {
        sendJson(request, response, 500, {
          ok: false,
          error: String(error.message || error)
        });
      }
    });
    return;
  }

  sendJson(request, response, 404, { error: "Unknown API route" });
}

export function createServer() {
  return http.createServer((request, response) => {
    try {
      const url = new URL(request.url || "/", `http://${request.headers.host || `localhost:${APP_PORT}`}`);
      if (url.pathname.startsWith("/api/")) {
        handleApi(request, response, url);
        return;
      }

      serveStatic(request, response, url.pathname);
    } catch (error) {
      if (!response.headersSent) {
        sendJson(request, response, 500, {
          ok: false,
          error: String(error.message || error)
        });
      } else {
        response.destroy(error);
      }
    }
  });
}

function isMainModule() {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

function logScanResult(prefix, result) {
  console.log(`${prefix} ${result.importedSessions || 0} new sessions, updated ${result.updatedSessions || 0}, skipped ${result.skippedSessions || 0}, failed ${result.failedSessions || 0}, source errors ${result.failedSources || 0}.`);
}

function runInitialScanSoon() {
  setTimeout(() => {
    try {
      logScanResult("Indexed", runFullScan());
    } catch (error) {
      console.error(`${APP_NAME} initial scan failed: ${error.message || error}`);
    }
  }, 0);
}

function main() {
  const scanOnly = process.argv.includes("--scan-only");
  if (scanOnly) {
    console.log(JSON.stringify(runFullScan(), null, 2));
    return;
  }

  const server = createServer();
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`${APP_NAME} could not start because port ${APP_PORT} is already in use.`);
      console.error(`Close the existing process or set THREADVAULT_PORT to another port.`);
      process.exitCode = 1;
      return;
    }

    console.error(`${APP_NAME} server failed: ${error.message || error}`);
    process.exitCode = 1;
  });

  server.listen(APP_PORT, APP_HOST, () => {
    console.log(`${APP_NAME} is running at http://${urlHost(APP_HOST)}:${APP_PORT}`);
    runInitialScanSoon();
  });
}

if (isMainModule()) {
  main();
}
