# Architecture Documentation

Status: Proposed  
Last updated: 2026-08-17

These documents define the proposed Hush system before implementation. They are engineering specifications, not evidence of running behavior.

Rendered diagrams are embedded as SVG. Their editable Excalidraw sources are stored beside them under [`docs/assets/diagrams/architecture`](../assets/diagrams/architecture/).

| Document | Purpose |
| --- | --- |
| [Solution architecture](solution-architecture.md) | System boundaries, components, deployment modes, and failure behavior |
| [C4 diagrams](c4-diagrams.md) | Context, container, component, and deployment views |
| [Sequence diagrams](sequence-diagrams.md) | Security-sensitive user and system flows |
| [Data model](data-model.md) | Conceptual entities, ownership, invariants, and server-visible metadata |
| [Sync protocol](sync-protocol.md) | Version exchange, concurrency, conflicts, retries, and revocation |

Accepted architecture choices are recorded in [decision records](../decisions/README.md). Security requirements are defined separately in the [security documentation](../security/README.md).
