# Contributing

Thanks for helping improve ThreadVault. The project is a local-first archive for AI coding conversations, so privacy and small, verifiable changes matter a lot.

## Local Setup

Use Node.js 24 or newer.

ThreadVault currently uses Node built-ins for the app runtime, so there is no dependency install step for normal local development.

```bash
npm run dev
```

Open the dashboard at `http://127.0.0.1:3187`.

Packaging uses a pinned non-interactive `npx --yes @vscode/vsce@3.9.2` command through `npm run package:vsix`, so you do not need to add a committed `node_modules/` folder or generated lockfile.

For VS Code extension work, open the `extension` folder in VS Code and run the extension launch configuration. From the repository root, keep the packaged runtime in sync with:

```bash
npm run prepare:extension
```

## Before Opening a Pull Request

Run these checks from the repository root:

```bash
npm run prepare:extension
npm run verify
git diff --check
```

If packaging behavior changed, also run:

```bash
npm run package:vsix
```

## Privacy Rules

Do not commit private prompts, transcripts, source history files, SQLite databases, exports, memory notes, logs, screenshots with private code, or generated VSIX files. These are intentionally ignored by Git, but please check `git status --short` before opening a PR.

Before committing, also compare staged and unstaged paths so a finished fix is not left behind:

```bash
git diff --name-only
git diff --cached --name-only
```

When adding fixtures or screenshots, use synthetic data that does not come from a real private conversation.

## Code Guidelines

- Keep the browser app in `public/` and the packaged extension runtime in `extension/app/` synchronized with `npm run prepare:extension`.
- Keep session states mutually exclusive: `Regular`, `Favorite`, and `Hidden`.
- Preserve local-first defaults. The server should bind to loopback by default and write actions should stay restricted to trusted local origins.
- Prefer focused changes over broad refactors.
- Update README, extension README, changelog, or support docs when user-facing behavior changes.
- Extend `scripts/verify.mjs` when a regression would be easy to miss manually.

## UI Changes

ThreadVault should stay quiet, dense, and useful inside both the VS Code side panel and a browser window. Prefer clear icon-plus-label controls, stable layout dimensions, readable transcripts, and concise text. Do not add marketing-style landing sections to the app surface.
