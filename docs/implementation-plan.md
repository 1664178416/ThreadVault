# ThreadVault Implementation Plan

## 1. Development Objective

Reach a working MVP that supports:

- one live source adapter
- local indexing
- SQLite persistence
- sidebar listing
- session detail rendering
- full-text search
- workspace reopen
- Markdown export

## 2. Build Order

Development should follow dependency order, not UI-first order.

### Step 1: Shared Types

Deliverables:

- `ResumeType`
- `SourceAdapter`
- `NormalizedSession`
- `NormalizedMessage`
- IPC request/response types

Definition of done:

- shared package compiles
- types used by both extension and indexer

### Step 2: Database Layer

Deliverables:

- SQLite client
- migrations
- repositories:
  - sessions
  - messages
  - tags
  - search

Definition of done:

- schema creates successfully
- test insert and fetch works

### Step 3: Search Layer

Deliverables:

- FTS index writer
- search parser
- search query executor

Definition of done:

- session text searchable through FTS
- metadata filters work

### Step 4: Adapter Framework

Deliverables:

- adapter interface
- detection pipeline
- scan manager
- parse error reporting

Definition of done:

- mock adapter can import sample data end-to-end

### Step 5: First Real Adapter

Deliverables:

- choose first real source
- local fixture corpus
- parser
- normalizer

Definition of done:

- real sessions imported from local storage
- detail view data complete enough to browse

### Step 6: Indexer Service

Deliverables:

- background service entrypoint
- IPC request handling
- scan command
- list/get/search/export commands

Definition of done:

- extension can query service successfully

### Step 7: VS Code Sidebar

Deliverables:

- tree provider
- refresh command
- grouped session nodes

Definition of done:

- user can browse imported sessions in sidebar

### Step 8: Session Detail Webview

Deliverables:

- detail panel
- transcript rendering
- metadata header
- click to open referenced files

Definition of done:

- transcript readable and stable on large sessions

### Step 9: Export and Reopen

Deliverables:

- Markdown exporter
- workspace open action
- native resume hook if supported by first source

Definition of done:

- exported Markdown is readable
- workspace open is reliable

## 3. MVP Sprint Breakdown

### Sprint 1

- repo scaffold
- shared types
- SQLite schema
- basic repositories

### Sprint 2

- search layer
- mock adapter
- scan pipeline
- sample fixture tests

### Sprint 3

- first real adapter
- end-to-end import
- list sessions API

### Sprint 4

- VS Code sidebar
- session detail webview
- search UI

### Sprint 5

- workspace open
- Markdown export
- tags and favorites
- parser diagnostics

## 4. Open Questions Before Coding

These questions must be resolved before writing the first real adapter:

1. Which source is first?
2. Does that source store transcripts locally in a readable format?
3. Does it expose enough metadata to reopen a session?
4. Are source updates frequent enough to require file watching, or is manual scan enough for MVP?

## 5. Recommendation for First Source

Pick the source that satisfies:

- readable local storage
- stable enough structure
- high personal usage frequency

Do not pick based on popularity alone.

## 6. Acceptance Criteria for MVP

- One-click scan works
- At least 20 real sessions import successfully
- Search finds known sessions
- Session detail is readable
- User can open workspace from a session
- User can export a session to Markdown
- Parser failures do not crash the extension

