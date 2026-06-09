# ThreadVault VS Code Extension

ThreadVault is a local-first library for AI coding conversations. The extension starts a local Node service, scans supported local history sources, and opens the ThreadVault dashboard inside VS Code or in your browser.

## Current Capabilities

- Start the local ThreadVault server from VS Code
- Rescan local history from supported sources
- Open the dashboard in an embedded webview
- Open the dashboard in your browser
- View local server logs
- Configure the local port, host, data directory, and Markdown memory directory

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

## Settings

ThreadVault contributes these VS Code settings:

- `threadvault.port`: local HTTP port, default `3187`
- `threadvault.host`: local bind host, default `127.0.0.1`; enter a host/IP only, not a URL
- `threadvault.clientHost`: host name the extension opens/calls, default `127.0.0.1`; enter a host/IP only, not a URL
- `threadvault.nodePath`: optional path to a Node.js 24+ executable when `node` is not on `PATH`
- `threadvault.dataDirectory`: optional custom SQLite/data directory
- `threadvault.memoryDirectory`: optional custom Markdown memory directory

Keep `threadvault.host` on `127.0.0.1` unless you intentionally want to expose the local service outside your machine. If you bind to `0.0.0.0`, usually keep `threadvault.clientHost` on `127.0.0.1`.
For IPv6 localhost, use `::1` or `[::1]` in host settings and keep the port in `threadvault.port`.

## Packaging

Before packaging a VSIX, generate the runtime app bundle from the repository root:

```bash
npm run prepare:extension
npm run verify
```

Then package from the `extension` folder. The package script runs `prepare:app` and `verify` before `vsce package`:

```bash
npm run package:vsix
```

The publish script runs the same preparation plus strict Marketplace checks. It fails while `publisher` is still `local`:

```bash
npm run publish:vsce
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
- `icon`

Also keep `LICENSE`, `CHANGELOG.md`, and `SUPPORT.md` aligned with your public repository and release plan.
