# ThreadVault MVP Status

This checklist reflects the current repository state and the remaining work before a public Marketplace release.

## Completed

- Local Node.js service with browser dashboard
- SQLite persistence using `node:sqlite`
- Copilot Chat, Codex, and Claude Code source adapters
- Incremental session/message upserts with search refresh
- Lexical full-text search with source and state filters
- Session detail view with transcript, collapsed process/system traces, tags, notes, and source/workspace actions
- Mutually exclusive session state: `Regular`, `Favorite`, `Hidden`; `Hidden` wins conflicting Favorite/Hidden updates
- Markdown export to `data/exports/`
- Markdown memory notes to `data/memory/` or a configured memory directory
- Local-only session links with `Copy local link`
- VS Code extension commands for server start, embedded panel, browser dashboard, logs, and rescan
- Configurable port, host, client host, Node path, data directory, and memory directory
- Extension bundle preparation for VSIX packaging
- Local service hardening: loopback default host, write-origin checks, body limit, path traversal protection, security headers, and request timeouts
- Verification script covering syntax, package contents, bundle sync, private artifact ignores, command registration, state/export/memory regression, CORS behavior, and real HTTP behavior

## Public Release Checklist

Before publishing to the VS Code Marketplace:

- Replace `publisher: "local"` in `extension/package.json` with the real Marketplace Publisher ID
- Confirm `repository`, `homepage`, and `bugs` point to the final public GitHub URLs
- Choose the public `version` and update both root and extension changelogs if needed
- Run `npm run prepare:extension`
- Run `npm run verify`
- Run `npm run package:vsix` and install the generated VSIX locally
- Confirm the embedded panel starts, rescans, opens logs, exports Markdown, saves memory notes, and copies a local session link
- Confirm `git status --short` does not include `data/`, `.vsix`, SQLite, exports, memory notes, or logs
- Run `npm run publish:vsce` only after the Publisher ID is set

## Next Product Improvements

These are useful follow-ups after the initial public release:

- Optional semantic search over selected memory notes
- Import diagnostics panel for source-specific parser failures
- Screenshot assets for the Marketplace listing and GitHub README
- Better empty states when a user has no supported local history yet
- Optional file watcher or scheduled rescan
- More source adapters if other tools expose readable local history
- Native VS Code tree/detail views if users want a more IDE-native experience than the embedded dashboard
