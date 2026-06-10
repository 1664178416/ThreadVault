## Summary

Describe what changed and why.

## Verification

- [ ] `npm run prepare:extension`
- [ ] `npm run verify`
- [ ] `git diff --check`
- [ ] Manual browser or VS Code check, if UI or extension behavior changed

## Privacy and packaging check

- [ ] No private prompts, transcripts, source history files, SQLite databases, exports, memory notes, logs, or VSIX files are included.
- [ ] Extension bundle changes were generated with `npm run prepare:extension` when `src/` or `public/` changed.
- [ ] Marketplace-facing metadata or docs were updated when packaging behavior changed.
