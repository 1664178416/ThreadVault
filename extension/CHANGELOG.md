# Changelog

## 0.1.0 - 2026-05-30

- Added local server launch commands
- Added embedded dashboard and browser dashboard entry points
- Added rescan and log viewing commands
- Added packaged app bundle support for VSIX distribution
- Added local ingestion for Codex and Claude Code history
- Switched database writes to incremental upsert retention
- Added configurable port, host, data directory, and memory directory settings
- Added Node.js 24+ runtime checks and an optional `threadvault.nodePath` setting
- Fixed local server restarts after ThreadVault settings changes
- Added local Markdown export and memory-save actions from the session detail view
- Refined the embedded UI with cleaner settings, browser-open hiding outside VS Code, and mutually exclusive All/Favorites/Hidden filters
- Added pre-publish verification for bundled app sync and private artifact ignore rules
- Wired VSIX package and publish scripts through the verification gate
- Added local service security headers, request timeouts, and response-stream error handling
- Added checks for command registration, activation events, VSIX bundle metadata, and stricter publish readiness
- Clarified VSIX output location and local write-origin restrictions in extension documentation
- Clarified Regular/Favorite/Hidden state behavior and the difference between Markdown export and memory-save actions
- Added public release references for SECURITY and CONTRIBUTING guidance
- Aligned Marketplace gallery banner metadata with the current ThreadVault UI direction
- Added bundled runtime fingerprints so same-version local VSIX installs refresh the copied app when bundled source changes
