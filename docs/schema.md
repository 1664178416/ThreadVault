# ThreadVault Data Schema

## 1. Database Choice

- Engine: SQLite
- Full-text search: FTS5
- Migration strategy: SQL files or code-defined migrations

## 2. Tables

### 2.1 `sources`

```sql
CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  adapter_version TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  last_detected_at TEXT,
  last_scan_at TEXT,
  last_scan_status TEXT,
  last_scan_error TEXT
);
```

### 2.2 `sessions`

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  source_session_id TEXT,
  fingerprint TEXT NOT NULL,
  workspace_path TEXT,
  workspace_name TEXT,
  title TEXT NOT NULL,
  summary TEXT,
  created_at TEXT,
  updated_at TEXT,
  first_message_at TEXT,
  last_message_at TEXT,
  status TEXT,
  resume_type TEXT NOT NULL,
  resume_payload_json TEXT,
  source_path TEXT,
  parse_confidence REAL,
  favorite INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT,
  FOREIGN KEY (source_id) REFERENCES sources(id)
);

CREATE UNIQUE INDEX idx_sessions_fingerprint ON sessions(fingerprint);
CREATE INDEX idx_sessions_source_id ON sessions(source_id);
CREATE INDEX idx_sessions_workspace_path ON sessions(workspace_path);
CREATE INDEX idx_sessions_updated_at ON sessions(updated_at);
```

### 2.3 `messages`

```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TEXT,
  model TEXT,
  tool_calls_json TEXT,
  attachments_json TEXT,
  referenced_files_json TEXT,
  metadata_json TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_ordinal ON messages(session_id, ordinal);
```

### 2.4 `tags`

```sql
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT
);
```

### 2.5 `session_tags`

```sql
CREATE TABLE session_tags (
  session_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (session_id, tag_id),
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (tag_id) REFERENCES tags(id)
);
```

### 2.6 `notes`

```sql
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

### 2.7 `artifacts`

```sql
CREATE TABLE artifacts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL,
  path TEXT,
  metadata_json TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

### 2.8 `scan_events`

```sql
CREATE TABLE scan_events (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL,
  scanned_count INTEGER NOT NULL DEFAULT 0,
  imported_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_text TEXT,
  FOREIGN KEY (source_id) REFERENCES sources(id)
);
```

## 3. Full Text Search

### 3.1 `session_search`

```sql
CREATE VIRTUAL TABLE session_search USING fts5(
  session_id UNINDEXED,
  title,
  summary,
  workspace_name,
  tags,
  body
);
```

### 3.2 Indexed Body Composition

The `body` field should be built from:

- all message content concatenated
- referenced file names
- source label

## 4. Normalized Type Shapes

### 4.1 `NormalizedSession`

```ts
type ResumeType = "native" | "workspace_only" | "archive_only";

interface NormalizedSession {
  id: string;
  sourceId: string;
  sourceSessionId?: string;
  fingerprint: string;
  workspacePath?: string;
  workspaceName?: string;
  title: string;
  summary?: string;
  createdAt?: string;
  updatedAt?: string;
  firstMessageAt?: string;
  lastMessageAt?: string;
  status?: string;
  resumeType: ResumeType;
  resumePayload?: Record<string, unknown>;
  sourcePath?: string;
  parseConfidence?: number;
  favorite?: boolean;
  archived?: boolean;
  metadata?: Record<string, unknown>;
  messages: NormalizedMessage[];
  artifacts?: NormalizedArtifact[];
}
```

### 4.2 `NormalizedMessage`

```ts
interface NormalizedMessage {
  id: string;
  ordinal: number;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp?: string;
  model?: string;
  toolCalls?: unknown[];
  attachments?: unknown[];
  referencedFiles?: string[];
  metadata?: Record<string, unknown>;
}
```

### 4.3 `NormalizedArtifact`

```ts
interface NormalizedArtifact {
  id: string;
  type: "file" | "image" | "export" | "link" | "command";
  path?: string;
  metadata?: Record<string, unknown>;
}
```

## 5. Fingerprint Algorithm

Recommended fingerprint input:

- source id
- source session id if present
- workspace path
- title
- first message timestamp
- first message snippet
- last message snippet
- message count

Then hash to SHA-256 hex.

## 6. Data Retention Rules

- Keep imported sessions indefinitely unless deleted
- Do not remove sessions automatically when source history disappears
- Mark sessions as orphaned only if needed in later versions

