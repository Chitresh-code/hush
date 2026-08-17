# Hush Sync Protocol

Status: Proposed  
Last updated: 2026-08-17  
Evidence: [Solution architecture](solution-architecture.md), [data model](data-model.md), and [ADR-004](../decisions/ADR-004-server-blind-encryption.md)  
Implementation evidence: None

## 1. Purpose

The sync protocol moves authenticated encrypted versions between enrolled devices through a service that cannot decrypt them. It preserves local work, enforces organization authorization, detects concurrency, rejects replay where required, and fails safely across incompatible clients.

This document defines semantics. It does not select HTTP, RPC, serialization, endpoint names, status codes, or numeric limits.

## 2. Required properties

- Confidentiality and integrity of transport metadata in transit.
- End-to-end confidentiality and integrity of secret payloads.
- Server-side authentication and organization authorization for every operation.
- Explicit base versions and conflict responses.
- Idempotent retry behavior for submitted mutations.
- Ordered, resumable pulls without silent gaps.
- Explicit protocol and encrypted-envelope versions.
- Device and membership revocation for future access.
- Bounded request, response, record, batch, and retention sizes.

## 3. Conceptual envelope

An encrypted mutation contains authenticated fields equivalent to:

| Field | Purpose | Server visibility |
| --- | --- | --- |
| Protocol version | Select request semantics | Visible |
| Envelope version | Select cryptographic decoding | Visible |
| Organization ID | Scope authorization and storage | Visible |
| Resource ID | Address an opaque project or environment | Visible |
| Base version | Enforce optimistic concurrency | Visible |
| Mutation ID | Make submission idempotent | Visible |
| Author device ID | Verify active device context | Visible |
| Ciphertext | Protect names, values, and change content | Opaque |
| Wrapped keys | Permit authorized devices to decrypt | Opaque to service |
| Authenticated metadata | Bind routing and version fields to ciphertext | Visible but tamper-evident to clients |

Exact fields and signatures depend on the accepted cryptographic protocol.

## 4. Push semantics

1. The client authenticates its account and active device context.
2. The client creates an immutable local mutation against a known base version.
3. The client encrypts and authenticates the mutation locally.
4. The client submits it with a unique mutation ID.
5. The service validates authentication, device state, organization membership, resource permission, schema, size, protocol version, and base version.
6. The service conditionally appends the mutation in one transaction.
7. The service returns the accepted version and next cursor.
8. The client atomically records the accepted state.

Submitting the same mutation ID with identical content returns the prior accepted result. Reusing it with different content is rejected and recorded as a security event.

## 5. Pull semantics

1. The client supplies an organization-scoped opaque cursor and supported protocol range.
2. The service validates account, device, membership, and resource access again.
3. The service returns an ordered bounded batch plus the next cursor.
4. The client validates envelope version, authenticated metadata, ciphertext integrity, parent relationships, and local compatibility.
5. The client writes the new state atomically, then advances its cursor.

A cursor is not authorization evidence and does not grant access to data after revocation.

## 6. Conflict semantics

A mutation conflicts when its base version is no longer current for the same mutation scope.

- The service returns current opaque version metadata and does not accept the stale mutation.
- The local mutation remains intact.
- The client downloads and authenticates the current encrypted state.
- The user or deterministic client rule resolves the plaintext change locally.
- Resolution creates a new mutation based on the current accepted version.

The initial release does not automatically merge two secret-value changes. Metadata-only merge rules require explicit tests and documentation before use.

## 7. Offline behavior

- Local edits remain pending while offline.
- The client may queue several local mutations but must preserve their base relationships.
- Reconnection pulls remote versions before pushing when the local cursor may be stale.
- Failed synchronization never blocks local read or run workflows for already available data.
- The TUI distinguishes local, pending, synced, conflicted, revoked, and unavailable states.

## 8. Revocation and key rotation

- The service denies revoked devices and removed memberships before returning later envelopes.
- Revocation cannot erase data already received by an authorized device.
- A currently authorized device rotates affected environment keys for subsequent versions.
- Replacement key envelopes are created only for remaining authorized devices and recovery recipients.
- The service rejects new mutations from a revoked device even if they were prepared before revocation.

Whether rotation re-encrypts history or only protects future versions remains unselected. The user-facing promise must match the chosen behavior.

## 9. Retry, replay, and timeout behavior

- Connect, request, and overall operation timeouts are separate and bounded.
- Automatic retries apply only to idempotent reads or mutation IDs with stable content.
- Retry delay uses bounded exponential backoff with jitter.
- Authentication, authorization, validation, conflict, and incompatibility failures are not automatically retried.
- Server replay windows and idempotency retention exceed the maximum supported client retry window.
- Clients never interpret a timeout as acceptance. They query mutation status or retry with the same ID.

Numeric values require measurements and deployment evidence.

## 10. Compatibility

- Client and service advertise supported protocol ranges.
- Requests outside the overlapping range fail without mutation.
- Encrypted envelope versions evolve independently from transport versions.
- Clients preserve unknown encrypted records but do not decrypt or apply unsupported formats.
- Mandatory security migrations may establish a minimum client version with an explicit upgrade path.

## 11. Abuse controls

Before internet exposure, define and test:

- Per-account, device, organization, and source rate limits.
- Request, field, ciphertext, envelope, and batch limits.
- Cursor and mutation-ID validation.
- Authentication failure throttling without account enumeration.
- Storage quotas and protection from ciphertext amplification.
- Audit events for device, membership, key-envelope, replay, and authorization failures.

Controls must not log secret content or raw encrypted payloads unnecessarily.

## 12. Protocol verification

Required test scenarios include:

- Duplicate, reordered, delayed, truncated, malformed, and oversized messages.
- Concurrent writes from two authorized devices.
- Timeout before and after server commit.
- Stale cursor and stale base version.
- Revoked device and removed membership during an active session.
- Cross-organization resource identifiers.
- Unsupported protocol and envelope versions.
- Tampered routing metadata, ciphertext, and key envelopes.
- Server rollback to an older accepted state.
- Interrupted local persistence after server acceptance.

## 13. Decisions still required

1. Mutation scope and version granularity.
2. Transport, serialization, and authentication binding.
3. Cursor construction and retention.
4. Conflict-resolution UX and metadata merge rules.
5. Rotation treatment of history.
6. Numeric size, rate, timeout, retry, quota, and batch limits.
7. Minimum service and client compatibility policy.

