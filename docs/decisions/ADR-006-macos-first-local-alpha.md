---
title: "ADR-006: Target macOS first for the local alpha"
status: "Accepted"
date: "2026-08-17"
authors: "Hush maintainers"
tags: ["architecture", "platform", "delivery"]
supersedes: ""
superseded_by: ""
---

# ADR-006: Target macOS first for the local alpha

## Status

Accepted

## Context

Terminal restoration, signals, file permissions, clipboard behavior, credential storage, native npm dependencies, and child-process behavior vary by operating system. The first implementation will be tested locally on macOS while keeping formats and core TypeScript logic portable.

## Decision

- **DEC-001**: Support macOS 14 or later on Apple silicon and Intel for the local alpha.
- **DEC-002**: Distribute the client publicly through `npm install -g @chitresh-code/hush`. Public package access does not grant an open-source license or define the later managed-service pricing model.
- **DEC-003**: Test the initial terminal matrix in Terminal.app, iTerm2, and the VS Code integrated terminal. Add another terminal only after reported or observed use.
- **DEC-004**: Keep the data format and TypeScript core platform-neutral, but report Linux and Windows as unsupported until their key-store, terminal, process, file-permission, clipboard, database, and packaging paths are implemented and tested.
- **DEC-005**: Start child processes directly. Shell evaluation is not part of the initial execution model.

These are product targets, not observed compatibility claims. Phase 1 must produce the support evidence.

## Consequences

- The first release has a bounded platform test matrix.
- Native dependency artifacts must exist or documented build prerequisites must be supplied for both macOS architectures.
- Linux and Windows can be added without changing the Hush directory or encrypted data formats, but this portability remains unverified.

## Validation

Exercise global installation, first run, terminal restoration, signals, permissions, clipboard limitations, SQLite, OS credential storage, and child-process cleanup on every supported macOS version, architecture, and listed terminal before claiming support.

## References

- [Hush product requirements](../product/PRD.md)
- [Hush testing strategy](../engineering/testing-strategy.md)
- [Hush architecture](../architecture/solution-architecture.md)
