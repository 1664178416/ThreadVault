import { DatabaseSync } from "node:sqlite";
import path from "node:path";

import { DB_PATH } from "../config.js";
import { ensureDir } from "../utils/fs.js";

let database;

function createSchema(db) {
  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      source_label TEXT NOT NULL,
      source_session_id TEXT,
      title TEXT NOT NULL,
      summary TEXT,
      workspace_path TEXT,
      workspace_name TEXT,
      created_at TEXT,
      updated_at TEXT,
      status TEXT,
      resume_type TEXT NOT NULL,
      fingerprint TEXT NOT NULL,
      source_path TEXT,
      parse_confidence REAL,
      metadata_json TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_fingerprint ON sessions(fingerprint);
    CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at);

    CREATE TABLE IF NOT EXISTS source_scan_cache (
      source_path TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      modified_at_ms REAL NOT NULL,
      changed_at_ms REAL NOT NULL,
      parser_version TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_source_scan_cache_session_id ON source_scan_cache(session_id);

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      ordinal INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT,
      model TEXT,
      referenced_files_json TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);

    CREATE TABLE IF NOT EXISTS session_annotations (
      session_id TEXT PRIMARY KEY,
      favorite INTEGER NOT NULL DEFAULT 0,
      archived INTEGER NOT NULL DEFAULT 0,
      tags_json TEXT NOT NULL DEFAULT '[]',
      note_text TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_session_annotations_favorite ON session_annotations(favorite);
    CREATE INDEX IF NOT EXISTS idx_session_annotations_archived ON session_annotations(archived);

    CREATE VIRTUAL TABLE IF NOT EXISTS session_search USING fts5(
      session_id UNINDEXED,
      title,
      summary,
      workspace_name,
      body
    );

    UPDATE session_annotations
    SET favorite = 0
    WHERE favorite = 1 AND archived = 1;
  `);
}

export function getDatabase() {
  if (!database) {
    ensureDir(path.dirname(DB_PATH));
    database = new DatabaseSync(DB_PATH);
    createSchema(database);
  }
  return database;
}
