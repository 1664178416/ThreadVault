import { DatabaseSync } from "node:sqlite";
import path from "node:path";

import { DB_PATH } from "../config.js";
import { ensureDir } from "../utils/fs.js";

let database;

const SESSION_SEARCH_SCHEMA = `
  CREATE VIRTUAL TABLE session_search USING fts5(
    mapping_version UNINDEXED,
    title,
    summary,
    workspace_name,
    body,
    content='',
    contentless_delete=1
  )
`;

function isCurrentSessionSearchSchema(sql) {
  const schema = String(sql || "");
  return /\bmapping_version\s+UNINDEXED/i.test(schema) &&
    /\bcontent\s*=\s*''/i.test(schema) &&
    /\bcontentless_delete\s*=\s*1/i.test(schema);
}

function rebuildSessionSearch(db) {
  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec(`
      DROP TABLE session_search;
      ${SESSION_SEARCH_SCHEMA};

      WITH message_documents AS MATERIALIZED (
        SELECT
          session_id,
          GROUP_CONCAT(content, char(10) || char(10)) AS content,
          GROUP_CONCAT(
            CASE WHEN referenced_files_json <> '[]' THEN referenced_files_json END,
            ' '
          ) AS referencedFiles
        FROM messages
        GROUP BY session_id
      )
      INSERT INTO session_search (
        rowid, title, summary, workspace_name, body
      )
      SELECT
        search_rows.search_rowid,
        sessions.title,
        COALESCE(sessions.summary, '') || char(10) || char(10) || COALESCE(a.note_text, ''),
        COALESCE(sessions.workspace_name, '') || ' ' || COALESCE(a.tags_json, '[]'),
        COALESCE(sessions.source_label, '') || char(10) || char(10) ||
          COALESCE(message_documents.content, '') || char(10) || char(10) ||
          COALESCE(message_documents.referencedFiles, '') || char(10) || char(10) ||
          COALESCE(a.tags_json, '[]') || char(10) || char(10) || COALESCE(a.note_text, '')
      FROM sessions
      JOIN session_search_rows search_rows ON search_rows.session_id = sessions.id
      LEFT JOIN session_annotations a ON a.session_id = sessions.id
      LEFT JOIN message_documents ON message_documents.session_id = sessions.id;
    `);
    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // Preserve the migration failure; the connection may already have rolled back.
    }
    throw error;
  }
}

function ensureSessionSearchSchema(db) {
  const current = db.prepare(`
    SELECT sql
    FROM sqlite_master
    WHERE type = 'table' AND name = 'session_search'
  `).get();

  if (!current) {
    db.exec(SESSION_SEARCH_SCHEMA);
    return;
  }

  if (!isCurrentSessionSearchSchema(current.sql)) {
    rebuildSessionSearch(db);
  }
}

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

    CREATE TABLE IF NOT EXISTS session_search_rows (
      search_rowid INTEGER PRIMARY KEY,
      session_id TEXT NOT NULL UNIQUE,
      FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    INSERT OR IGNORE INTO session_search_rows (session_id)
    SELECT id FROM sessions;

    CREATE TRIGGER IF NOT EXISTS trg_sessions_search_row
    AFTER INSERT ON sessions
    BEGIN
      INSERT OR IGNORE INTO session_search_rows (session_id) VALUES (NEW.id);
    END;

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

    CREATE INDEX IF NOT EXISTS idx_messages_session_ordinal ON messages(session_id, ordinal);
    DROP INDEX IF EXISTS idx_messages_session_id;

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

    UPDATE session_annotations
    SET favorite = 0
    WHERE favorite = 1 AND archived = 1;
  `);

  ensureSessionSearchSchema(db);
}

export function getDatabase() {
  if (!database) {
    ensureDir(path.dirname(DB_PATH));
    database = new DatabaseSync(DB_PATH);
    createSchema(database);
  }
  return database;
}
