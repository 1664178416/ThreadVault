# ThreadVault Technical Design

## 1. Goal

This document translates the product draft into an implementation-ready technical design for the MVP.

The MVP goal is:

- ingest local AI conversation history from 1-2 supported sources
- normalize it into a stable schema
- store it locally in SQLite
- expose search, filtering, archive browsing, and workspace reopen actions inside a VS Code extension

## 2. Architecture Decision

The MVP should use a two-process structure:

1. VS Code extension host
2. Local indexer process embedded as a Node service launched by the extension

Reason:

- keeps parsing and indexing logic isolated from UI logic
- allows background scans without blocking extension UI
- makes later desktop-app reuse easier

## 3. Runtime Components

### 3.1 VS Code Extension

Responsibilities:

- activation
- command registration
- sidebar tree provider
- webview detail panel
- user settings
- trigger scan and refresh
- open workspace / open file / open archive

Key modules:

- `extension.ts`
- `commands/`
- `views/`
- `webview/`
- `services/indexerClient.ts`

### 3.2 Indexer Service

Responsibilities:

- adapter loading
- source detection
- session scanning
- normalization
- deduplication
- database writes
- FTS index updates
- parser diagnostics

Key modules:

- `adapters/`
- `normalize/`
- `db/`
- `search/`
- `scanner/`

### 3.3 Shared Package

Responsibilities:

- shared TypeScript types
- schema constants
- IPC payload types
- source and resume enums

## 4. Communication Model

The MVP should use simple JSON-RPC-like request/response messaging between the extension and the indexer.

### 4.1 Commands Extension Sends

- `scanAll`
- `scanSource`
- `listSessions`
- `getSession`
- `searchSessions`
- `updateSessionMeta`
- `exportSession`
- `resumeSession`
- `openReferencedFile`

### 4.2 Example Payload

```ts
type ScanAllRequest = {
  type: "scanAll";
};

type SearchSessionsRequest = {
  type: "searchSessions";
  query: string;
  filters?: {
    source?: string[];
    workspace?: string[];
    tags?: string[];
    favoritesOnly?: boolean;
  };
};
```

## 5. Repository Layout

```text
ThreadVault/
|-- README.md
|-- docs/
|   |-- technical-design.md
|   |-- schema.md
|   `-- implementation-plan.md
|-- extension/
|   |-- package.json
|   |-- tsconfig.json
|   `-- src/
|       |-- extension.ts
|       |-- commands/
|       |   |-- scanAll.ts
|       |   |-- openSession.ts
|       |   |-- searchSessions.ts
|       |   `-- exportSession.ts
|       |-- views/
|       |   |-- sessionTreeProvider.ts
|       |   `-- sessionNode.ts
|       |-- services/
|       |   |-- indexerClient.ts
|       |   `-- workspaceService.ts
|       `-- webview/
|           |-- sessionPanel.ts
|           `-- assets/
|-- indexer/
|   |-- package.json
|   |-- tsconfig.json
|   `-- src/
|       |-- main.ts
|       |-- scanner/
|       |   `-- scanManager.ts
|       |-- adapters/
|       |   |-- base.ts
|       |   |-- copilot/
|       |   `-- codex/
|       |-- normalize/
|       |   `-- sessionNormalizer.ts
|       |-- db/
|       |   |-- client.ts
|       |   |-- migrations.ts
|       |   `-- repositories/
|       |-- search/
|       |   `-- sessionSearch.ts
|       `-- export/
|           `-- markdownExporter.ts
`-- shared/
    |-- package.json
    `-- src/
        |-- types/
        |-- constants/
        `-- ipc/
```

## 6. MVP Feature-to-Module Mapping

### Feature: Scan Local Sessions

- extension command triggers scan
- indexer loads all adapters
- each adapter discovers source files
- raw sessions are normalized and written to DB

Modules:

- `extension/src/commands/scanAll.ts`
- `indexer/src/scanner/scanManager.ts`
- `indexer/src/adapters/*`

### Feature: Sidebar Session List

- extension queries indexed sessions
- tree view groups by time/source/workspace

Modules:

- `extension/src/views/sessionTreeProvider.ts`

### Feature: Detail View

- extension opens a webview panel
- session messages render in order
- user can click referenced files

Modules:

- `extension/src/webview/sessionPanel.ts`

### Feature: Search

- extension collects search string and filters
- indexer runs FTS query
- results return as lightweight session summaries

Modules:

- `extension/src/commands/searchSessions.ts`
- `indexer/src/search/sessionSearch.ts`

### Feature: Resume/Open

- native reopen when adapter supports it
- otherwise open workspace folder
- fallback to transcript-only view

Modules:

- `indexer/src/adapters/*`
- `extension/src/services/workspaceService.ts`

## 7. Source Adapter Design

## 7.1 Base Adapter Contract

```ts
export interface SourceAdapter {
  id: string;
  label: string;
  detect(context: DetectContext): Promise<DetectResult>;
  discover(context: DiscoverContext): Promise<DiscoveredSessionRef[]>;
  parse(ref: DiscoveredSessionRef): Promise<RawSession>;
  normalize(raw: RawSession): Promise<NormalizedSession>;
  getResumeCapability(session: NormalizedSession): ResumeCapability;
  resume?(session: NormalizedSession): Promise<ResumeResult>;
}
```

## 7.2 Adapter Output Expectations

Each adapter must return:

- stable source session id if available
- title if derivable
- timestamps if derivable
- raw transcript messages
- workspace path if derivable
- references to files if derivable
- any reopen metadata if derivable

## 7.3 Adapter Health

Store:

- parser version
- source path
- parse confidence
- last scan status
- last scan error

This is important because third-party source formats can change without notice.

## 8. Storage Strategy

SQLite is the system of record.

Use:

- normalized relational tables for metadata
- FTS5 virtual tables for text search

No raw binary blobs in DB unless absolutely necessary.

Large attachments should remain as filesystem references.

## 9. Session Lifecycle

### 9.1 Discovery

- adapter finds candidate source entries
- generates a stable fingerprint for dedup

### 9.2 Parse

- adapter reads source file(s)
- converts to source-specific raw shape

### 9.3 Normalize

- raw shape becomes normalized schema
- timestamps standardized to ISO format
- roles standardized
- source metadata preserved

### 9.4 Upsert

- if fingerprint unchanged, skip
- if changed, update session and messages
- refresh FTS rows

## 10. Fingerprinting and Deduplication

The MVP should not depend on third-party session ids alone.

Use a derived fingerprint:

- source id
- source session id if present
- workspace path
- title candidate
- first timestamp
- hash of message count + first/last message snippets

This reduces duplicate imports from repeated scans.

## 11. Resume Strategy

Resume logic must be explicit and capability-based.

### Resume Types

- `native`
- `workspace_only`
- `archive_only`

### Native Resume

Only supported if:

- adapter knows a command or URI for reopen
- required metadata is present

### Workspace Only

Open folder / workspace from saved path.

### Archive Only

Show detail panel and referenced files without reopening third-party UI state.

## 12. Search Implementation

### 12.1 Query Pipeline

1. Parse filter tokens
2. Separate free-text query from metadata filters
3. Run SQL on FTS table
4. Join session metadata
5. Return ranked summaries

### 12.2 Supported Search Filters

- `source:`
- `workspace:`
- `tag:`
- `favorite:true`
- `file:`

### 12.3 Ranking

Initial ranking:

- exact metadata matches first
- FTS rank next
- recency boost last

## 13. UI Design Details

### 13.1 Tree Node Types

- section node
- source node
- workspace node
- session node

### 13.2 Session Card Fields

- title
- source badge
- workspace badge
- updated time
- favorite state
- tag summary

### 13.3 Session Detail Rendering

Messages should render as:

- user
- assistant
- system
- tool

Optional blocks:

- code block
- file reference
- tool call
- note

## 14. Settings

Expose the following settings in the extension:

- enabled sources
- scan on startup
- scan interval
- included workspaces
- excluded workspaces
- redact secrets
- max preview length
- export directory

## 15. Error Handling

### User-Facing Errors

- source not found
- source detected but unreadable
- parse failed
- session cannot be reopened natively
- workspace missing

### Internal Logging

Store logs for:

- scan begin/end
- source detect status
- parse failures
- DB migration issues
- resume failures

## 16. Security Design

### Redaction Rule Hooks

Add optional redaction middleware before DB write:

- API keys
- bearer tokens
- long hashes
- known secret patterns

The MVP can keep this disabled by default but the hook should exist in the pipeline.

## 17. Testing Strategy

### Unit Tests

- search parser
- normalizer
- dedup logic
- adapter parsing helpers

### Integration Tests

- sample raw session -> normalized session
- normalized session -> DB upsert
- DB -> search results

### Manual Tests

- extension loads
- scan command works
- tree refresh works
- detail view opens
- export works

## 18. Definition of Done for MVP

The MVP is ready when:

- at least one source is ingested automatically
- sessions appear in sidebar grouped correctly
- search returns expected sessions
- detail panel shows transcript cleanly
- workspace open action works
- export to Markdown works
- no cloud dependency is required

