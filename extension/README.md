# ThreadVault VS Code Extension

ThreadVault is a local-first archive shell for AI coding conversations. The current extension starts a local Node service, scans GitHub Copilot Chat history from VS Code storage, and opens the ThreadVault dashboard inside VS Code or in your browser.

## Current capabilities

- Start the local ThreadVault server from VS Code
- Rescan local Copilot chat history
- Open the dashboard in an embedded webview
- Open the dashboard in your browser
- View local server logs

## Local development

1. Open the `extension` folder in VS Code.
2. Press `F5` and choose `Run ThreadVault Extension`.
3. In the Extension Development Host, open the `ThreadVault` activity bar item.
4. Run `Start Local Server`, then `Open Embedded Panel`.

In development mode, the extension reads the app source directly from the repository root, so you do not need to generate a bundle first.

## Packaging

Before packaging a VSIX, generate the runtime app bundle from the repository root:

```bash
npm run prepare:extension
```

Then package from the `extension` folder with `vsce package`.

## Marketplace notes

Before publishing, update at least these fields in `extension/package.json`:

- `publisher`
- `version`
- `description`
- optional metadata such as `repository`, `homepage`, `bugs`, and `keywords`

Also add a `LICENSE` and `CHANGELOG.md` in the extension root before publishing publicly.
