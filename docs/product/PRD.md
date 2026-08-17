# Hush Product Requirements Document

Status: Draft 0.3  
Last updated: 2026-08-17  

## 1. Purpose

Hush is a local-first application for managing project secrets and environment variables from a terminal user interface. It is intended to replace scattered `.env` files, copied credentials, and manual secret sharing with a device-encrypted, versioned workflow that works locally, in organizations, and in CI.

Hush is being built privately first. A later decision will define which features, if any, are released under an open-source license. A managed service may remove hosting and maintenance work for a per-user subscription.

This document defines the product. It does not select cryptographic primitives, storage engines, hosting providers, authentication protocols, or TUI libraries. Those decisions require separate architecture decision records and evidence from implementation spikes or authoritative documentation.

## 2. Product definition

> Hush helps developers and small engineering teams securely store, edit, run with, synchronize, and share application secrets without leaving the terminal.

Users authenticate to the service. Organizations own collaborative resources. Enrolled devices encrypt and decrypt secrets. Self-hosted and managed services synchronize ciphertext but do not possess secret decryption keys.

## 3. Problem

Developers commonly keep application configuration in local `.env` files, password managers, chat messages, CI settings, and platform-specific secret stores. This creates several problems:

- A developer cannot easily tell which values are current.
- Secrets are copied into plaintext files and shell history.
- Team sharing and access removal are manual.
- Local, CI, and deployed environments drift apart.
- Rotation and rollback lack a reliable history.
- Existing secret platforms can be too expensive or operationally heavy for individuals and small teams.

## 4. Product principles

1. Local work must remain useful without a network connection.
2. Plaintext secrets must not be stored or transmitted by default.
3. Secret values must be disclosed only when the user explicitly requests or uses them.
4. Self-hosted users must have a complete, documented path to operate the product.
5. The managed service sells convenience, reliability, and reduced operational work, not access to a deliberately crippled core.
6. Terminal workflows must be keyboard-first, fast, accessible, and understandable without memorizing commands.
7. Security claims must be supported by a documented threat model, protocol design, and independent review before general availability.

## 5. Target users

### 5.1 Individual developer

Maintains several projects and environments, wants a safer replacement for local `.env` files, and may use Hush entirely offline.

### 5.2 Small engineering team

Needs shared environments, access control, onboarding, offboarding, change history, and CI integration without operating a large secrets platform.

### 5.3 Self-hosting administrator

Needs predictable deployment, upgrades, backups, recovery, health checks, and documented security boundaries.

The first release targets individual developers and small teams. Large-enterprise requirements such as SAML, SCIM, custom retention policy, hardware security module integration, and formal compliance reports are outside the initial scope.

## 6. Core user journeys

### 6.1 Start a local project

1. The user installs Hush.
2. The user creates a project and an environment.
3. The user imports an existing `.env` file or adds values interactively.
4. Hush encrypts the data at rest.
5. The user runs an application with the selected values injected into its process environment.
6. Hush does not rewrite the project's `.env` file unless the user explicitly exports one.

### 6.2 Review and change an environment

1. The user opens a project in the TUI.
2. The user selects an environment and sees secret names, status, and metadata with values concealed.
3. The user edits one or more values.
4. Hush shows the pending changes without exposing unchanged secret values.
5. The user confirms the update.
6. Hush records a new encrypted version that can be inspected and restored by an authorized user.

### 6.3 Share with a team

1. An organization admin invites a user.
2. The recipient accepts organization membership and enrolls a device.
3. An existing enrolled device or user-held recovery authority approves the new decrypting device.
4. An authorized device wraps environment keys for the recipient device.
5. The recipient receives access only to permitted projects and environments.
6. Removing a member denies later synchronization and triggers the documented future-key rotation policy.

Account authentication alone does not grant decryption. Revocation cannot erase plaintext or keys already obtained by a previously authorized device. The exact enrollment, verification, revocation, and rotation protocols remain unverified until implemented and independently reviewed.

### 6.4 Use secrets in CI

1. An administrator creates a non-human identity scoped to one project and environment.
2. The CI job authenticates without embedding a long-lived personal credential in the repository.
3. The job retrieves or receives only the values it is authorized to use.
4. Hush emits metadata suitable for an audit trail without logging secret values.

## 7. Release scope

### 7.1 Milestone 1: local alpha

The local alpha validates whether the core terminal workflow is valuable before building synchronization or billing.

Required:

- Installable `@anvara/hush` npm package with a TypeScript TermUI application.
- Keyboard-first TUI for projects, environments, and secret entries.
- Create, read, update, and delete operations with confirmation for destructive actions.
- Secret values concealed by default and copied or revealed only through explicit actions.
- Import of a documented `.env` subset with clear errors for unsupported syntax.
- Explicit export with overwrite protection and restrictive file permissions where the operating system supports them.
- Run a child process with selected values injected into its environment.
- Encrypted local storage with a documented lock and unlock lifecycle.
- Automatic lock after a configurable idle period.
- Local version history and restore.
- Recovery behavior documented and tested before user data is entrusted to the application.
- No telemetry unless it is opt-in and documented.

Exit criteria:

- A new user can import a project and run an application without manually copying a secret.
- Restarting and unlocking Hush preserves the stored data.
- Automated tests cover storage corruption, failed unlock, import validation, overwrite protection, process cleanup, and history restoration.
- A security review finds no unresolved issue that can expose plaintext through normal product operation.

### 7.2 Milestone 2: self-hosted team beta

Required:

- Documented single-node deployment and upgrade path.
- Authenticated accounts and device enrollment.
- Organizations, organization memberships, projects, project memberships, environments, and explicit roles.
- Account recovery separated from secret recovery.
- New decrypting devices approved by an enrolled device or user-held recovery kit.
- Encrypted synchronization with conflict detection.
- Member removal, device revocation, and documented key rotation.
- Service identities for CI.
- Append-only security event history for administrative actions.
- Backup and restore procedure with a tested restoration check.
- Health endpoints and structured logs that exclude secret values.

Exit criteria:

- Two authorized devices can synchronize changes and resolve a simulated conflict without silent data loss.
- A revoked device cannot fetch subsequent changes.
- A documented backup can be restored into a clean deployment.
- Upgrade and rollback are tested against the supported release path.
- The threat model and cryptographic protocol have received independent review.

### 7.3 Milestone 3: managed service

Required:

- Tenant isolation equivalent to the documented multi-tenant model.
- Subscription checkout, billing state, invoices, cancellation, and payment failure handling through a selected provider.
- Usage and entitlement enforcement based on documented product rules.
- Operational monitoring, alerting, backups, restoration drills, and incident response.
- Data export and account deletion.
- Published availability, support, privacy, and retention terms.

The initial pricing hypothesis is USD 5 to 10 per active user per month. This is not a committed price. Validate it through interviews, willingness-to-pay tests, operating-cost estimates, and a limited paid beta. A free individual tier or trial may be tested only after the cost model is known.

## 8. Functional requirements

| ID | Requirement | Initial milestone |
| --- | --- | --- |
| FR-01 | A user can organize secrets by project and environment. | Local alpha |
| FR-02 | Secret values are concealed by default in all interactive views. | Local alpha |
| FR-03 | A user can import supported `.env` entries without executing file content. | Local alpha |
| FR-04 | A user can explicitly export an environment without silently overwriting a file. | Local alpha |
| FR-05 | A user can run a command with secrets injected without persisting them to the project directory. | Local alpha |
| FR-06 | Every accepted change creates a restorable version. | Local alpha |
| FR-07 | The client can detect conflicting edits instead of silently choosing a winner. | Team beta |
| FR-08 | An administrator can grant and revoke project or environment access. | Team beta |
| FR-09 | An administrator can revoke a device or member. | Team beta |
| FR-10 | CI can authenticate as a scoped non-human identity. | Team beta |
| FR-11 | An authorized user can export their data in a documented format. | Managed service |
| FR-12 | A managed-service customer can start, change, and cancel a subscription. | Managed service |
| FR-13 | A user can belong to one or more organizations through explicit memberships. | Team beta |
| FR-14 | User authentication alone cannot authorize a decrypting device. | Team beta |
| FR-15 | A user can recover secret access through an enrolled device or verified recovery kit. | Team beta |
| FR-16 | Hush states that secrets are unrecoverable when all enrolled devices and recovery material are lost. | Team beta |
| FR-17 | An organization admin can manage organization settings, users, organization roles, projects, and project collaborators. | Team beta |
| FR-18 | A project collaborator must be an active member of the project's organization. | Team beta |
| FR-19 | A project collaborator has exactly one role: `co_owner`, `editor`, or `viewer`. | Team beta |

## 9. Security and privacy requirements

- Treat local files, synchronization services, networks, terminals, clipboards, logs, crash reports, child processes, and other team members as explicit trust boundaries.
- Never execute imported `.env` content as shell code.
- Never place secret values in command-line arguments where they may be visible to other processes or operating-system history.
- Clear in-memory plaintext when practical, while documenting where the language, libraries, or operating system prevent guarantees.
- Use restrictive permissions for files containing sensitive material where supported.
- Apply authenticated encryption and a versioned data format. Primitive and parameter choices belong in the cryptographic protocol, not this PRD.
- Do not design custom cryptographic primitives.
- Encrypt and decrypt secret content on enrolled devices. The synchronization service must not possess usable decryption keys.
- Keep account recovery separate from secret recovery.
- Require approval from an enrolled device or user-held recovery authority before a new device can decrypt existing secrets.
- Require authentication and authorization checks on every server-side resource access. Client-side checks are not an authorization boundary.
- Derive organization scope from the authenticated user and server-owned membership state.
- Prevent secret values from appearing in logs, metrics, traces, analytics, crash reports, or audit event payloads.
- Define rate limits, session expiry, credential rotation, replay protection, and safe error responses before exposing a network service.
- Document what metadata the service can observe even when values are encrypted.
- Provide a clear account and device recovery model. Do not promise recovery that contradicts the encryption design.
- Threat modeling and independent security review are release gates for team synchronization and the managed service.

## 10. User experience requirements

- Common actions must be discoverable through visible key hints or contextual help.
- Every view must be operable without a mouse.
- Focus, selection, validation errors, loading, offline state, and destructive confirmations must be distinguishable without relying only on color.
- The TUI must restore terminal state after success, failure, panic, or interruption where the platform permits.
- Secret reveal and copy actions must be deliberate and time-bounded where feasible.
- Clipboard behavior and its operating-system limitations must be documented.
- Long-running network or child-process operations must remain cancellable.
- Error messages must explain what failed and the safe next action without exposing sensitive data.

## 11. Technical direction and constraints

The local client is TypeScript and TermUI, packaged as `@anvara/hush`. It keeps local state in one user-level `~/.hush` directory and stores encrypted domain records in SQLite. A later Rust-backed remote API may synchronize ciphertext through a versioned contract.

The client uses TermUI packages for rendering, widgets, JSX, state, themes, routing, motion, testing, development reload, supported system statistics, and selected adapters. Hush-owned storage and protected-key boundaries remain explicit. TermUI adapters whose paths or fallback behavior violate those boundaries are not used.

Do not require a self-hosted deployment to depend on the managed service. Keep wire and encrypted data formats versioned so clients can reject incompatible changes safely.

## 12. Distribution and commercial model

Confirmed intent:

- Build and validate Hush privately first.
- Decide the open-source boundary only after implemented product behavior and security boundaries are understood.
- A paid managed service may offer the core workflow without self-hosting work.
- The target price range to test is USD 5 to 10 per user per month.

Before a public source release, select a license, confirm dependency compatibility, define governance and private security reporting, and document any managed-service-only features. These decisions do not block private Phase 1 development.

## 13. Success measures

Measurements must be collected only with user consent and without secret values.

Local alpha:

- Median time from installation to first successful injected command.
- Percentage of alpha users who use Hush in more than one project after two weeks.
- Number and severity of data-loss or secret-exposure incidents.
- Task completion rate for import, edit, run, history, and restore usability tests.

Team beta:

- Percentage of invited members who complete enrollment.
- Synchronization success and conflict rate, measured without secret contents.
- Time required to revoke a device and verify that subsequent access is denied.
- Successful backup restoration rate in scheduled drills.

Managed service:

- Trial-to-paid conversion, if a trial exists.
- Monthly customer and revenue retention.
- Support requests per active organization.
- Gross margin after infrastructure, payment, and support costs.

Targets are intentionally unset until baseline research or alpha data exists.

## 14. Non-goals for the first release

- A web dashboard.
- Mobile applications.
- A general-purpose password manager.
- Dynamic database credentials or public key infrastructure.
- Secret scanning across source repositories.
- Enterprise identity provisioning or compliance certification.
- Plugin or extension systems.
- Multi-region deployment.
- Every shell-specific `.env` syntax variant.

## 15. Risks and validation

| Risk | Evidence required before release |
| --- | --- |
| A terminal workflow is not enough to change existing habits. | Observe target users complete import, edit, run, and restore tasks. |
| Local encryption or recovery can cause irreversible data loss. | Protocol review, corruption tests, recovery tests, and documented limits. |
| Synchronization creates lost updates or stale authorization. | Deterministic conflict tests, revocation tests, and multi-device failure testing. |
| Self-hosting becomes expensive to support. | Test installation and upgrade documentation with users who did not write it. |
| USD 5 to 10 per user does not cover service costs or match willingness to pay. | Cost model, pricing interviews, and paid beta results. |
| Open-source and hosted editions drift. | One release process and an explicit, reviewed feature matrix if differences emerge. |

## 16. Documentation policy

Documentation is part of each deliverable, not a cleanup phase. A behavior change is incomplete until the relevant user or engineering document changes with it.

Internal engineering truth is organized under `docs/product`, `docs/architecture`, `docs/security`, `docs/design`, `docs/engineering`, and `docs/decisions`. The current index is [docs/README.md](../README.md).

Task-oriented public documentation belongs in `website/docs` when the commands and workflows exist. Marketing content belongs in `website/landing` when real product output and recordings exist. Command reference is generated from command definitions. Future API reference is generated from one authoritative OpenAPI contract.

Do not create empty documents for speculative features. Add public guides, API reference, deployment runbooks, integrations, and website content with the behavior they document.

Each engineering document must state:

- Status: proposed, accepted, superseded, or obsolete.
- Last updated date.
- The evidence or decision it records.
- Unknowns that still block implementation or release.

## 17. Decisions required before later milestones

Phase 1 has no unresolved product decision. Before Phase 2 persists user secrets, accept the cryptographic protocol after vectors and independent review, and verify fail-closed OS credential storage and SQLite behavior on supported targets.

Before team synchronization, select authentication, sessions, device verification, transport, and recovery-provider details. Before public release, select the open-source boundary, license, contribution governance, and private security-reporting channel.

## 18. Definition of done

A requirement is done only when:

- Its acceptance behavior is documented.
- Implementation and failure handling are complete.
- Relevant automated tests have been run successfully.
- Security and privacy implications have been reviewed.
- User-facing and operational documentation reflects observed behavior.
- Unsupported cases and remaining limits are stated explicitly.

Passing unit tests alone does not prove deployment, synchronization, recovery, or security behavior. Each release gate requires the evidence named in this document.
