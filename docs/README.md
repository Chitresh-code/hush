# Hush Documentation

Status: Proposed  
Last updated: 2026-08-17

The documentation records the product contract, accepted technical direction, security boundaries, and engineering evidence for Hush. Documents describe confirmed decisions separately from proposals and unknowns.

## Current documents

| Document | Purpose | Status |
| --- | --- | --- |
| [Product](product/PRD.md) | Product scope, terminology, milestones, requirements, and release gates | Draft |
| [Architecture](architecture/README.md) | Proposed components, boundaries, data flows, and failure behavior | Proposed |
| [Security](security/README.md) | Security objectives, threat model, sensitive-data lifecycle, and required controls | Proposed |
| [Engineering](engineering/README.md) | Implementation workflow, repository shape, quality gates, and evidence policy | Phase 1 in progress |
| [Design](design/tui-ux-spec.md) | Terminal workflows, safety interactions, states, and accessibility | Proposed |
| [Decision records](decisions/README.md) | Accepted and proposed choices that are costly to reverse | Per record |
| [Diagram assets](assets/diagrams/README.md) | Editable Excalidraw sources and rendered SVG files | Proposed |

## Structure

```text
docs/
├── README.md
├── product/
├── architecture/
├── security/
├── design/
├── engineering/
├── decisions/
└── assets/
    └── diagrams/
```

Each section grows with implemented or actively designed behavior. User tutorials, API reference, integrations, deployment runbooks, and website documentation receive their own sections when those capabilities enter scope.

## Document states

- **Proposed:** open for review and not an implementation contract.
- **Accepted:** approved and binding until superseded.
- **Superseded:** replaced by a linked document or decision.
- **Obsolete:** no longer applies and has no replacement.

## Change rules

- Change the PRD when product behavior, scope, or release criteria change.
- Change architecture and security documents before implementing a change to a trust boundary, stored data, protocol, or recovery behavior.
- Record a separate decision only when a choice is accepted, costly to reverse, and not already clear in these documents.
- Link implementation and tests when they exist. Do not describe proposed behavior as observed behavior.
- Keep each editable Excalidraw source beside its rendered SVG and embed the SVG with a relative path.
- Do not create empty documentation trees. Add a document when its subject enters active design or implementation.

## Required evidence labels

Use these labels when status could be misunderstood:

- **Confirmed:** observed in source code, tests, runtime output, or an accepted decision.
- **Proposed:** intended behavior that is not implemented or accepted.
- **Unknown:** missing evidence blocks a safe decision.
