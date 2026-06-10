# ThreadVault Implementation Plan

ThreadVault has passed the initial MVP stage. The current plan is focused on public release readiness, reliability, and carefully scoped product improvements.

## Current Baseline

Implemented today:

- Local Node.js service and static dashboard
- SQLite persistence with FTS5 search
- Copilot Chat, Codex, and Claude Code adapters
- Tags, notes, regular/favorite/hidden session state
- Markdown export and Markdown memory save
- VS Code extension with local server lifecycle, embedded panel, browser open, logs, and rescan
- Verification gate covering syntax, package contents, bundle sync, security checks, state/export/memory regressions, and real HTTP behavior

## Release Readiness

Before the first public Marketplace release:

1. Replace `publisher: "local"` in `extension/package.json` with the real VS Code Marketplace Publisher ID.
2. Confirm public GitHub URLs in `repository`, `homepage`, and `bugs`.
3. Run `npm run prepare:extension`.
4. Run `npm run verify`.
5. Run `npm run package:vsix`.
6. Install the generated VSIX and manually check the five extension commands.
7. Confirm export and memory files are written to expected local folders.
8. Confirm `git status --short` contains no local data, logs, SQLite files, exports, memory notes, or VSIX files.
9. Run `npm run publish:vsce` only after the Publisher ID is configured.

## Near-Term Improvements

These should stay small and low-risk:

- Add Marketplace and README screenshots after the UI stabilizes
- Add an import diagnostics view for source-level parse errors
- Add a clear empty state for users with no supported local history
- Add optional custom source directory settings for advanced users
- Add more HTTP-level checks when adding new API routes
- Add fixtures for representative Copilot, Codex, and Claude history formats

## Medium-Term Product Work

These can happen after the first public release:

- Optional scheduled or file-watcher based rescans
- Semantic search over saved memory notes, kept fully local where practical
- More source adapters when local history formats are readable and stable enough
- Native VS Code tree/detail views if users prefer IDE-native navigation over the embedded dashboard
- Better Markdown templates for memory notes and exports
- Import quality scoring surfaced in the UI, not only stored in metadata

## Engineering Guardrails

- Keep the local-first privacy model as the default.
- Do not add network dependencies to the core scanning path.
- Keep generated local data ignored by Git.
- Keep `npm run verify` fast enough to run before every package or publish step.
- Prefer focused regression checks for every bug fix that touches server security, extension lifecycle, export/memory output, or annotation state.
