---
title: "ADR-005: Scope collaboration to organizations and projects"
status: "Accepted"
date: "2026-08-17"
authors: "Hush maintainers"
tags: ["architecture", "identity", "authorization", "tenancy"]
supersedes: ""
superseded_by: ""
---

# ADR-005: Scope collaboration to organizations and projects

## Status

Accepted

## Context

A user can work in several organizations. Each organization owns projects and manages its members. Project access is assigned directly to organization members. A separate team hierarchy is not required.

## Decision

- **DEC-001**: `Organization` is the top-level ownership and authorization boundary.
- **DEC-002**: A `User` belongs to zero or more organizations through `OrganizationMembership`.
- **DEC-003**: Organization roles are `admin` and `member`.
- **DEC-004**: An organization owns zero or more projects. Each project belongs to exactly one organization, and organization transfer is unsupported initially.
- **DEC-005**: A `ProjectMembership`, shown as a collaborator in the product, may reference only an active member of the project's organization.
- **DEC-006**: Project roles are `co_owner`, `editor`, and `viewer`.
- **DEC-007**: Derive project organization and both membership records from server-owned data. Never authorize from client-provided organization or role claims.
- **DEC-008**: A single-user workspace uses the same organization model.

## Permission model

| Role | Permissions |
| --- | --- |
| Organization admin | Manage organization configuration, invitations, users, organization roles, projects, project configuration, and project collaborators. An admin does not automatically receive secret decryption keys. |
| Organization member | Use only projects where the user has an active project membership. |
| Project co-owner | Manage project configuration, environments, collaborators, and project roles. Cannot invite or remove organization members, grant organization admin, or permanently delete the organization-owned project. |
| Project editor | Read, reveal, run with, create, edit, delete, and restore project secrets and environments. Cannot manage project configuration or access. |
| Project viewer | Read-only access, including reveal, copy, export, and run. Cannot create, edit, delete, restore, or manage access. |

Permanent project deletion is restricted to organization admins. A co-owner may archive a project. If a later requirement needs metadata-only access, add a distinct role rather than weakening `viewer` semantics.

## Invariants

- Every organization retains at least one active admin.
- Removing or suspending organization membership atomically disables all project memberships in that organization.
- Membership and role changes emit security events without secret content.
- Secret access additionally requires a valid device key envelope for the project or environment.
- Database constraints must prevent a project membership from crossing organization boundaries.

## Consequences

- Direct project membership is simpler than a speculative team hierarchy.
- Organization administrators can govern resources without receiving plaintext automatically.
- Viewer access includes secret use and disclosure, so it must be assigned deliberately.
- Resource transfer and role expansion require later explicit decisions.

## References

- [Hush terminology](../product/terminology.md)
- [Conceptual data model](../architecture/data-model.md)
- [Hush security model](../security/security-model.md)
