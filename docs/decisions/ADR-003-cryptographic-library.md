---
title: "ADR-003: Use libsodium for client cryptography"
status: "Proposed"
date: "2026-08-17"
authors: "Hush maintainers"
tags: ["architecture", "security", "cryptography", "dependency"]
supersedes: ""
superseded_by: ""
---

# ADR-003: Use libsodium for client cryptography

## Status

Proposed

## Context

The TypeScript client needs authenticated payload encryption, signatures, recipient key wrapping, secure randomness, and versioned protocol messages. The implementation must use reviewed constructions and remain interoperable with a future Rust-backed service without sharing private keys with that service.

## Decision

- **DEC-001**: Use the standard `libsodium-wrappers` package for client cryptography. Do not use the `sumo` build unless an accepted requirement needs an API unavailable in the standard build.
- **DEC-002**: Map the current protocol proposal to XChaCha20-Poly1305 authenticated encryption, Ed25519 signatures, and sealed boxes with separately signed Hush metadata.
- **DEC-003**: Keep the wire format independent from library serialization and bind suite, organization, project, environment, recipient, key epoch, and version metadata as authenticated data.
- **DEC-004**: Use `@napi-rs/keyring` as the proposed Node.js binding to the operating-system credential store for device private material and session credentials. Fail closed when protected storage is unavailable or denied.
- **DEC-005**: Do not require a separate Hush passphrase for the local alpha. Add passphrase-based recovery only with a reviewed recovery requirement and versioned Argon2id parameters.
- **DEC-006**: Do not accept this record or persist user secrets until protocol vectors pass, key-store behavior is proven on supported macOS targets, and an independent reviewer approves the protocol mapping.

## Consequences

### Positive

- The standard libsodium API avoids custom primitives and provides portable TypeScript bindings.
- A versioned envelope can interoperate with remote components in another language.
- The operating-system credential store keeps device private material outside `~/.hush`.

### Negative

- JavaScript runtimes can copy sensitive buffers, so memory clearing is best effort rather than a complete guarantee.
- The keyring binding is a native dependency whose artifacts and macOS behavior require verification.
- The proposed library does not prove the Hush protocol correct.

## Validation

Phase 1 may proceed without secret persistence. Phase 2 remains blocked until published and Hush-specific vectors pass, protected storage fails closed, install artifacts work on supported targets, and independent review finds no unresolved design blocker.

## References

- [libsodium.js](https://github.com/jedisct1/libsodium.js/)
- [libsodium documentation](https://doc.libsodium.org/)
- [napi-rs keyring](https://github.com/Brooooooklyn/keyring-node)
- [Apple keychain guidance](https://developer.apple.com/documentation/Technotes/tn3137-on-mac-keychains)
- [Cryptographic protocol](../security/cryptographic-protocol.md)
- [Key management](../security/key-management.md)
