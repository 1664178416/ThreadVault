# ThreadVault Technical Design

This document describes the current implementation. It is not a future TypeScript monorepo plan.

## Product Shape

ThreadVault is a local-first archive for AI coding conversations. It runs as a lightweight Node.js service with a static browser UI, plus an optional VS Code extension that starts the service and embeds the same dashboard.

Primary goals:

- Import local Copilot Chat, Codex, and Claude Code history
- Normalize sessions and messages into SQLite
- Provide fast lexical search, source filters, tags, notes, favorites, and hidden state
- Export sessions to Markdown and save selected sessions as durable memory notes
- Keep all data local by default

## Runtime Architecture

```text
VS Code extension commands  ->  local Node service  ->  SQLite + Markdown files
Browser dashboard           ->  local HTTP API      ->  source history adapters
VS Code webview             ->  iframe dashboard    ->  host bridge for opening files
```

The service is implemented in `src/server.js` and uses only Node built-ins, including `node:sqlite`. This is why Node.js 24+ is required.

The browser UI lives in `public/`. The VS Code extension packages a generated copy of `src/` and `public/` into `extension/app/` with `npm run prepare:extension`. The generated `.threadvault-bundle.json` records a SHA-256 fingerprint of the bundled source files so the installed extension can refresh its copied runtime app even when a local test VSIX keeps the same version number.

## Main Modules

- `src/adapters/`: source readers for Copilot, Codex, and Claude Code
- `src/db/database.js`: SQLite schema creation
- `src/db/repository.js`: session, message, annotation, search, and stats queries
- `src/services/indexer.js`: scan orchestration and dashboard data access
- `src/services/exporter.js`: Markdown export and memory note writing
- `src/services/actions.js`: source/workspace open actions
- `src/server.js`: local HTTP API and static file server
- `public/app.js`: dashboard state, rendering, search, filters, annotations, export, memory, and VS Code host bridge
- `extension/extension.js`: VS Code commands, runtime app preparation, server lifecycle, webview host bridge, and log channel

## Data Flow

1. `runFullScan()` loads the local source-file signature cache and calls every source adapter.
2. Adapters stat candidate files once. Files whose path, size, modification/change time, and runtime fingerprint still match bypass transcript reads and parsing.
3. New, changed, or parser-invalidated files are normalized into sessions with source-level diagnostics.
4. `upsertImportedSessions()` writes sessions, messages, and successful source signatures in one batch transaction, using a per-session savepoint so one malformed session can roll back without blocking the rest.
5. The FTS table is refreshed from message content, referenced files, tags, and notes.
6. The UI queries `/api/sessions` and `/api/sessions/:id`.
7. User annotations are saved through `/api/session-meta`.
8. Markdown export and memory save call `/api/export` and `/api/memory`.

The source cache stores file metadata and the linked session id, not a second transcript copy. A runtime fingerprint change invalidates cached files so parser changes receive one full rescan before incremental scanning resumes. Normalized session fingerprints include source location, state, adapter metadata, and message metadata, preventing a changed file with unchanged visible text from freezing stale session fields into the cache.

## Local Data

Default paths:

```text
data/threadvault.sqlite
data/exports/
data/memory/YYYY-MM-DD/<source>/<workspace>/<session>.md
```

The VS Code extension uses its global storage directory by default when installed from VSIX or Marketplace. `threadvault.dataDirectory` and `threadvault.memoryDirectory` can override this.

## Security Model

- The service binds to `127.0.0.1` by default.
- Write requests are allowed only from loopback origins and the explicitly configured host.
- Static file serving rejects path traversal.
- Request bodies are limited to 1 MB.
- Browser responses include security headers and a restrictive CSP.
- Server, browser, and extension error paths redact local paths, UNC/network share paths, email addresses, and common token/secret patterns before display.
- The browser API client accepts JSON object responses only; unexpected text or HTML is converted into a sanitized protocol error.
- Open actions validate saved target shape before launching VS Code: source targets must be files, and workspace targets must be folders or `.code-workspace` files.
- Export and memory filenames are sanitized, compacted, kept inside their configured directories, and bounded when searching for a unique Markdown path.
- Generated data, SQLite files, exports, memory notes, logs, and VSIX files are ignored by Git.

## VS Code Extension

The extension contributes:

- Activity bar view: `ThreadVault`
- Commands: start server, open embedded panel, open browser dashboard, open logs, rescan local history
- Settings: port, bind host, client host, Node path, data directory, memory directory

The embedded panel is an iframe pointed at the local dashboard. A tokenized host bridge allows only trusted messages between the webview and the dashboard for browser-open and path-open actions.

When installed from VSIX or Marketplace, the extension copies the bundled app into VS Code global storage before launching it. The copy is refreshed when either the extension version or the bundle fingerprint changes. The running server signature also includes the runtime fingerprint, and the health endpoint returns it too, so same-version VSIX installs and development source changes restart the local service instead of leaving an older Node process attached to the new UI.

## Verification

`npm run verify` checks:

- JavaScript syntax
- Extension bundle sync
- VSIX package contents and ignored private artifacts
- Command/activation consistency
- Marketplace readiness warnings
- Favorite/hidden state regression
- Markdown export and memory save regression
- Search fallback and query limit behavior
- Incremental source cache hits, file/parser invalidation, upgrade backfill, and rollback behavior
- CORS/write-origin behavior
- Real HTTP behavior for root page, security headers, path traversal, health diagnostics, cross-origin writes, and oversized request bodies
- Error redaction, open-target shape checks, bounded Markdown filenames, and frontend response parsing guardrails

Before packaging or publishing:

```bash
npm run prepare:extension
npm run verify
npm run package:vsix
```

Strict Marketplace publishing additionally requires replacing `publisher: "local"` in `extension/package.json` with the real Publisher ID.
