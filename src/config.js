import path from "node:path";
import os from "node:os";

const APP_ROOT = process.env.THREADVAULT_APP_ROOT || process.cwd();

export const APP_NAME = "ThreadVault";
export const APP_PORT = Number(process.env.THREADVAULT_PORT || 3187);
export const DATA_DIR = process.env.THREADVAULT_DATA_DIR || path.join(APP_ROOT, "data");
export const DB_PATH = path.join(DATA_DIR, "threadvault.sqlite");
export const EXPORT_DIR = path.join(DATA_DIR, "exports");
export const MEMORY_DIR = process.env.THREADVAULT_MEMORY_DIR || path.join(DATA_DIR, "memory");
export const PUBLIC_DIR = path.join(APP_ROOT, "public");
export const APPDATA = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
export const VSCODE_GLOBAL_STORAGE = path.join(APPDATA, "Code", "User", "globalStorage");
export const COPILOT_EMPTY_WINDOW_DIR = path.join(VSCODE_GLOBAL_STORAGE, "emptyWindowChatSessions");
export const CODEX_SESSIONS_DIR = path.join(os.homedir(), ".codex", "sessions");
export const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), ".claude", "projects");
export const CLAUDE_HISTORY_FILE = path.join(os.homedir(), ".claude", "history.jsonl");
