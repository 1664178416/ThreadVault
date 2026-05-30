# ThreadVault MVP Task List

## Phase A: Project Scaffolding

- Create monorepo folder structure
- Initialize `extension`, `indexer`, and `shared` packages
- Configure TypeScript project references
- Add lint and format setup
- Add build scripts

## Phase B: Shared Package

- Define base enums
- Define normalized session and message types
- Define adapter interface
- Define IPC payload types

## Phase C: Indexer Package

- Add SQLite dependency
- Implement migration runner
- Implement DB client
- Implement session repository
- Implement message repository
- Implement FTS repository
- Implement scan event repository

## Phase D: Search

- Implement query tokenizer
- Implement filter parser
- Implement FTS query builder
- Implement ranked result output

## Phase E: Adapter System

- Implement base adapter class
- Implement adapter registry
- Implement detect flow
- Implement discover flow
- Implement normalize flow
- Implement dedup logic

## Phase F: First Source Adapter

- Choose first supported source
- Collect local sample sessions
- Document raw storage format
- Implement parser
- Implement normalizer
- Implement resume capability classification

## Phase G: Extension Package

- Register extension activation
- Add `ThreadVault: Scan All`
- Add `ThreadVault: Refresh`
- Add `ThreadVault: Search`
- Add sidebar tree provider
- Add session detail webview
- Add open workspace command
- Add export Markdown command

## Phase H: Metadata Actions

- Add favorite toggle
- Add tag assignment
- Add note editing

## Phase I: QA

- Test with 20+ real sessions
- Verify Unicode handling
- Verify large transcript rendering
- Verify missing workspace behavior
- Verify parser error handling
- Verify export output

## Phase J: Ship-Ready

- Add sample screenshots
- Add user settings documentation
- Add privacy statement
- Add known limitations section
