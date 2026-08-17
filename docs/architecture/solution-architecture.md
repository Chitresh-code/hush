# Hush Solution Architecture

Status: Proposed  
Last updated: 2026-08-17  
Evidence: [Product requirements](../product/PRD.md), [terminology](../product/terminology.md), and accepted [decision records](../decisions/README.md)  
Implementation evidence: None, the repository contains no application code

## 1. Purpose

Hush is a macOS-first, local-first secrets and environment manager. A TypeScript TermUI client manages an encrypted local vault, injects secrets into child processes, and later synchronizes encrypted records through a Rust-backed remote API.

The architecture keeps account authentication separate from secret decryption. Services authenticate accounts, enforce organization membership, and store encrypted payloads. Enrolled devices hold the keys required to decrypt secret values.

## 2. Architectural principles

1. Local workflows remain useful without a network connection.
2. Plaintext is created only on an authorized device for a specific user action.
3. The service cannot decrypt secret payloads or recovery material.
4. Organization is the root ownership and authorization boundary.
5. Concurrent writes never resolve silently.
6. Self-hosted and managed deployments share server behavior.
7. Formats and protocols are explicitly versioned and fail closed.
8. One npm package is sufficient until a real second consumer or independent release boundary justifies a split.

## 3. Runtime components

### 3.1 Local application

The local application contains:

| Component | Responsibility | Boundary |
| --- | --- | --- |
| CLI/TUI | Parse commands, render state, capture input, and show explicit confirmations | Does not own encryption, persistence, or authorization rules |
| Application core | Validate use cases and coordinate projects, environments, entries, versions, and commands | Does not depend on terminal rendering |
| Vault | Authenticate, decrypt, encrypt, version, and atomically persist local records | Never treats unauthenticated data as valid |
| Platform adapter | Manage macOS terminal state, key storage, file permissions, clipboard, signals, and child processes | Reports unsupported behavior instead of hiding it |
| Sync client | Authenticate the account, exchange encrypted versions, and surface conflicts | Treats every network response as untrusted |

These are module responsibilities, not mandatory crates or interfaces.

### 3.2 Sync service

The service contains:

| Component | Responsibility | Explicit limit |
| --- | --- | --- |
| Identity boundary | Authenticate accounts and service identities and manage sessions | Account recovery does not recover secret keys |
| Authorization boundary | Resolve organization membership, project membership, roles, and resource scope | Client-provided tenant or role claims are never authoritative |
| Device registry | Store device identity, public keys, state, and revocation status | Never receives device private keys |
| Sync API | Validate envelopes, concurrency preconditions, versions, and limits | Cannot inspect secret plaintext |
| Persistence | Store server-required metadata, ciphertext, key envelopes, and security events | Every record is organization scoped |

Exact service framework, database, identity provider, and wire protocol are unselected.

### 3.3 Managed-service operations

The managed service adds tenant provisioning, billing, monitoring, backups, restoration, incident response, and support tooling around the same sync service. Billing changes entitlements, not resource authorization. Operator access requires explicit, audited elevation and cannot reveal secret plaintext.

### 3.4 Self-hosted operations

The first self-hosted topology is assumed to be one Hush service and one supported data store. Whether a self-hosted instance permits one or several organizations remains unconfirmed. The server-blind encryption boundary is identical to the managed service.

## 4. Data zones

| Zone | May contain plaintext secrets | May contain decryption keys | Principal with access |
| --- | --- | --- | --- |
| TUI process memory | Temporarily | Temporarily | Local authorized user and processes with equivalent OS privilege |
| OS-protected key storage | No secret values | Device private key or protected unlock material | Enrolled local account subject to macOS controls |
| Local vault file | No | Wrapped key material only | Any reader gets ciphertext; authorized device can unlock |
| Child-process environment | Yes, selected values | No | Started process and same-privilege inspection allowed by macOS |
| Clipboard | Temporarily, after explicit copy | No | Clipboard owner, clipboard managers, and authorized local processes |
| Sync service and service data store | No | Public keys and wrapped keys only | Service and operators according to operational controls |
| Backup | No | Wrapped keys only | Backup operators receive encrypted service data |

Memory, clipboard, and child-process boundaries cannot provide protection from a fully compromised user session. Hush must minimize exposure and state the limitation.

## 5. Core local flows

### Unlock

1. The user requests access to the local vault.
2. The platform adapter obtains device-protected material through the accepted macOS mechanism.
3. The vault authenticates its header and key envelope before decoding records.
4. The vault exposes only data required for the requested view or action.
5. The application locks after the configured idle boundary and discards available plaintext material where the selected libraries permit it.

The proposed OS credential-store binding is `@napi-rs/keyring`, with no separate Hush passphrase for local alpha. Phase 2 remains blocked until fail-closed behavior is observed on supported macOS targets.

### Import

1. The user names a file explicitly.
2. Hush reads it as inert bytes under documented size limits.
3. The parser accepts only the documented `.env` grammar and never invokes a shell.
4. Hush shows keys and change types with values concealed.
5. User confirmation creates a new encrypted local version.

### Run

1. The user chooses a project, environment, and executable.
2. Hush resolves and decrypts the selected version.
3. Hush starts the executable directly with an explicit environment.
4. Hush propagates signals and the child's exit status.
5. Hush restores terminal state and discards temporary material after exit.

Shell evaluation is outside the first execution model.

## 6. Identity, organizations, and devices

- A user authenticates to the service.
- An organization owns all collaborative resources.
- An organization membership connects a user to one organization with the server-owned `admin` or `member` role.
- A project belongs to exactly one organization.
- A project membership connects an active organization member to one project with `co_owner`, `editor`, or `viewer` access.
- An enrolled device has registered public key material and locally protected private key material.
- A project, environment, entry, version, key envelope, service identity, and security event belongs to one organization.
- Account recovery restores authentication only.
- Secret recovery requires an enrolled device or the user's recovery kit.

A single-user workspace uses an organization with one member. This avoids a second ownership and authorization model.

## 7. Encryption boundary

Human-readable secret names and values should be encrypted when the service does not need them for authorization or synchronization. The service may observe account and organization identifiers, memberships, access relationships, opaque resource identifiers, public device keys, ciphertext sizes, versions, timestamps, request timing, network metadata, and security events.

The exact encrypted envelope and key hierarchy are specified in [cryptographic protocol](../security/cryptographic-protocol.md) and [key management](../security/key-management.md). Those documents define requirements but cannot select a library or final construction without review evidence.

## 8. Synchronization boundary

The local vault remains authoritative for offline work. The service coordinates accepted organization versions but never chooses a plaintext merge.

- A push includes the client's base version and an idempotency identifier.
- The service accepts the mutation only when authorization and concurrency preconditions hold.
- A stale base version produces a conflict response.
- A pull returns ordered encrypted changes after a validated cursor.
- Clients authenticate envelopes before applying them locally.
- Unsupported protocol or envelope versions fail without modifying the local vault.

See [sync protocol](sync-protocol.md) for the state model and failure behavior.

## 9. Compatibility and migration

Version these contracts independently:

- Local vault format.
- Encrypted payload envelope.
- Wrapped-key envelope.
- Sync protocol.
- Backup format.
- Client compatibility range.

A migration writes a new copy, authenticates and validates it, then switches the active reference. It never overwrites the only verified copy. Rollback must not cause accepted security or data migrations to be interpreted by an older incompatible client.

## 10. Failure behavior

| Failure | Required behavior |
| --- | --- |
| Wrong unlock material or tampered vault | Return no plaintext and preserve the source for diagnosis |
| Interrupted write or migration | Keep the prior verified copy or the complete new copy |
| Network timeout | Preserve local work and report synchronization as incomplete |
| Concurrent write | Surface a conflict with non-secret context |
| Expired or revoked session | Stop synchronization and require authentication |
| Revoked device | Deny future envelopes and rotate affected keys according to policy |
| Unknown format or protocol version | Fail closed without mutation |
| Child-process failure | Propagate status, release resources, and restore the terminal |
| Lost devices and recovery kit | State that secrets are unrecoverable and offer destructive account reset only |

Retries are bounded and limited to operations that are idempotent or carry replay protection.

## 11. Observability

Allowed operational fields require a reviewed schema. Candidate fields are operation name, outcome category, duration, opaque correlation identifier, client version, protocol version, and non-sensitive opaque resource identifiers.

Logs, metrics, traces, analytics, crash reports, and support tooling must not contain secret names, secret values, plaintext payloads, child-process environments, device private keys, recovery material, access tokens, or raw imported files.

Client telemetry is opt-in. Managed-service operational telemetry is required, documented, minimized, and retained for a defined period.

## 12. Deployment views

### Local alpha

One macOS process, one encrypted local vault, and OS-protected key material. No account or network dependency is required for local-only use.

### Team beta

The local application adds account authentication and synchronization. Services persist organization-scoped ciphertext, device public keys, key envelopes, versions, and security events.

### Managed service

The team service adds multi-tenant operations and billing. Tenant isolation applies to every request, query, job, cache, backup, export, log, and operator action.

## 13. Decisions still required

1. Final cryptographic protocol acceptance after vectors and independent review.
2. Observed macOS credential-store behavior before secret persistence.
3. Authentication protocol, session model, and account recovery provider.
4. Sync transport, serialization, limits, and conflict-resolution UX.
5. Self-hosted database, organization count, upgrade, backup, and restore contract.
6. Open-source boundary, license, governance, and public security channel before public release.
