# Hush Repository Structure

Status: Implemented for the first Phase 1 slice  
Last updated: 2026-08-17  
Evidence: [Implementation plan](implementation-plan.md) and [ADR-001](../decisions/ADR-001-language-and-runtime.md)  
Implementation evidence: [`package.json`](../../package.json), [`src`](../../src), and [`test`](../../test)

## Current structure

The repository contains the first no-secret TypeScript and TermUI application slice alongside the product and engineering documentation.

## Phase 1 structure

```text
hush/
├── AGENTS.md
├── README.md
├── package.json
├── package-lock.json
├── tsconfig.json
├── src/
│   ├── cli.tsx
│   ├── app.tsx
│   ├── domain.ts
│   └── hush-home.ts
├── test/
└── docs/
```

Keep one package until a separately released or independently consumed package exists. Keep rendering in components, domain invariants in ordinary TypeScript, and filesystem logic in one Hush-home module. Add directories only when the relevant feature enters implementation.

The later sync service may live in this repository or another repository after its framework, ownership, and release boundary are selected. Do not scaffold it during the local alpha.

## Local user data

Runtime state is outside the repository and outside project directories:

```text
~/.hush/
├── hush.db          # Phase 2, not created by Phase 1
├── config.json
├── ui-state.json
├── logs/
├── cache/
└── tmp/
```

Tests replace the home directory with an isolated temporary directory. They never read or write the developer's real `~/.hush`.

## Deferred repository files

`LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, public website content, examples, service code, and release workflows enter only when their decisions and implementation are active. The repository remains private until the open-source boundary and release controls are selected.
