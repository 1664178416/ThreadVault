import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { URL } from "node:url";

import { APP_NAME, APP_PORT, DATA_DIR, PUBLIC_DIR } from "./config.js";
import { ensureDir } from "./utils/fs.js";
import { runFullScan, getDashboardData, getSessionById, saveSessionAnnotation } from "./services/indexer.js";
import { openInVsCode } from "./services/actions.js";
import { exportSessionToMarkdown } from "./services/exporter.js";

ensureDir(DATA_DIR);

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
  response.writeHead(200, {
    "Content-Type": contentType
  });
  fs.createReadStream(filePath).pipe(response);
}

function getContentType(filePath) {
  if (filePath.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }
  if (filePath.endsWith(".js")) {
    return "application/javascript; charset=utf-8";
  }
  return "text/html; charset=utf-8";
}

function serveStatic(response, pathname) {
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = path.join(PUBLIC_DIR, relativePath);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    sendJson(response, 404, { error: "Not found" });
    return;
  }
  sendFile(response, filePath, getContentType(filePath));
}

function readBody(request, response, callback) {
  let body = "";
  request.on("data", (chunk) => {
    body += chunk.toString();
  });
  request.on("end", () => {
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
    const favoritesOnly = url.searchParams.get("favoritesOnly") === "1";
    const includeArchived = url.searchParams.get("includeArchived") === "1";
    sendJson(response, 200, getDashboardData(query, { favoritesOnly, includeArchived }));
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
      const annotation = saveSessionAnnotation(payload.sessionId, {
        favorite: payload.favorite,
        archived: payload.archived,
        tags: payload.tags,
        noteText: payload.noteText
      });
      sendJson(response, 200, {
        ok: true,
        annotation
      });
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/export") {
    readBody(request, response, (payload) => {
      sendJson(response, 200, exportSessionToMarkdown(payload.sessionId));
    });
    return;
  }

  sendJson(response, 404, { error: "Unknown API route" });
}

function createServer() {
  return http.createServer((request, response) => {
    const url = new URL(request.url || "/", `http://${request.headers.host || `localhost:${APP_PORT}`}`);
    if (url.pathname.startsWith("/api/")) {
      handleApi(request, response, url);
      return;
    }

    serveStatic(response, url.pathname);
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
  server.listen(APP_PORT, () => {
    console.log(`${APP_NAME} is running at http://localhost:${APP_PORT}`);
    console.log(`Indexed ${initialScan.importedSessions} Copilot sessions.`);
  });
}

main();
