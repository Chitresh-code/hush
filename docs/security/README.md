# Security Documentation

Status: Proposed  
Last updated: 2026-08-17

Hush security documentation is public engineering truth. It states what the system protects, what the service can observe, what failure means, and which claims remain unverified.

Rendered diagrams are embedded as SVG. Their editable Excalidraw sources are stored beside them under [`docs/assets/diagrams/security`](../assets/diagrams/security/).

| Document | Purpose |
| --- | --- |
| [Threat model](threat-model.md) | Assets, attackers, abuse paths, risk ranking, and mitigations |
| [Security model](security-model.md) | Trust boundaries, required controls, and release blockers |
| [Cryptographic protocol](cryptographic-protocol.md) | Encryption, authentication, envelope, and downgrade requirements |
| [Key management](key-management.md) | Key ownership, lifecycle, wrapping, rotation, and revocation |
| [Account recovery](account-recovery.md) | Separation of account and secret recovery |

No cryptographic or security claim is implemented yet. Source code, tests, platform evidence, protocol review, and independent assessment are required before release claims become confirmed.
