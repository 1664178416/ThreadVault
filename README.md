# ThreadVault

ThreadVault is a local-first archive for AI coding conversations. It scans your local GitHub Copilot Chat, Codex, and Claude Code history, stores it in SQLite, and gives you a clean searchable UI for reviewing, tagging, favoriting, archiving, reopening, and exporting sessions.

Everything runs on your machine. No cloud account, sync service, or hosted backend is required.

## What You Can Do

- Search across local AI coding conversations
- Browse sessions from Copilot Chat, Codex, and Claude Code in one place
- Open the original transcript file in VS Code
- Open the related workspace folder when ThreadVault can detect it
- Add local tags, notes, favorites, and archived state
- Export any session to Markdown
- Use the browser UI directly or open the embedded VS Code panel

## Quick Start

Requirements:

- Node.js 24 or newer
- VS Code, if you want workspace/source-file open actions
- At least one supported local history source on your machine

Run the app:

```bash
npm start
```

Open:

```text
http://localhost:3187
```

ThreadVault scans on startup. To scan manually from the command line:

```bash
npm run scan
```

## First Use

1. Start ThreadVault with `npm start`.
2. Open `http://localhost:3187`.
3. Check the source counters for Copilot, Codex, and Claude.
4. Use search to find an old prompt, error message, file name, or project name.
5. Select a session to read the transcript.
6. Use `Favorite`, `Archive`, `Notes`, or `Export` as needed.

If no sessions appear, make sure you have used at least one supported tool locally and that its history files exist on disk.

## Supported Sources

ThreadVault currently reads:

| Source | Default location |
| --- | --- |
| GitHub Copilot Chat | `%APPDATA%\Code\User\globalStorage\emptyWindowChatSessions` |
| Codex | `%USERPROFILE%\.codex\sessions` |
| Claude Code | `%USERPROFILE%\.claude\projects` |

Claude subagent logs are skipped for now so the archive stays focused on main user-visible sessions.

## UI Guide

The dashboard has three main areas:

- `Overview`: source counts, message count, favorites, archived sessions, and rescan
- `Sessions`: searchable session list with source, workspace, time, summary, and tags
- `Transcript`: selected conversation, local annotations, source/workspace actions, export, and expandable process details

Tool and system traces are collapsed by default so the main conversation stays readable.

## VS Code Extension

The repository includes a minimal VS Code extension shell.

For local development:

1. Open the `extension` folder in VS Code.
2. Press `F5`.
3. In the Extension Development Host, open the ThreadVault activity bar.
4. Run `Start Local Server`.
5. Run `Open Embedded Panel`.

Useful commands:

- `ThreadVault: Start Local Server`
- `ThreadVault: Open Embedded Panel`
- `ThreadVault: Open Dashboard In Browser`
- `ThreadVault: Rescan Local History`
- `ThreadVault: Open Logs`

In development mode, the extension reads the app from the repository root, so you do not need to package anything for normal iteration.

## Packaging The Extension

Prepare the app bundle:

```bash
npm run prepare:extension
```

Package from the `extension` folder:

```bash
npx @vscode/vsce package
```

Install the generated VSIX:

```bash
code --install-extension threadvault-vscode-0.1.0.vsix
```

Before publishing publicly, update the extension metadata in `extension/package.json`, especially `publisher`, `repository`, `homepage`, `bugs`, and `version`.

## Data And Privacy

ThreadVault indexes local chat history into:

```text
data/threadvault.sqlite
```

Markdown exports are written to:

```text
data/exports/
```

These files may contain private prompts, code, paths, notes, and transcripts. They are ignored by `.gitignore` and should not be committed.

Before pushing to GitHub, double-check:

```bash
git status --short
```

Make sure `data/`, local exports, and packaged `.vsix` files are not staged.

## Useful Commands

```bash
# Start the local web app
npm start

# Same as start, useful during development
npm run dev

# Scan local history and print the result
npm run scan

# Copy src/ and public/ into extension/app for packaging
npm run prepare:extension
```

## Project Structure

```text
ThreadVault/
|-- public/              # Browser UI
|-- src/
|   |-- adapters/        # Copilot, Codex, Claude scanners
|   |-- db/              # SQLite schema and queries
|   |-- services/        # Scan, export, open actions
|   `-- server.js        # Local HTTP server
|-- extension/           # VS Code extension shell
|-- scripts/             # Packaging helpers
|-- docs/                # Design notes
`-- data/                # Local SQLite DB and exports, ignored by git
```

## Current Limitations

- ThreadVault can reopen source files and workspaces, but it does not yet jump back into the original third-party chat UI.
- Search is lexical full-text search, not semantic search.
- Some third-party history formats may change over time; parser confidence is intentionally conservative.
- The VS Code extension currently embeds the dashboard instead of rendering a fully native VS Code tree/detail interface.

## License

MIT
