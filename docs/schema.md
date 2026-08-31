# ThreadVault Data Schema

This document mirrors the current schema created in `src/db/database.js`.

## Database

- Engine: SQLite through Node.js `node:sqlite`
- Journal mode: WAL
- Search: SQLite FTS5 virtual table
- Default file: `data/threadvault.sqlite`

## Tables

### `sessions`

```sql
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
```

Indexes:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_fingerprint ON sessions(fingerprint);
CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at);
```

Notes:

- `source_id` is currently one of `copilot`, `codex`, or `claude`.
- `source_label` is stored directly on each session so the UI does not need a separate source lookup table.
- `fingerprint` hashes the complete normalized session, including source path/status, adapter metadata, and message ids/content/metadata, so non-message source changes still refresh stored fields.
- `metadata_json` stores adapter-specific fields and parser hints.
- Session-list queries sort by update time and then `id`, providing deterministic `LIMIT/OFFSET` pages even when multiple sessions share a timestamp.

### `source_scan_cache`

```sql
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
```

Index:

```sql
CREATE INDEX IF NOT EXISTS idx_source_scan_cache_session_id ON source_scan_cache(session_id);
```

Notes:

- A matching source path, size, modification/change time, and parser version allows an adapter to skip transcript reads and normalization.
- `parser_version` uses a fingerprint of adapters, parser utilities, and source configuration. Parser changes invalidate previous cache entries, while UI-only and server-only changes do not trigger full transcript reparsing.
- Cache rows are written only after the linked session import succeeds. Existing databases populate this table incrementally without rewriting unchanged messages.
- Stale rows are harmless: adapters consult only paths that still exist, and imported sessions remain archived when source files disappear.

### `messages`

```sql
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
```

Index:

```sql
CREATE INDEX IF NOT EXISTS idx_messages_session_ordinal ON messages(session_id, ordinal);
```

Notes:

- `ordinal` preserves transcript order.
- The composite index serves full and paged session lookups in transcript order without a temporary sort.
- `role` is normalized to user, assistant, system, tool, or source-specific fallback values.
- Referenced files are stored as JSON for simple rendering and search refresh.

The browser reads messages in 200-row pages through the session-detail API. Page totals use the same `session_id` prefix of the composite index. Calls without page parameters still return the complete transcript for exports and other internal operations.

### `session_annotations`

```sql
CREATE TABLE IF NOT EXISTS session_annotations (
  session_id TEXT PRIMARY KEY,
  favorite INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  tags_json TEXT NOT NULL DEFAULT '[]',
  note_text TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);
```

Indexes:

```sql
CREATE INDEX IF NOT EXISTS idx_session_annotations_favorite ON session_annotations(favorite);
CREATE INDEX IF NOT EXISTS idx_session_annotations_archived ON session_annotations(archived);
```

Rules:

- `favorite` and `archived` are mutually exclusive.
- If a legacy row has both set, schema initialization clears `favorite`.
- Tags are normalized, deduplicated, and capped in application code.
- Notes and tags are included in the search document.

### `session_search`

Stable row mapping:

```sql
CREATE TABLE IF NOT EXISTS session_search_rows (
  search_rowid INTEGER PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
```

```sql
CREATE VIRTUAL TABLE session_search USING fts5(
  mapping_version UNINDEXED,
  title,
  summary,
  workspace_name,
  body,
  content='',
  contentless_delete=1
);
```

`session_search.rowid` matches `session_search_rows.search_rowid`, an explicit `INTEGER PRIMARY KEY` that remains stable across `VACUUM`. The contentless table retains the FTS index but does not store a second copy of titles, notes, or complete message bodies. Existing legacy search tables are rebuilt transactionally from `sessions`, `messages`, and `session_annotations` on first startup; released pages remain available for SQLite to reuse.

Search body composition:

- Source label
- Message content
- Referenced file names
- Annotation tags
- Annotation note text

## Import And Refresh Behavior

- Scans upsert sessions by `id` and keep local annotations intact.
- Unchanged source files can be skipped before parsing when their persisted source signature matches.
- Changed sessions share one batch transaction; per-session savepoints preserve failure isolation without paying for one disk commit per session.
- Message replacements use bounded multi-row inserts to reduce JavaScript-to-SQLite calls during first-time or large rebuilds.
- Messages for an imported session are replaced during import to reflect the latest parsed source state.
- Search rows use contentless `INSERT OR REPLACE` refreshes after import and annotation updates.
- FTS result previews fetch only the first matching message instead of running `snippet()` across each complete transcript; punctuation-only fallback search aggregates message matches in one pass.
- Imported sessions are retained when source history disappears; ThreadVault does not delete local records automatically.

## Markdown Outputs

Markdown export and memory files are not represented as database rows.

Default locations:

```text
data/exports/
data/memory/YYYY-MM-DD/<source>/<workspace>/<session>.md
```

These files may contain private prompts, code, paths, notes, and transcripts. They are ignored by Git and should be reviewed before sharing.
