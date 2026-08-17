# Hush Cryptographic Protocol

Status: Proposed  
Last updated: 2026-08-17  
Evidence: [ADR-004](../decisions/ADR-004-server-blind-encryption.md), [security model](security-model.md), and [sync protocol](../architecture/sync-protocol.md)  
Implementation evidence: None

## 1. Scope

This specification defines the properties, key roles, envelopes, authentication bindings, and failure behavior required for server-blind synchronization. It intentionally does not name final algorithms or a library. Those selections require current authoritative guidance, implementation support, test vectors, and independent review recorded in [ADR-003](../decisions/ADR-003-cryptographic-library.md).

No implementation may claim conformance while required fields or primitive choices remain unresolved.

## 2. Security goals

- The service cannot decrypt secret names, values, or version content.
- A service or data-store attacker cannot substitute ciphertext, keys, devices, recipients, organization scope, or version metadata without detection by an authorized client.
- Compromise of one environment key does not disclose unrelated environments.
- Revocation prevents access to future versions after required rotation.
- Loss of every device and recovery secret makes the affected data unrecoverable.
- Protocol and algorithm downgrades fail closed.

## 3. Non-goals

- Protect plaintext from a compromised authorized endpoint while it is in use.
- Revoke data already copied by a previously authorized device.
- Hide traffic timing, record size, account membership, or device activity from the service.
- Provide server-side search or validation over plaintext.
- Invent cryptographic primitives.

## 4. Key roles

| Key | Purpose | Generated | Stored |
| --- | --- | --- | --- |
| Device identity key material | Authenticate a device and authorize device operations or key grants | On device | Private material in macOS protected storage; public material on service |
| Recovery key material | Approve replacement device authority when no enrolled device remains | On device during recovery-kit setup | User-held recovery kit; public or verification material may be stored by service |
| Environment key | Protect data keys and define a rotation boundary | On authorized device | Wrapped to authorized devices and recovery recipients |
| Data key | Encrypt one immutable payload or bounded record set | On authorized device | Stored only in wrapped form with ciphertext |
| Transport credentials | Authenticate network sessions | According to chosen authentication protocol | Client and service credential stores |

Signing, key agreement, and key wrapping may require distinct key pairs. The selected suite must keep roles separate where cross-protocol use would be unsafe.

## 5. Device authority

Account authentication alone does not establish a decrypting device.

- The first device creates device identity material and user-held recovery authority locally.
- A later device is approved by an enrolled device or the recovery authority.
- Approval binds the account, new device public material, protocol version, and a fresh challenge.
- The service verifies approval but cannot create it.
- Sharing binds recipient device authority to an invitation or verification ceremony that prevents service-side key substitution.

The exact first-contact and out-of-band verification flow remains a required protocol decision. Trusting an unverified public key returned only by the service does not satisfy this specification.

## 6. Payload encryption

For every immutable payload:

1. Generate a fresh data key using an approved cryptographic random source.
2. Generate nonce or synthetic-IV input exactly as required by the selected authenticated-encryption construction.
3. Encode plaintext through one deterministic, versioned serializer.
4. Authenticate protocol version, organization ID, resource ID, version ID, parent version, payload type, and key identifier as associated data or an equivalent binding.
5. Encrypt once under the fresh data key.
6. Wrap the data key under the current environment key.
7. Persist ciphertext, authenticated routing metadata, and wrapped keys atomically.

Nonce reuse under a key is prohibited when the selected construction requires uniqueness. The implementation must make misuse difficult by construction and test it.

## 7. Environment-key distribution

- An authorized client wraps the environment key separately for each authorized device or recovery recipient.
- Each envelope binds recipient identity, environment scope, key epoch, protocol version, and granting device authority.
- The service stores envelopes but cannot unwrap them.
- A client rejects envelopes for another organization, environment, device, key epoch, or unsupported version.
- A grant does not become usable until its authorization and granting-device proof are validated.

Per-device envelopes have a linear storage and rotation cost in authorized devices. This is accepted for the initial small-team scope. A group-key scheme requires a new reviewed protocol if measured scale makes the cost unacceptable.

## 8. Envelope structure

The final binary or textual encoding must include equivalent authenticated fields:

| Field | Requirement |
| --- | --- |
| Format identifier | Unambiguous Hush envelope type |
| Protocol version | Exact semantic version or monotonic protocol identifier |
| Algorithm suite | Explicit accepted suite with no implicit fallback |
| Organization and resource scope | Opaque identifiers bound to ciphertext |
| Payload and key identifiers | Unique identifiers bound to expected key roles |
| Version and parent | Immutable history and rollback context |
| Key epoch | Rotation boundary |
| Recipient identity | Required for wrapped-key envelopes |
| Nonce or construction input | Generated and validated according to the suite |
| Ciphertext | Authenticated encrypted content |
| Authorization proof | Device or recovery authority when required |

Parsing is bounded, canonical, and complete before any cryptographic operation uses fields. Unknown mandatory fields or versions cause rejection without local mutation.

## 9. Rollback and replay protection

Authenticated encryption alone does not prove freshness.

- Clients retain the highest accepted version or signed checkpoint needed to detect service rollback.
- Every push names a base version and stable mutation ID.
- A mutation ID cannot authorize different content.
- Envelopes bind their version and parent relationship.
- Key epochs increase monotonically within their scope.
- Recovery and device-approval challenges are fresh, single use, and expire.

The exact checkpoint and multi-device consistency design remains unresolved. A malicious service equivocation threat must be included in independent review.

## 10. Rotation and revocation

Rotation creates a fresh environment key epoch and new envelopes for remaining authorized devices and recovery recipients.

Required triggers include:

- Device revocation or membership removal when the principal had access.
- Suspected key exposure.
- Cryptographic-suite migration.
- Organization access-scope reduction where existing envelopes exceed the new scope.

Revocation protects later versions after rotation. Previously authorized devices may retain earlier keys and plaintext. Re-encrypting history is a separate, expensive operation and must not be implied unless implemented and verified.

## 11. Recovery protocol

- Recovery material is generated and verified locally.
- The service never receives material sufficient to decrypt a recovery envelope.
- Recovery approval binds a fresh device identity, account, challenge, and protocol version.
- Recovery does not silently restore revoked organization access.
- Organization membership and current authorization are revalidated before the service returns envelopes.
- Recovery creates security events without including keys or secrets.

See [account recovery](account-recovery.md).

## 12. Error behavior

The client returns no partial plaintext when parsing, authentication, authorization proof, unwrap, decryption, version, scope, or parent validation fails. It preserves the original input for controlled diagnosis without logging the payload.

Externally visible errors do not distinguish sensitive details that enable account, resource, device, or key enumeration. Local diagnostics may identify the failed validation stage without values or key material.

## 13. Validation requirements

Before acceptance:

- Select maintained, reviewed libraries with safe high-level APIs.
- Use published test vectors for every selected primitive.
- Add Hush vectors for payload, key-envelope, device-approval, rotation, and recovery formats.
- Test tampering of every authenticated field and truncation at every boundary.
- Test wrong key, wrong scope, wrong recipient, wrong epoch, nonce misuse, replay, rollback, unsupported version, and downgrade attempts.
- Fuzz parsers and envelope state transitions with bounded resources.
- Verify secret and key redaction in every error path.
- Obtain independent protocol and implementation review before team beta.

## 14. Unresolved protocol choices

1. Primitive suite and library.
2. Canonical serialization and envelope encoding.
3. Device signing, key agreement, and key-wrapping key roles.
4. First-contact recipient-key verification.
5. Client checkpoint and service-equivocation detection.
6. Passphrase and macOS protected-storage relationship.
7. Rotation treatment of history.
8. Recovery-kit representation, verification, and storage guidance.

