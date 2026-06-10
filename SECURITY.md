# Security Policy

ThreadVault is local-first software that reads AI coding conversation history from your machine. Security and privacy reports are welcome, especially when they involve local file access, the HTTP API, VS Code webview messaging, exported Markdown, memory notes, or package contents.

## Supported Versions

The current pre-1.0 release line is supported while the project is being prepared for public Marketplace publishing.

| Version | Supported |
| --- | --- |
| `0.1.x` | Yes |

## Reporting a Vulnerability

Please do not post private prompts, transcripts, SQLite databases, exports, memory notes, full source history files, access tokens, or screenshots that reveal private code in a public issue.

For now, open a GitHub issue with a sanitized report and mark clearly that it is security-sensitive. Include:

- Operating system and VS Code version
- ThreadVault version or commit
- Node.js version
- Whether the issue happens in the browser dashboard, VS Code webview, or packaged VSIX
- Minimal sanitized reproduction steps
- Expected impact and what local files or origins are involved

If GitHub private vulnerability reporting is enabled for the repository, prefer that path for sensitive details.

## Security Model

- The local server binds to `127.0.0.1` by default.
- Write requests are restricted to local origins plus the explicitly configured bind host.
- Static file serving rejects path traversal.
- Request bodies are size-limited.
- Browser responses include security headers and a restrictive CSP.
- VS Code webview actions use a tokenized host bridge.
- Generated data, SQLite files, exports, memory notes, logs, and VSIX files are ignored by Git.

Please treat any change that weakens these defaults as security-sensitive.
