---
title: "ADR-002: Store local records in SQLite under ~/.hush"
status: "Accepted"
date: "2026-08-17"
authors: "Hush maintainers"
tags: ["architecture", "storage", "sqlite", "local"]
supersedes: ""
superseded_by: ""
---

# ADR-002: Store local records in SQLite under `~/.hush`

## Status

Accepted

## Context

Hush needs transactional local state for encrypted payloads, immutable versions, pending mutations, synchronization cursors, key envelopes, tombstones, and migrations. Hush also needs one predictable user-level location for its database, non-secret settings, UI state, logs, cache, and temporary files.

## Decision

- **DEC-001**: Use one user-level directory resolved from `os.homedir()`: `~/.hush`. Never create a `.hush` directory in a project or working directory.
- **DEC-002**: Use `~/.hush/hush.db` as the embedded SQLite record store.
- **DEC-003**: Use `better-sqlite3` for the initial TypeScript client. Pin the exact compatible version during Phase 1. Do not use the release-candidate `node:sqlite` API for the initial release.
- **DEC-004**: Encrypt secret names, values, and sensitive metadata before they enter SQLite. SQLite transactions provide persistence, not cryptographic authenticity.
- **DEC-005**: Use `~/.hush/config.json` for human-editable, non-secret settings with Hush-owned atomic file writes and Zod validation.
- **DEC-006**: Use `~/.hush/ui-state.json` for non-secret persisted TermUI state through `@termuijs/store` with an explicit file path.
- **DEC-007**: Use `~/.hush/logs`, `~/.hush/cache`, and `~/.hush/tmp` for redacted logs, disposable cache, and restricted temporary files.
- **DEC-008**: Store device private material and session credentials in the OS credential store, not in `~/.hush`. Files contain only non-secret references when required.
- **DEC-009**: Create `~/.hush` with mode `0700` and sensitive files with mode `0600` on supported Unix platforms. Refuse unsafe ownership, symlink, or permission states instead of silently continuing.

## Initial layout

```text
~/.hush/
├── hush.db
├── config.json
├── ui-state.json
├── logs/
├── cache/
└── tmp/
```

## Consequences

### Positive

- One location makes backup, cleanup, permissions, and support behavior understandable.
- SQLite transactions avoid a custom database format.
- Project directories remain untouched unless the user explicitly imports from or exports to them.

### Negative

- Native SQLite packaging must be verified for every supported Node.js and macOS target.
- Journals, temporary files, backups, and diagnostics expand the persistence surface.
- Application-layer encryption limits ordinary indexing of sensitive fields.

## Validation

Before Phase 2 stores a user secret, tests must inspect the database, journal, temporary, backup, and diagnostic artifacts for synthetic canary plaintext. Crash, migration, permissions, symlink, concurrent-access, corruption, and rollback behavior must be exercised on supported macOS targets.

## References

- [Node.js SQLite API stability](https://nodejs.org/api/sqlite.html)
- [better-sqlite3 releases](https://github.com/WiseLibs/better-sqlite3/releases)
- [Conceptual data model](../architecture/data-model.md)
- [Testing strategy](../engineering/testing-strategy.md)
