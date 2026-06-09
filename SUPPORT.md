# Support

If ThreadVault does not show the sessions you expect:

1. Re-run the local scan with `node src/server.js --scan-only`.
2. Start the local server with `npm run dev` and open `http://127.0.0.1:3187`.
3. If you are testing through VS Code, run `ThreadVault: Open Logs`.
4. Confirm `node --version` is 24 or newer. In VS Code, set `threadvault.nodePath` if `node` is not on `PATH`.
5. Run `npm run verify` before reporting packaging or extension issues.

When opening an issue, include the failing command, visible error message, operating system, Node.js version, VS Code version, and any relevant local session file path. Do not upload private prompts, transcripts, SQLite databases, exports, or memory notes unless you have reviewed and sanitized them.

Use GitHub Issues for bugs and feature requests:

https://github.com/wyh/threadvault/issues
