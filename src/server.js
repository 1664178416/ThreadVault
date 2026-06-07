import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { URL } from "node:url";

import { APP_NAME, APP_PORT, DATA_DIR, PUBLIC_DIR } from "./config.js";
import { ensureDir } from "./utils/fs.js";
import { runFullScan, getDashboardData, getSessionById, saveSessionAnnotation } from "./services/indexer.js";
import { openInVsCode } from "./services/actions.js";
import { exportSessionToMarkdown, saveSessionToMemory } from "./services/exporter.js";

ensureDir(DATA_DIR);

const MAX_BODY_BYTES = 1024 * 1024;

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  response.end(JSON.stringify(payload));
}

function sendFile(response, filePath, contentType) {
  const stream = fs.createReadStream(filePath);
  stream.on("error", (error) => {
    if (!response.headersSent) {
      sendJson(response, 500, {
        ok: false,
        error: String(error.message || error)
      });
    } else {
      response.destroy(error);
    }
  });

  response.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "no-store"
  });
  stream.pipe(response);
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

function serveStatic(response, pathname) {
  const filePath = resolveStaticPath(pathname);
  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    sendJson(response, 404, { error: "Not found" });
    return;
  }
  sendFile(response, filePath, getContentType(filePath));
}

function readBody(request, response, callback) {
  let body = "";
  let receivedBytes = 0;
  let rejected = false;

  request.on("data", (chunk) => {
    receivedBytes += chunk.length;
    if (receivedBytes > MAX_BODY_BYTES) {
      rejected = true;
      sendJson(response, 413, {
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
      sendJson(response, 400, {
        ok: false,
        error: String(error.message || error)
      });
    }
  });
  request.on("end", () => {
    if (rejected) {
      return;
    }

    try {
      callback(JSON.parse(body || "{}"));
    } catch (error) {
      sendJson(response, 400, {
        ok: false,
        error: String(error.message || error)
      });
    }
  });
}

function handleApi(request, response, url) {
  if (request.method === "OPTIONS") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, { ok: true, app: APP_NAME });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/scan") {
    const result = runFullScan();
    sendJson(response, 200, result);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/sessions") {
    const query = url.searchParams.get("q") || "";
    const sourceId = url.searchParams.get("sourceId") || "";
    const favoritesOnly = url.searchParams.get("favoritesOnly") === "1";
    const includeArchived = url.searchParams.get("includeArchived") === "1";
    sendJson(response, 200, getDashboardData(query, { sourceId, favoritesOnly, includeArchived }));
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/sessions/")) {
    const sessionId = decodeURIComponent(url.pathname.replace("/api/sessions/", ""));
    const session = getSessionById(sessionId);
    if (!session) {
      sendJson(response, 404, { error: "Session not found" });
      return;
    }
    sendJson(response, 200, session);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/open") {
    readBody(request, response, (payload) => {
      sendJson(response, 200, openInVsCode(payload.path));
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/session-meta") {
    readBody(request, response, (payload) => {
      try {
        const annotation = saveSessionAnnotation(payload.sessionId, {
          favorite: payload.favorite,
          archived: payload.archived,
          tags: payload.tags,
          noteText: payload.noteText
        });
        if (!annotation) {
          sendJson(response, 404, {
            ok: false,
            error: "Session not found."
          });
          return;
        }

        sendJson(response, 200, {
          ok: true,
          annotation
        });
      } catch (error) {
        const isProtectedFavorite = error?.code === "PROTECTED_FAVORITE";
        sendJson(response, isProtectedFavorite ? 409 : 400, {
          ok: false,
          error: String(error.message || error)
        });
      }
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/export") {
    readBody(request, response, (payload) => {
      try {
        const result = exportSessionToMarkdown(payload.sessionId);
        sendJson(response, result.ok ? 200 : 404, result);
      } catch (error) {
        sendJson(response, 500, {
          ok: false,
          error: String(error.message || error)
        });
      }
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/memory") {
    readBody(request, response, (payload) => {
      try {
        const result = saveSessionToMemory(payload.sessionId);
        sendJson(response, result.ok ? 200 : 404, result);
      } catch (error) {
        sendJson(response, 500, {
          ok: false,
          error: String(error.message || error)
        });
      }
    });
    return;
  }

  sendJson(response, 404, { error: "Unknown API route" });
}

function createServer() {
  return http.createServer((request, response) => {
    try {
      const url = new URL(request.url || "/", `http://${request.headers.host || `localhost:${APP_PORT}`}`);
      if (url.pathname.startsWith("/api/")) {
        handleApi(request, response, url);
        return;
      }

      serveStatic(response, url.pathname);
    } catch (error) {
      if (!response.headersSent) {
        sendJson(response, 500, {
          ok: false,
          error: String(error.message || error)
        });
      } else {
        response.destroy(error);
      }
    }
  });
}

function main() {
  const scanOnly = process.argv.includes("--scan-only");
  const initialScan = runFullScan();

  if (scanOnly) {
    console.log(JSON.stringify(initialScan, null, 2));
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

  server.listen(APP_PORT, () => {
    console.log(`${APP_NAME} is running at http://localhost:${APP_PORT}`);
    console.log(`Indexed ${initialScan.importedSessions} new sessions, updated ${initialScan.updatedSessions}, skipped ${initialScan.skippedSessions}.`);
  });
}

main();
