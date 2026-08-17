# Architecture Decision Records

Status: Accepted  
Last updated: 2026-08-17

Decision records preserve why a costly choice was made. Accepted records bind implementation until superseded. Proposed records identify a preferred direction but do not authorize claims that the choice is final or verified.

| Record | Status | Decision |
| --- | --- | --- |
| [ADR-001](ADR-001-language-and-runtime.md) | Accepted | Use TypeScript and TermUI for the npm-distributed local client |
| [ADR-002](ADR-002-local-database.md) | Accepted | Store encrypted local records in SQLite under one user-level `~/.hush` directory |
| [ADR-003](ADR-003-cryptographic-library.md) | Proposed | Use libsodium and an OS credential-store binding after vectors and independent review |
| [ADR-004](ADR-004-server-blind-encryption.md) | Accepted | Keep secret decryption keys on authorized devices |
| [ADR-005](ADR-005-organization-scoped-collaboration.md) | Accepted | Use organization membership and direct project collaborator roles |
| [ADR-006](ADR-006-macos-first-local-alpha.md) | Accepted | Target macOS 14 or later first and distribute through npm |

Do not create empty records for hypothetical choices. Update a proposed record with source, spike, test, and operational evidence before accepting it.
