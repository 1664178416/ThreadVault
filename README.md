# ThreadVault

[![CI](https://github.com/wyh/threadvault/actions/workflows/ci.yml/badge.svg)](https://github.com/wyh/threadvault/actions/workflows/ci.yml)

ThreadVault is a local-first archive for AI coding conversations. It scans your local GitHub Copilot Chat, Codex, and Claude Code history, stores it in SQLite, and gives you a clean searchable UI for reviewing, tagging, favoriting, hiding, reopening, and exporting sessions.

Everything runs on your machine. No cloud account, sync service, or hosted backend is required.

## What You Can Do

- Search across local AI coding conversations
- Browse sessions from Copilot Chat, Codex, and Claude Code in one place
- Open the original transcript file in VS Code
- Open the related workspace folder when ThreadVault can detect it
- Add local tags, notes, favorites, and hidden state
- Export any session to Markdown
- Save selected sessions as long-term Markdown memory
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
http://127.0.0.1:3187
```

ThreadVault scans on startup. To scan manually from the command line:

```bash
npm run scan
```

## First Use

1. Start ThreadVault with `npm start`.
2. Open `http://127.0.0.1:3187`.
3. Check the source counters for Copilot, Codex, and Claude.
4. Use search to find an old prompt, error message, file name, or project name.
5. Select a session to read the transcript.
6. Set the session state to `Regular`, `Favorite`, or `Hidden`, then use `Notes`, `Export`, or `Memory` as needed.

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

- `Overview`: source counts, message count, favorites, hidden sessions, and rescan
- `Sessions`: searchable session list with source, workspace, time, summary, and tags
- `Transcript`: selected conversation, local annotations, source/workspace actions, Markdown export, memory save, and expandable process details

Tool and system traces are collapsed by default so the main conversation stays readable.

Session state is intentionally one-of-three:

- `Regular`: keep the session in the normal library.
- `Favorite`: keep the session visible and add it to the Favorites view.
- `Hidden`: remove the session from Regular and Favorites views. This does not delete the source history file or the local database row.

The transcript actions have different jobs:

- `Export MD`: create a Markdown copy under `data/exports/` for sharing, backup, or manual review.
- `Memory`: save a durable Markdown note under the memory directory for conversations worth reusing later.
- `Copy link`: copy a local URL that opens the dashboard directly on the selected session.

## Markdown Memory

Use the `Memory` action on a session when you want to keep a high-value conversation as a durable Markdown note.

By default, memory files are written to:

```text
data/memory/YYYY-MM-DD/<source>/<workspace>/<session>.md
```

Set a custom memory directory before starting ThreadVault:

```bash
THREADVAULT_MEMORY_DIR=/path/to/your/notes npm start
```

On Windows PowerShell:

```powershell
$env:THREADVAULT_MEMORY_DIR="D:\Notes\ThreadVault"; npm start
```

## VS Code Extension

The repository includes a VS Code extension for starting the local service and opening the embedded dashboard.

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

Useful settings:

- `threadvault.port`: local HTTP port, default `3187`
- `threadvault.host`: local bind host, default `127.0.0.1`; enter a host/IP only, not a URL
- `threadvault.clientHost`: host name the extension opens/calls, default `127.0.0.1`; enter a host/IP only, not a URL
- `threadvault.nodePath`: optional path to a Node.js 24+ executable when `node` is not on `PATH`
- `threadvault.dataDirectory`: optional custom data directory
- `threadvault.memoryDirectory`: optional custom Markdown memory directory

For IPv6 localhost, use `::1` or `[::1]` in host settings and keep the port in `threadvault.port`.

In development mode, the extension reads the app from the repository root, so you do not need to package anything for normal iteration.

## Packaging The Extension

From the repository root, prepare, verify, and package the extension:

```bash
npm run prepare:extension
npm run verify
npm run package:vsix
```

Install the generated VSIX:

```bash
code --install-extension extension/threadvault-vscode-*.vsix
```

On Windows PowerShell, install the newest generated VSIX with:

```powershell
code --install-extension (Get-ChildItem extension\threadvault-vscode-*.vsix | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
```

Before publishing publicly, update the extension metadata in `extension/package.json`, especially `publisher`, `repository`, `homepage`, `bugs`, `version`, `preview`, and `galleryBanner`. Keep the Marketplace icon at `extension/media/threadvault.png`, and keep `SECURITY.md` plus `CONTRIBUTING.md` aligned with the public repository.

The normal verification command warns while `publisher` is still `local`. The publish script uses a stricter check and will fail until `publisher` is replaced:

```bash
npm run publish:vsce
```

## Data And Privacy

ThreadVault indexes local chat history into:

```text
data/threadvault.sqlite
```

Markdown exports are written to:

```text
data/exports/
```

Saved memory notes are written to:

```text
data/memory/
```

These files may contain private prompts, code, paths, notes, and transcripts. The local `data/` directory is ignored by `.gitignore` and should not be committed.

The local HTTP API is intended for ThreadVault itself, VS Code, and browser pages opened from `localhost`, `127.0.0.1`, or `::1`. Write requests are restricted to these local origins plus the explicitly configured bind host. Do not expose the port to a public network.

By default the server binds to `127.0.0.1`. Set `THREADVAULT_HOST` only if you understand the privacy implications. If you bind to `0.0.0.0`, keep browser access on `127.0.0.1` unless you intentionally want other devices on your network to reach the service.

Before pushing to GitHub, double-check:

```bash
git status --short
```

Make sure `data/` and packaged `.vsix` files are not staged.

## Contributing And Security

See `CONTRIBUTING.md` for local setup, verification commands, privacy rules, and UI guidelines.

See `SECURITY.md` for the supported security model and how to report local file, HTTP API, VS Code webview, export, memory, or packaging issues without exposing private conversation data.

## Useful Commands

```bash
# Start the local web app
npm start

# Same as start, useful during development
npm run dev

# Scan local history and print the result
npm run scan

# Check syntax, extension manifest, and bundled app sync
npm run verify

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
|-- extension/           # VS Code extension
|-- scripts/             # Packaging helpers
|-- docs/                # Design notes
`-- data/                # Local SQLite DB, exports, and memory notes, ignored by git
```

## Current Limitations

- ThreadVault can reopen source files and workspaces, but it does not yet jump back into the original third-party chat UI.
- Search is lexical full-text search, not semantic search.
- Some third-party history formats may change over time; parser confidence is intentionally conservative.
- The VS Code extension currently embeds the dashboard instead of rendering a fully native VS Code tree/detail interface.

## License

MIT
