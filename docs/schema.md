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
- `fingerprint` deduplicates imported sessions across scans.
- `metadata_json` stores adapter-specific fields and parser hints.

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
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
```

Notes:

- `ordinal` preserves transcript order.
- `role` is normalized to user, assistant, system, tool, or source-specific fallback values.
- Referenced files are stored as JSON for simple rendering and search refresh.

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

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS session_search USING fts5(
  session_id UNINDEXED,
  title,
  summary,
  workspace_name,
  body
);
```

Search body composition:

- Source label
- Message content
- Referenced file names
- Annotation tags
- Annotation note text

## Import And Refresh Behavior

- Scans upsert sessions by `id` and keep local annotations intact.
- Messages for an imported session are replaced during import to reflect the latest parsed source state.
- Search rows are refreshed after import and after annotation updates.
- Imported sessions are retained when source history disappears; ThreadVault does not delete local records automatically.

## Markdown Outputs

Markdown export and memory files are not represented as database rows.

Default locations:

```text
data/exports/
data/memory/YYYY-MM-DD/<source>/<workspace>/<session>.md
```

These files may contain private prompts, code, paths, notes, and transcripts. They are ignored by Git and should be reviewed before sharing.
