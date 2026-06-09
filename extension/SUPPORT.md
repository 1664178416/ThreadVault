# Support

If the ThreadVault extension does not start or the panel is empty:

1. Run `ThreadVault: Open Logs`.
2. Run `ThreadVault: Rescan Local History`.
3. Check the `threadvault.port`, `threadvault.host`, `threadvault.clientHost`, `threadvault.nodePath`, `threadvault.dataDirectory`, and `threadvault.memoryDirectory` settings.
4. From the repository root, run `npm run prepare:extension` and `npm run verify`.

When opening an issue, include the extension version, VS Code version, operating system, visible error message, and any custom ThreadVault settings. Do not upload private prompts, transcripts, SQLite databases, exports, or memory notes unless you have reviewed and sanitized them.

Use GitHub Issues for bugs and feature requests:

https://github.com/wyh/threadvault/issues
