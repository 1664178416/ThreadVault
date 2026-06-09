# Changelog

## 0.1.0 - 2026-05-30

- Added a local-first Copilot chat archive with SQLite indexing and search
- Added a VS Code extension for starting the local server and opening the dashboard
- Added local ingestion for GitHub Copilot Chat, Codex, and Claude Code history
- Added extension packaging preparation, GitHub publishing guidance, and a compact embed mode for the VS Code webview
- Added Markdown export and a configurable memory folder for saving selected sessions as durable notes
- Added local-only host binding, stricter CORS behavior, and VS Code settings for port, host, data, and memory directories
- Added Node.js 24+ runtime checks and a configurable VS Code `threadvault.nodePath` setting
- Fixed VS Code server restarts after ThreadVault settings changes so new data and memory directories take effect
- Refined the UI with a cleaner activity rail, settings panel, resizable browser sidebar, and mutually exclusive All/Favorites/Hidden session filters
- Added pre-publish verification for extension bundle sync, ignored private artifacts, Marketplace readiness warnings, and whitespace checks
- Wired extension package/publish scripts through the verification gate
