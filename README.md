# ThreadVault

ThreadVault is a local-first demo for archiving and searching AI coding conversations from developer tools. This first implementation focuses on real GitHub Copilot Chat history stored by VS Code and turns it into a searchable local archive with a lightweight browser UI.

## Current Demo Scope

- Scans local Copilot chat history from VS Code storage
- Supports both `.json` session files and `.jsonl` incremental session files
- Normalizes chat sessions into a small local SQLite database
- Persists personal archive metadata across rescans:
  - favorites
  - archived state
  - tags
  - notes
- Exports sessions to Markdown
- Shows a local UI for:
  - session list
  - transcript detail
  - keyword search
  - favorites-only and archived filters
  - opening the source session file in VS Code
  - opening the related workspace when the path is available
  - saving personal annotations
  - exporting Markdown

## Project Structure

```text
ThreadVault/
|-- data/
|   `-- threadvault.sqlite
|-- docs/
|   |-- implementation-plan.md
|   |-- schema.md
|   |-- tasks-mvp.md
|   `-- technical-design.md
|-- extension/
|   |-- media/
|   |   `-- threadvault.svg
|   |-- extension.js
|   `-- package.json
|-- public/
|   |-- app.js
|   |-- index.html
|   `-- styles.css
|-- scripts/
|   `-- prepare-extension.mjs
|-- src/
|   |-- adapters/
|   |   `-- copilot.js
|   |-- db/
|   |   |-- database.js
|   |   `-- repository.js
|   |-- services/
|   |   |-- actions.js
|   |   `-- indexer.js
|   |-- utils/
|   |   |-- fs.js
|   |   |-- jsonPatch.js
|   |   `-- time.js
|   |-- config.js
|   `-- server.js
|-- package.json
`-- README.md
```

## Requirements

- Node.js 24 or newer
- VS Code installed locally
- GitHub Copilot Chat history already present in VS Code local storage

## Run The Demo

Start the local app:

```bash
node src/server.js
```

Then open [http://localhost:3187](http://localhost:3187).

If you only want to test the ingestion pipeline without opening the UI:

```bash
node src/server.js --scan-only
```

## Data Source

The current adapter reads from:

```text
%APPDATA%\Code\User\globalStorage\emptyWindowChatSessions
```

This is a real local Copilot session store used by VS Code on Windows.

## What Is Working Now

- End-to-end Copilot session ingestion
- SQLite persistence
- Personal archive metadata that survives rescans
- Searchable session list
- Session detail rendering
- Markdown export
- Open source transcript file in VS Code
- Open workspace in VS Code when available
- Minimal VS Code extension shell with commands and an activity-bar entry

## VS Code Usage And Testing

### Run the local app directly

From the project root:

```bash
node src/server.js
```

Then open [http://localhost:3187](http://localhost:3187).

### Test the VS Code extension

1. Open [extension](</C:/Users/wyh/Desktop/ThreadVault/extension>) in VS Code.
2. Press `F5`.
3. Choose `Run ThreadVault Extension`.
4. In the Extension Development Host, open the `ThreadVault` activity bar.
5. Run:
   - `Start Local Server`
   - `Open Embedded Panel`
   - `Rescan Copilot History`
   - `Open Logs` if you want to inspect server output

In development mode, the extension reads the app source directly from the repository root, so you do not need a packaging build step to iterate.

### Suggested manual test checklist

1. Start the local server from the extension.
2. Confirm the embedded panel loads.
3. Run a rescan and verify the imported session count updates.
4. Search for a known keyword from a Copilot conversation.
5. Open one session and save a note or tags.
6. Export a session to Markdown and confirm a file appears in [data/exports](</C:/Users/wyh/Desktop/ThreadVault/data/exports>).
7. Use `Open source file in VS Code` and `Open workspace in VS Code` on a session that has paths available.

## Known Limitations

- Current demo only supports Copilot
- Some Copilot sessions with empty request lists are skipped
- Search is currently lexical only
- Native reopen into the original Copilot chat thread is not implemented yet
- Workspace extraction is best-effort and may be missing for many sessions
- The VS Code extension currently embeds the local dashboard rather than fully reimplementing the UI natively

## Recommended Next Steps

1. Replace the embedded dashboard shell with a native VS Code tree + webview experience.
2. Add more adapters, such as Codex or Claude-related sources.
3. Improve workspace recovery and source-to-session linking.
4. Add export to JSON alongside Markdown.
5. Add secret redaction rules before indexing.
6. Add background watching instead of scan-on-demand only.

## VS Code Extension Shell

There is now a minimal extension shell in [extension](</C:/Users/wyh/Desktop/ThreadVault/extension>).

To try it locally:

1. Open [extension](</C:/Users/wyh/Desktop/ThreadVault/extension>) in VS Code.
2. Press `F5` to launch an Extension Development Host.
3. Use the `ThreadVault` activity bar entry or the command palette commands:
   - `ThreadVault: Start Local Server`
   - `ThreadVault: Open Embedded Panel`
   - `ThreadVault: Open Dashboard In Browser`
   - `ThreadVault: Open Logs`
   - `ThreadVault: Rescan Copilot History`

## Preparing For GitHub

Before pushing this project to GitHub, review local-only data and generated artifacts:

- [data](</C:/Users/wyh/Desktop/ThreadVault/data>) may contain personal archived chat data and exports.
- `permission_test.txt` is local scratch data.
- `extension/app` is a generated packaging artifact and is ignored by Git.

The repository now includes a [`.gitignore`](</C:/Users/wyh/Desktop/ThreadVault/.gitignore>) that excludes the local database, exports, VSIX packages, and other machine-local files.

## Uploading To GitHub

If this folder is not yet a standalone Git repository, initialize one from the project root:

```bash
git init -b main
git add .
git commit -m "Initial ThreadVault demo"
```

Then create an empty GitHub repository first, and add the remote:

```bash
git remote add origin REMOTE-URL
git push -u origin main
```

If you use GitHub CLI, you can also create and push in one flow:

```bash
gh repo create --source=. --private --push
```

Recommended before the first push:

1. Confirm `data/` does not contain anything private you do not want online.
2. Review [LICENSE](/C:/Users/wyh/Desktop/ThreadVault/LICENSE), [CHANGELOG.md](/C:/Users/wyh/Desktop/ThreadVault/CHANGELOG.md), and [SUPPORT.md](/C:/Users/wyh/Desktop/ThreadVault/SUPPORT.md) and adjust the owner name or support links if needed.
3. Add repository metadata such as screenshots and a short roadmap.
4. Fix the Git repository boundary so this folder is tracked independently instead of being treated as part of `C:/`.

## Publishing To The VS Code Marketplace

The current extension can be packaged today, but before a public Marketplace release you should finish a small release checklist:

1. Update `extension/package.json` with your real `publisher`, version, description, repository URL, keywords, and support metadata.
2. Replace the placeholder repository metadata in [package.json](/C:/Users/wyh/Desktop/ThreadVault/package.json) and [extension/package.json](/C:/Users/wyh/Desktop/ThreadVault/extension/package.json) with your real GitHub repository and Marketplace publisher information.
3. Review the extension release files in [extension](</C:/Users/wyh/Desktop/ThreadVault/extension>):
   - [README.md](/C:/Users/wyh/Desktop/ThreadVault/extension/README.md)
   - [CHANGELOG.md](/C:/Users/wyh/Desktop/ThreadVault/extension/CHANGELOG.md)
   - [LICENSE](/C:/Users/wyh/Desktop/ThreadVault/extension/LICENSE)
   - [SUPPORT.md](/C:/Users/wyh/Desktop/ThreadVault/extension/SUPPORT.md)
4. From the project root, generate the bundled runtime app:

```bash
npm run prepare:extension
```

5. In the [extension](</C:/Users/wyh/Desktop/ThreadVault/extension>) folder, package a VSIX:

```bash
vsce package
```

6. Test the `.vsix` locally:

```bash
code --install-extension threadvault-vscode-0.1.0.vsix
```

7. After local verification, publish with `vsce publish` or upload the generated VSIX manually in the Marketplace publisher management page.

For a stronger first public release, I recommend doing these before publishing:

- Replace the placeholder publisher value `local`
- Add screenshots or a short demo GIF
- Add a privacy note explaining that chat history stays local
- Consider adding a native session tree instead of only the embedded dashboard shell
