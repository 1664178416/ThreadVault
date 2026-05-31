# ThreadVault VS Code Extension

ThreadVault is a local-first archive shell for AI coding conversations. The extension starts a local Node service, scans supported local history sources, and opens the ThreadVault dashboard inside VS Code or in your browser.

## Current Capabilities

- Start the local ThreadVault server from VS Code
- Rescan local history from supported sources
- Open the dashboard in an embedded webview
- Open the dashboard in your browser
- View local server logs

Current indexed sources:

- GitHub Copilot Chat
- Codex
- Claude Code

## Local Development

1. Open the `extension` folder in VS Code.
2. Press `F5` and choose `Run ThreadVault Extension`.
3. In the Extension Development Host, open the `ThreadVault` activity bar item.
4. Run `Start Local Server`, then `Open Embedded Panel`.
5. Use `Rescan Local History` to refresh imported sessions.

In development mode, the extension reads the app source directly from the repository root, so you do not need to generate a bundle first.

## Packaging

Before packaging a VSIX, generate the runtime app bundle from the repository root:

```bash
npm run prepare:extension
```

Then package from the `extension` folder:

```bash
npx @vscode/vsce package
```

## Marketplace Notes

Before publishing, update at least these fields in `extension/package.json`:

- `publisher`
- `version`
- `description`
- `repository`
- `homepage`
- `bugs`
- `keywords`

Also keep `LICENSE`, `CHANGELOG.md`, and `SUPPORT.md` aligned with your public repository and release plan.
