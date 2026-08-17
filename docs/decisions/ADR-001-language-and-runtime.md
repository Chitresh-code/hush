---
title: "ADR-001: Use TypeScript and TermUI for the local client"
status: "Accepted"
date: "2026-08-17"
authors: "Hush maintainers"
tags: ["architecture", "language", "runtime", "typescript", "termui"]
supersedes: ""
superseded_by: ""
---

# ADR-001: Use TypeScript and TermUI for the local client

## Status

Accepted

## Context

Hush needs a polished keyboard-first terminal application, local persistence, direct child-process execution, and later synchronization with a remote service. The intended installation is `npm install -g @chitresh-code/hush`. TermUI is a TypeScript terminal UI framework whose current packages cover rendering, widgets, JSX, state, theming, navigation, motion, testing, development reload, system data, and adapters.

The local client language does not constrain the remote service implementation. A Rust-backed remote API remains allowed, but it is a separate runtime and trust boundary.

## Decision

- **DEC-001**: Implement the CLI and TUI in TypeScript using TermUI.
- **DEC-002**: Publish the client as the npm package `@chitresh-code/hush` with a `hush` executable.
- **DEC-003**: Use the current supported Node.js LTS line for production and development. Pin exact versions in the lockfile and CI when implementation starts.
- **DEC-004**: Use `@termuijs/core`, `@termuijs/widgets`, `@termuijs/ui`, `@termuijs/jsx`, `@termuijs/store`, `@termuijs/tss`, `@termuijs/router`, `@termuijs/motion`, `@termuijs/data`, and `@termuijs/adapters` where required by implemented screens.
- **DEC-005**: Use `@termuijs/testing` for rendering tests and direct `tsx` execution for interactive local development. Do not use `tsx watch` or `@termuijs/dev-server` 0.1.7 because they consume or withhold terminal input from Hush.
- **DEC-006**: Keep domain rules, storage, encryption, and authorization outside rendering components.
- **DEC-007**: Do not add a separate platform package or native launcher until packaging evidence requires one.

## Adapter policy

TermUI adapters are conveniences, not trusted Hush boundaries.

| Adapter | Decision |
| --- | --- |
| Zod | Use for input and configuration validation. |
| Chalk | Use only for compatibility with existing styled output. |
| Execa | Use for direct subprocess execution with argument arrays, explicit environment handling, bounded output, cancellation, and redaction. Never interpolate a shell command. |
| Git | Limit the first release to read-only repository discovery and status. Add mutations only for an explicit user workflow. |
| GitHub | Defer until a real integration requirement exists. |
| Dotenv | Use only if it satisfies the documented inert `.env` grammar and resource limits. Never execute imported content. |
| AI and local vector store | Defer. They are not required for the first product workflow. |
| Data | Use only for non-secret local system statistics and HTTP health. Do not pass database credentials through process arguments. |
| Local Storage and Conf | Do not use. Their default paths are outside `~/.hush`, and Hush requires one explicit user-level state boundary. |
| Keychain | Do not use. Its current `keytar` dependency is archived and its fallback behavior does not fail closed. Use the separately reviewed OS credential-store binding from ADR-003. |

## Consequences

### Positive

- The requested TUI, package, and distribution model use one language and package ecosystem.
- TermUI supplies the rendering and interaction features needed for a polished terminal experience.
- The remote service can evolve independently behind a versioned API.

### Negative

- npm installation includes a runtime and dependency supply-chain surface.
- Native storage and database dependencies need supported prebuilt artifacts or local build prerequisites.
- Terminal, signal, key-store, and packaging behavior still requires tests on every supported platform.

## Validation

Phase 1 must prove clean startup and terminal restoration after normal exit, error, cancellation, signal, and uncaught failure on the supported macOS and terminal matrix. It must also exercise global npm installation from a packed artifact. These are required observations, not current implementation evidence.

## References

- [TermUI installation](https://www.termui.io/docs/getting-started/installation)
- [TermUI architecture](https://www.termui.io/docs/getting-started/architecture)
- [TermUI testing](https://www.termui.io/docs/testing/overview)
- [TermUI development server](https://www.termui.io/docs/guides/dev-server)
- [Implementation plan](../engineering/implementation-plan.md)
