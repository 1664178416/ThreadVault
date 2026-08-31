import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { pathToFileURL, URL } from "node:url";

import { APP_HOST, APP_NAME, APP_PORT, DATA_DIR, PUBLIC_DIR, RUNTIME_FINGERPRINT } from "./config.js";
import { ensureDir } from "./utils/fs.js";
import { safeErrorMessage } from "./utils/text.js";
import { runFullScan, getDashboardData, getSessionById, saveSessionAnnotation } from "./services/indexer.js";
import { openSessionTargetInVsCode } from "./services/actions.js";
import { exportSessionToMarkdown, saveSessionToMemory } from "./services/exporter.js";

ensureDir(DATA_DIR);

const MAX_BODY_BYTES = 1024 * 1024;
const MAX_SESSION_ID_LENGTH = 512;
const MAX_SOURCE_ID_LENGTH = 128;
const MAX_MESSAGE_PAGE_SIZE = 500;
const MAX_SESSION_PAGE_SIZE = 300;
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

function normalizeSessionId(value) {
  if (typeof value !== "string") {
    return "";
  }

  const sessionId = value.trim();
  if (!sessionId || sessionId.length > MAX_SESSION_ID_LENGTH || /[\u0000-\u001f\u007f]/u.test(sessionId)) {
    return "";
  }

  return sessionId;
}

function sessionIdFromPayload(payload) {
  return normalizeSessionId(payload?.sessionId);
}

function normalizeSourceId(value) {
  if (typeof value !== "string") {
    return "";
  }

  const sourceId = value.trim();
  if (!sourceId) {
    return "";
  }

  if (sourceId.length > MAX_SOURCE_ID_LENGTH || /[\u0000-\u001f\u007f]/u.test(sourceId)) {
    return null;
  }

  return sourceId;
}

function boundedPageFromSearchParams(searchParams, offsetName, limitName, maximumLimit) {
  const hasOffset = searchParams.has(offsetName);
  const hasLimit = searchParams.has(limitName);
  if (!hasOffset && !hasLimit) {
    return undefined;
  }
  if (!hasOffset || !hasLimit) {
    return null;
  }

  const offsetValue = searchParams.get(offsetName) || "";
  const limitValue = searchParams.get(limitName) || "";
  if (!/^\d+$/.test(offsetValue) || !/^\d+$/.test(limitValue)) {
    return null;
  }

  const offset = Number(offsetValue);
  const limit = Number(limitValue);
  if (
    !Number.isSafeInteger(offset) ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > maximumLimit
  ) {
    return null;
  }

  return { offset, limit };
}

function messagePageFromSearchParams(searchParams) {
  const page = boundedPageFromSearchParams(
    searchParams,
    "messageOffset",
    "messageLimit",
    MAX_MESSAGE_PAGE_SIZE
  );
  return page && {
    messageOffset: page.offset,
    messageLimit: page.limit
  };
}

function sessionPageFromSearchParams(searchParams) {
  const page = boundedPageFromSearchParams(
    searchParams,
    "sessionOffset",
    "sessionLimit",
    MAX_SESSION_PAGE_SIZE
  );
  return page && {
    sessionOffset: page.offset,
    sessionLimit: page.limit
  };
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
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  response.end(JSON.stringify(payload));
}

function sendError(request, response, statusCode, error, fallback = "Request failed.") {
  sendJson(request, response, statusCode, {
    ok: false,
    error: safeErrorMessage(error, fallback)
  });
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
      sendError(request, response, 500, error);
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
    sendJson(request, response, 404, {
      ok: false,
      error: "Not found"
    });
    return;
  }
  sendFile(request, response, filePath, getContentType(filePath));
}

function isJsonObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readBody(request, response, callback) {
  const chunks = [];
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

    chunks.push(Buffer.from(chunk));
  });
  request.on("error", (error) => {
    if (!rejected && !response.headersSent) {
      sendError(request, response, 400, error, "Request body could not be read.");
    }
  });
  request.on("end", () => {
    if (rejected) {
      return;
    }

    let payload;
    try {
      const body = Buffer.concat(chunks, receivedBytes).toString("utf8");
      payload = JSON.parse(body || "{}");
    } catch (error) {
      sendError(request, response, 400, error, "Request body is not valid JSON.");
      return;
    }

    if (!isJsonObject(payload)) {
      sendJson(request, response, 400, {
        ok: false,
        error: "Request body must be a JSON object."
      });
      return;
    }

    try {
      Promise.resolve(callback(payload)).catch((error) => {
        if (!response.headersSent) {
          sendError(request, response, 500, error);
        }
      });
    } catch (error) {
      if (!response.headersSent) {
        sendError(request, response, 500, error);
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

  if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/api/health") {
    sendJson(request, response, 200, {
      ok: true,
      app: APP_NAME,
      host: APP_HOST,
      port: APP_PORT,
      node: process.versions.node,
      runtimeFingerprint: RUNTIME_FINGERPRINT
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
    const sourceId = normalizeSourceId(url.searchParams.get("sourceId") || "");
    if (sourceId === null) {
      sendJson(request, response, 400, {
        ok: false,
        error: "Invalid source id."
      });
      return;
    }
    const favoritesOnly = url.searchParams.get("favoritesOnly") === "1";
    const includeArchived = url.searchParams.get("includeArchived") === "1";
    const archivedOnly = url.searchParams.get("archivedOnly") === "1";
    const sessionPage = sessionPageFromSearchParams(url.searchParams);
    if (sessionPage === null) {
      sendJson(request, response, 400, {
        ok: false,
        error: "Invalid session page."
      });
      return;
    }
    sendJson(request, response, 200, getDashboardData(query, {
      sourceId,
      favoritesOnly,
      includeArchived,
      archivedOnly
    }, sessionPage));
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/sessions/")) {
    const decodedSessionId = decodePathComponent(url.pathname.replace("/api/sessions/", ""));
    const sessionId = normalizeSessionId(decodedSessionId);
    if (decodedSessionId === null || !sessionId) {
      sendJson(request, response, 400, {
        ok: false,
        error: "Invalid session id encoding."
      });
      return;
    }

    const messagePage = messagePageFromSearchParams(url.searchParams);
    if (messagePage === null) {
      sendJson(request, response, 400, {
        ok: false,
        error: "Invalid message page."
      });
      return;
    }

    const session = getSessionById(sessionId, messagePage);
    if (!session) {
      sendJson(request, response, 404, {
        ok: false,
        error: "Session not found"
      });
      return;
    }
    sendJson(request, response, 200, session);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/open") {
    readBody(request, response, async (payload) => {
      const sessionId = sessionIdFromPayload(payload);
      if (!sessionId) {
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
        const result = await openSessionTargetInVsCode(sessionId, payload.target);
        sendJson(request, response, result.ok ? 200 : 404, result);
      } catch (error) {
        sendError(request, response, 500, error);
      }
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/session-meta") {
    readBody(request, response, (payload) => {
      const sessionId = sessionIdFromPayload(payload);
      if (!sessionId) {
        sendJson(request, response, 400, {
          ok: false,
          error: "Session id is required."
        });
        return;
      }

      try {
        const annotation = saveSessionAnnotation(sessionId, {
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
        sendError(request, response, 400, error, "Session annotation could not be saved.");
      }
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/export") {
    readBody(request, response, (payload) => {
      const sessionId = sessionIdFromPayload(payload);
      if (!sessionId) {
        sendJson(request, response, 400, {
          ok: false,
          error: "Session id is required."
        });
        return;
      }

      try {
        const result = exportSessionToMarkdown(sessionId);
        sendJson(request, response, result.ok ? 200 : 404, result);
      } catch (error) {
        sendError(request, response, 500, error);
      }
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/memory") {
    readBody(request, response, (payload) => {
      const sessionId = sessionIdFromPayload(payload);
      if (!sessionId) {
        sendJson(request, response, 400, {
          ok: false,
          error: "Session id is required."
        });
        return;
      }

      try {
        const result = saveSessionToMemory(sessionId);
        sendJson(request, response, result.ok ? 200 : 404, result);
      } catch (error) {
        sendError(request, response, 500, error);
      }
    });
    return;
  }

  sendJson(request, response, 404, {
    ok: false,
    error: "Unknown API route"
  });
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
        sendError(request, response, 500, error);
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
