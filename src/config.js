import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import os from "node:os";

const APP_ROOT = process.env.THREADVAULT_APP_ROOT || process.cwd();
const DEFAULT_PORT = 3187;
const DEFAULT_HOST = "127.0.0.1";

function parsePort(value, fallback = DEFAULT_PORT) {
  const port = Number(value || fallback);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : fallback;
}

function normalizeHostSetting(value, fallback = DEFAULT_HOST) {
  const text = String(value || "").trim();
  if (!text) {
    return fallback;
  }

  const bracketless = text.replace(/^\[(.*)\]$/, "$1");
  const maybeBareIpv6 = bracketless.split(":").length > 2;
  if (!text.includes("://") && maybeBareIpv6 && /^[0-9a-f:.]+$/i.test(bracketless)) {
    return bracketless;
  }

  try {
    const parsed = new URL(text.includes("://") ? text : `http://${text}`);
    if (parsed.hostname) {
      return parsed.hostname.replace(/^\[(.*)\]$/, "$1");
    }
  } catch {
    return fallback;
  }

  return fallback;
}

function expandConfigPath(value, fallbackPath) {
  const text = String(value || "").trim();
  if (!text) {
    return path.resolve(fallbackPath);
  }

  if (text === "~") {
    return os.homedir();
  }

  if (text.startsWith("~/") || text.startsWith(`~${path.sep}`)) {
    return path.join(os.homedir(), text.slice(2));
  }

  return path.resolve(APP_ROOT, text);
}

function listFilesRecursive(rootPath) {
  const files = [];
  for (const entry of fs.readdirSync(rootPath, { withFileTypes: true })) {
    const entryPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function computeFingerprint(rootPath, entryNames) {
  try {
    const hash = crypto.createHash("sha256");
    const files = [];
    for (const entryName of entryNames) {
      const entryRoot = path.join(rootPath, entryName);
      const entryStat = fs.statSync(entryRoot);
      files.push(...(entryStat.isDirectory() ? listFilesRecursive(entryRoot) : [entryRoot]));
    }

    for (const filePath of files.sort((left, right) => left.localeCompare(right))) {
      const relativePath = path.relative(rootPath, filePath).replaceAll(path.sep, "/");
      hash.update(relativePath);
      hash.update("\0");
      hash.update(fs.readFileSync(filePath));
      hash.update("\0");
    }
    return hash.digest("hex");
  } catch {
    return "";
  }
}

function computeAppFingerprint(rootPath) {
  return computeFingerprint(rootPath, ["src", "public"]);
}

function computeParserFingerprint(rootPath) {
  return computeFingerprint(rootPath, ["src/adapters", "src/utils", "src/config.js"]);
}

export const APP_NAME = "ThreadVault";
export const APP_PORT = parsePort(process.env.THREADVAULT_PORT);
export const APP_HOST = normalizeHostSetting(process.env.THREADVAULT_HOST);
export const RUNTIME_FINGERPRINT = String(process.env.THREADVAULT_RUNTIME_FINGERPRINT || "").trim() || computeAppFingerprint(APP_ROOT);
export const PARSER_FINGERPRINT = String(process.env.THREADVAULT_PARSER_FINGERPRINT || "").trim() || computeParserFingerprint(APP_ROOT);
export const DATA_DIR = expandConfigPath(process.env.THREADVAULT_DATA_DIR, path.join(APP_ROOT, "data"));
export const DB_PATH = path.join(DATA_DIR, "threadvault.sqlite");
export const EXPORT_DIR = path.join(DATA_DIR, "exports");
export const MEMORY_DIR = expandConfigPath(process.env.THREADVAULT_MEMORY_DIR, path.join(DATA_DIR, "memory"));
export const PUBLIC_DIR = path.join(APP_ROOT, "public");
export const APPDATA = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
export const VSCODE_GLOBAL_STORAGE = path.join(APPDATA, "Code", "User", "globalStorage");
export const COPILOT_EMPTY_WINDOW_DIR = path.join(VSCODE_GLOBAL_STORAGE, "emptyWindowChatSessions");
export const CODEX_SESSIONS_DIR = path.join(os.homedir(), ".codex", "sessions");
export const CODEX_ARCHIVED_SESSIONS_DIR = path.join(os.homedir(), ".codex", "archived_sessions");
export const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), ".claude", "projects");
export const CLAUDE_HISTORY_FILE = path.join(os.homedir(), ".claude", "history.jsonl");
