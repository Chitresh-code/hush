---
title: "ADR-004: Use client-held encryption keys"
status: "Accepted"
date: "2026-08-17"
authors: "Hush maintainers"
tags: ["architecture", "security", "encryption", "recovery"]
supersedes: ""
superseded_by: ""
---

# ADR-004: Use client-held encryption keys

## Status

Accepted

## Context

Hush stores developer secrets locally and synchronizes them through self-hosted or managed services. A service-side decryption capability would increase the impact of service, operator, or data-store compromise. Users also need a truthful recovery contract.

Stakeholders are end users, organization administrators, self-hosting operators, managed-service operators, and Hush maintainers.

## Decision

- **DEC-001**: Secret values are encrypted and decrypted on enrolled devices.
- **DEC-002**: Sync services store encrypted payloads and required metadata but do not receive secret decryption keys.
- **DEC-003**: Account authentication and secret decryption are separate capabilities.
- **DEC-004**: A new device receives decryption capability from an enrolled device or a user-held recovery kit.
- **DEC-005**: Account recovery alone cannot decrypt existing secrets.
- **DEC-006**: If all enrolled devices and the recovery kit are lost, the affected secrets are unrecoverable.

The cryptographic protocol, key hierarchy, device-enrollment exchange, and recovery-kit encoding require separate review before implementation.

## Consequences

### Positive

- **POS-001**: Service and data-store compromise does not directly disclose secret values.
- **POS-002**: Self-hosted and managed services can use the same secret-visibility boundary.
- **POS-003**: Users receive an explicit statement of who can decrypt their data.

### Negative

- **NEG-001**: Hush support cannot restore secrets after all decryption material is lost.
- **NEG-002**: Device enrollment, revocation, and key rotation become security-critical protocols.
- **NEG-003**: Server-side secret search, validation, and transformation are unavailable.
- **NEG-004**: Encrypted payloads and observable metadata remain vulnerable to deletion, rollback, and traffic analysis.

## Alternatives Considered

### Service-held decryption keys

- **ALT-001**: **Description**: The service stores or can derive keys needed to decrypt user secrets.
- **ALT-002**: **Rejection Reason**: A service, operator, or key-store compromise could expose secrets across users or organizations.

### Password-derived encryption without device enrollment

- **ALT-003**: **Description**: Every device derives the vault key directly from an account password.
- **ALT-004**: **Rejection Reason**: Password changes, weak passwords, online authentication, and offline vault attacks become coupled in a fragile recovery model.

### No recovery mechanism

- **ALT-005**: **Description**: Only currently enrolled devices can authorize another device.
- **ALT-006**: **Rejection Reason**: Loss of the last device would cause avoidable data loss. A user-held recovery kit preserves the non-custodial boundary.

## Implementation Notes

- **IMP-001**: Show the recovery kit during initial secure setup and require a verification step before relying on synchronization.
- **IMP-002**: Never upload recovery material in a form the service can use to decrypt secrets.
- **IMP-003**: Bind encrypted records to organization, project, environment, entry, and version identifiers through authenticated metadata.
- **IMP-004**: Test lost-device, revoked-device, recovery-kit, rotation, rollback, and corrupted-payload paths.

## References

- **REF-001**: [Hush security model](../security/security-model.md)
- **REF-002**: [Hush threat model](../security/threat-model.md)
- **REF-003**: [Hush architecture](../architecture/solution-architecture.md)
