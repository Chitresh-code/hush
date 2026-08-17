# Hush Testing Strategy

Status: Proposed  
Last updated: 2026-08-17  
Evidence: [Threat model](../security/threat-model.md), [sync protocol](../architecture/sync-protocol.md), and [TUI specification](../design/tui-ux-spec.md)  
Implementation evidence: [`test`](../../test)

## 1. Principle

Use the smallest test layer that can prove the behavior. Security, platform, database, network, deployment, and documentation claims require checks at the boundary where they can fail.

Test doubles isolate unavailable systems but do not prove real macOS, cryptographic-library, database, network, identity-provider, CI, or deployment behavior.

## 2. Test layers

| Layer | Proves | Examples |
| --- | --- | --- |
| Unit | Pure validation, parsing, state transition, and deterministic encoding | `.env` grammar, identifiers, version rules, redaction |
| Component | One real boundary with controlled dependencies | vault tampering, atomic files, key-store adapter, terminal guard |
| Integration | Several real components and persistence or protocol behavior | vault restart, database transaction, sync idempotency |
| End to end | User-visible behavior through the built application | import, run, history, device enrollment, conflict resolution |
| Platform | Behavior specific to supported macOS versions and terminals | permissions, signals, key storage, clipboard, process inspection |
| Deployment | Running service configuration and dependencies | migration, backup restore, health, tenant isolation |
| Security review | Design and implementation resistance to abuse | protocol vectors, manual review, penetration testing |

## 3. Local-alpha checks

### `.env` parser

- Valid documented syntax and newline variants.
- Empty, duplicate, malformed, quoted, escaped, and comment cases.
- Shell substitutions, command separators, redirections, expansions, and embedded nulls remain inert or are rejected.
- File, line, entry, key, and value limits.
- Invalid UTF encoding policy after it is selected.
- Fuzzing with bounded memory and time.

### Vault

- Create, lock, unlock, restart, and concurrent access policy.
- Wrong key and wrong credential.
- Tampered header, metadata, ciphertext, tag, key envelope, and version.
- Truncation and appended garbage at every boundary.
- Interrupted write and migration.
- File replacement, symlink, path, and permission behavior on macOS.
- Rollback to a copied older vault.
- Unsupported format and suite downgrade.

### Process execution

- Direct executable invocation without shell evaluation.
- Exact environment selection and inheritance policy.
- Spawn error, cancellation, signals, non-zero exit, and child tree cleanup policy.
- No secret in command arguments, logs, errors, or test failure output.
- Terminal restoration after success, failure, signal, and panic.

### TUI

- Concealed values, focus, selection, keyboard-only actions, help, narrow terminal, and no-color mode.
- Pending edit confirmation on close or quit.
- Reveal and copy scope.
- Offline, locked, error, conflict, revoked, and incompatible states.
- Snapshot tests only for stable layout contracts. Behavior tests remain primary.

## 4. Cryptographic checks

- Published test vectors for selected primitives.
- Project vectors for every envelope and approval message.
- Round trip across supported format versions.
- Tamper each authenticated field independently.
- Wrong organization, resource, recipient, device, parent, version, and key epoch.
- Nonce or construction-input uniqueness under concurrency and restart.
- Algorithm and protocol downgrade rejection.
- Recovery approval replay and challenge expiry.
- Secret and key redaction in all errors.

Fuzz parsers and state machines. Cryptographic fuzzing supplements, but does not replace, protocol review and test vectors.

## 5. Identity and authorization checks

For every service resource and action, cover:

- Missing, invalid, expired, revoked, and replayed session.
- Account without membership.
- Membership in another organization.
- Insufficient organization or project role.
- Opaque resource identifier from another organization.
- Removed member and revoked device during active session.
- Billing entitlement changes without authorization changes.
- Operator and support access paths.
- Background job, cache, export, backup, and security-event organization scope.
- The final-admin invariant and organization removal cascading to project access.
- Rejection when a collaborator belongs to another organization.
- Organization admin authority without an automatic project key envelope.
- `co_owner`, `editor`, and `viewer` allow and deny cases for every project action.

Generate a resource-action matrix from the implemented authorization policy once it exists. Do not hand-maintain duplicate permission truth.

## 6. Sync model checks

Use a deterministic state-machine model for:

- Push from current and stale base versions.
- Duplicate mutation ID with same and different content.
- Pull pagination with no gaps or duplicates.
- Reordered, delayed, duplicated, truncated, and oversized messages.
- Timeout before commit, after commit, and before client persistence.
- Concurrent devices editing the same and different entries.
- Offline queue and reconnection.
- Tombstone and restore behavior.
- Key rotation and revocation during push or pull.
- Service rollback and inconsistent views between clients.
- Unsupported client, protocol, and envelope versions.

One end-to-end scenario uses two real clients and a real supported service stack before beta claims are made.

## 7. Recovery checks

- Account recovery with an existing device.
- New-device enrollment approved by an existing device.
- Clean-device recovery with the documented recovery kit only.
- Wrong, corrupted, stolen, replaced, replayed, expired, and cross-account recovery material.
- Organization removal before and during recovery.
- Final-device removal with and without a verified recovery path.
- Destructive reset that cannot read prior ciphertext.
- Partial recovery and resumable persistence.

## 8. Data-loss and migration checks

Maintain golden files for every released local vault, envelope, and backup format. For each supported upgrade:

1. Read the prior format.
2. Migrate into a new copy.
3. Authenticate and validate all required records.
4. Simulate interruption at each write boundary.
5. Verify rollback preserves the prior copy.
6. Verify incompatible older clients fail without mutation.

Restore tests use a clean environment and documented inputs. A backup command returning success is not restoration evidence.

## 9. Logging and secret leakage checks

- Use synthetic, unmistakable canary secrets in tests only.
- Scan application output, logs, traces, crash reports, support bundles, test reports, snapshots, and CI artifacts for canaries.
- Fail tests when sensitive types use unrestricted debug or display output.
- Validate structured logging against an allowlisted schema.
- Verify errors remain useful without values, keys, credentials, or cross-tenant existence disclosure.

No production secret may enter a test fixture.

## 10. Documentation tests

Once commands exist:

- Extract or generate CLI reference from command definitions.
- Run Quickstart commands against small fixture projects.
- Verify example output semantically, allowing documented nondeterministic fields.
- Check internal and public links.
- Verify every documented option exists and deprecated options are removed together.
- Generate API reference and compatible clients from the authoritative OpenAPI contract once available.
- Run the published self-hosting and restoration procedure on a clean supported environment before release.

Public documentation is a product interface and fails CI when its runnable examples drift.

## 11. Continuous integration gates

Before merge:

- Markdown links and formatting.
- TypeScript formatting and type checking after the toolchain exists.
- Configured lints.
- Focused tests and the smallest required integration checks.
- Supported macOS tests for platform-dependent changes.
- Dependency license and vulnerability policy after dependencies exist.
- Generated documentation drift check after generators exist.

Before artifact release:

- Clean release build for every supported macOS target.
- Artifact and update-metadata signature verification.
- Installation and first-run check on clean supported environments.
- Local-alpha workflow and rollback evidence.
- Published known limitations and checks not run.

## 12. Test evidence

Record exact commands, versions, environment, results, failures, and skipped checks. A passing test in a fake environment is labeled as such. A test run interrupted before completion is not reported as passed.

No coverage percentage is required initially. Add a threshold only if it prevents an observed regression pattern rather than rewarding low-value assertions.
