# Support

If the ThreadVault extension does not start or the panel is empty:

1. Run `ThreadVault: Open Logs`.
2. Run `ThreadVault: Rescan Local History`.
3. Confirm `node --version` is 24 or newer in the same environment VS Code can access.
4. If `node` is not on `PATH`, set `threadvault.nodePath` to a Node.js 24+ executable.
5. Check the `threadvault.port`, `threadvault.host`, `threadvault.clientHost`, `threadvault.dataDirectory`, and `threadvault.memoryDirectory` settings.
6. Keep `threadvault.host` on `127.0.0.1` unless you intentionally want to expose the local service outside your machine.

If you are developing or packaging from source, run these from the repository root before reporting packaging issues:

```bash
npm run prepare:extension
npm run verify
```

When opening an issue, include the extension version, VS Code version, operating system, Node.js version, visible error message, and any custom ThreadVault settings.

Do not upload private prompts, transcripts, SQLite databases, exports, memory notes, full source history files, or screenshots that reveal private code unless you have reviewed and sanitized them.

Use GitHub Issues for bugs and feature requests:

https://github.com/wyh/threadvault/issues
