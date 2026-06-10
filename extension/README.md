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

Inside the dashboard, a session can be in exactly one state: `Regular`, `Favorite`, or `Hidden`. Hidden sessions leave the regular and Favorites views, but ThreadVault does not delete the source history file. `Export MD` creates a Markdown copy for backup or sharing, while `Save memory` writes a durable Markdown note to the configured memory directory.

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

Keep `threadvault.host` on `127.0.0.1` unless you intentionally want to expose the local service outside your machine. Write requests are restricted to local origins plus the explicitly configured bind host. If you bind to `0.0.0.0`, usually keep `threadvault.clientHost` on `127.0.0.1`.
For IPv6 localhost, use `::1` or `[::1]` in host settings and keep the port in `threadvault.port`.

## Packaging

From the repository root, generate the runtime app bundle and run verification:

```bash
npm run prepare:extension
npm run verify
npm run package:vsix
```

The generated VSIX is written to the `extension` folder.

The root package script delegates to the extension package script. If you are already inside the `extension` folder, this also works:

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
- `preview`
- `galleryBanner`

Also keep `LICENSE`, `CHANGELOG.md`, `SUPPORT.md`, root `SECURITY.md`, and root `CONTRIBUTING.md` aligned with your public repository and release plan.
