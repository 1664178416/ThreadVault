# Support

If ThreadVault does not show the sessions you expect:

1. Confirm `node --version` is 24 or newer.
2. In VS Code, run `ThreadVault: Open Logs` and check the latest error.
3. Run `ThreadVault: Rescan Local History`.
4. Check whether you have local Copilot Chat, Codex, or Claude Code history on this machine.
5. If `node` is not on `PATH`, set `threadvault.nodePath` to a Node.js 24+ executable.

If you are running from source:

1. Run `npm run scan`.
2. Start the local server with `npm run dev` and open `http://127.0.0.1:3187`.
3. Run `npm run prepare:extension` and `npm run verify` before reporting packaging or extension issues.

When opening an issue, include the failing command or ThreadVault command, visible error message, operating system, Node.js version, VS Code version, extension version, and any custom ThreadVault settings.

Do not upload private prompts, transcripts, SQLite databases, exports, memory notes, full source history files, or screenshots that reveal private code unless you have reviewed and sanitized them.

Use GitHub Issues for bugs and feature requests:

https://github.com/wyh/threadvault/issues
