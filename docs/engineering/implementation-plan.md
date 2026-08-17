# Hush Implementation Plan

Status: Phase 1 in progress  
Last updated: 2026-08-17  
Evidence: [PRD](../product/PRD.md), [threat model](../security/threat-model.md), [TUI specification](../design/tui-ux-spec.md), and [decision records](../decisions/README.md)  
Implementation evidence: [`package.json`](../../package.json), [`src`](../../src), and [`test`](../../test)

## 1. Delivery rule

Build vertical slices. Do not scaffold synchronization, billing, public documentation, integrations, or a plugin system before the local workflow and security boundaries are validated.

## 2. Resolved decisions

The former Phase 0 product decisions are resolved:

1. The local client is TypeScript with TermUI and is distributed as `@chitresh-code/hush` with a `hush` executable.
2. The local alpha targets macOS 14 or later on Apple silicon and Intel. Linux and Windows remain unsupported until tested.
3. One user-level `~/.hush` directory owns all Hush local state. Hush never creates a project-level `.hush` directory.
4. SQLite at `~/.hush/hush.db` stores encrypted domain records and sync state. `config.json` and `ui-state.json` store non-secret configuration and UI state.
5. Organization membership and direct project collaborator roles define authorization. There is no Team entity.
6. The source repository and early package are public, but no open-source license has been granted. Open-source scope and contribution governance remain deferred. Security reports use GitHub private vulnerability reporting.

The proposed cryptographic suite and OS credential-store binding are sufficient to begin a skeleton that stores no secrets. They are not accepted for secret persistence until the Phase 2 gate passes.

## 3. Phase 1: safe TypeScript and TermUI skeleton

Create the smallest runnable npm package with:

- TypeScript, the current supported Node.js LTS line, and a committed lockfile.
- A `hush` package executable and local `npm pack` installation check.
- TermUI core, widgets, UI, JSX, store, TSS, router, motion, data, and adapters only where exercised by the initial application shell.
- `@termuijs/testing` for renderer tests and direct `tsx` execution for interactive development.
- A responsive application shell with navigation, theme tokens, visible key hints, no-color, no-motion, and no-Unicode behavior.
- Startup creation and validation of the user-level `~/.hush` layout without secret persistence.
- Domain types for User, Organization, OrganizationMembership, Project, ProjectMembership, Environment, and the accepted roles.
- A terminal lifecycle guard and clean process shutdown.

Do not add encryption, keychain writes, remote APIs, authentication, GitHub integration, AI, vector search, secret persistence, or project mutation in this phase.

Exit evidence:

- `npm pack` installs and starts the `hush` executable in a clean test location.
- TermUI renderer tests cover navigation, focus, keyboard actions, responsive widths, and capability fallbacks.
- A process-level harness verifies terminal restoration after normal exit, error, cancellation, signal, and uncaught failure on the supported terminal matrix.
- Directory tests prove state is created only under an isolated test home and never in the working project.
- Unsupported platforms receive an explicit message.
- Exact commands, versions, environments, observed results, and skipped checks are recorded.

## 4. Phase 2: encrypted local vault

Before storing a user secret:

- Complete independent review of the cryptographic protocol and Hush-specific vectors.
- Prove `@napi-rs/keyring` installation and fail-closed protected-storage behavior on supported macOS targets.
- Prove `better-sqlite3` packaging, permissions, crash behavior, journals, migrations, and concurrent-access policy.
- Create device keys through accepted OS protected storage.
- Implement the versioned authenticated envelope, create, lock, unlock, read, and atomic write.
- Cover corruption, wrong key, incompatible version, rollback, and interrupted migration.

Exit evidence includes published and Hush-specific vectors, synthetic plaintext leakage scans, a clean macOS user restart and unlock, and no unresolved independent-review blocker.

## 5. Phase 3: first useful local workflow

Build one complete path:

1. Create a project and environment.
2. Add one secret through masked input.
3. Lock and reopen the vault.
4. Run a directly executed child process with the selected environment.
5. Propagate child status and restore the terminal.

The child receives values through its environment, never a generated `.env` file or command argument. Cover cancellation, signals, spawn failure, non-zero exit, and redaction.

## 6. Phase 4: local alpha completion

Add separate slices for strict inert `.env` import, explicit export, concealed CRUD, reveal and clipboard behavior, immutable history, restore-as-new-version, measured automatic lock, status and diff without values, help, and accessibility states.

## 7. Phase 5: user and organization foundation

Only after local alpha gates pass:

- Implement user authentication and session lifecycle.
- Create a single-member organization for an individual user.
- Implement OrganizationMembership with `admin` and `member`.
- Implement ProjectMembership with `co_owner`, `editor`, and `viewer`.
- Enforce that collaborators are active members of the owning organization.
- Implement device registration without granting decryption authority from login alone.
- Add security events for user, device, membership, project, and role changes.

Every resource and asynchronous path must reject cross-organization access before synchronization returns ciphertext or key envelopes.

## 8. Phase 6: device enrollment and sharing

Build existing-device and recovery-kit enrollment, organization invitation, project collaborator assignment, recipient key verification, per-device key envelopes, revocation, and detectable future-key rotation.

## 9. Phase 7: synchronization beta

Build authenticated versioned push and pull, transactional base-version checks, idempotency, ordered bounded cursors, offline mutations, explicit conflicts, and compatibility policy. Two real clients must resolve a conflict without silent loss.

## 10. Phase 8: self-hosted beta

Define and validate the supported topology, authentication, database, health checks, redacted observability, upgrades, rollback, backup, restore, configuration, supported versions, and security update process.

## 11. Phase 9: managed service

Add tenant operations, billing separated from authorization, operator controls, incident response, restoration drills, privacy, retention, support, and pricing validation based on observed cost.

## 12. Public release work

The Phase 1 shell is distributed publicly under an all-rights-reserved package declaration. Public visibility does not make the project open source. Before accepting external contributions or claiming stable availability, choose the open-source boundary and license, define contribution governance, complete the signed release process, and document supported behavior.

## 13. Change workflow

For every slice:

1. Link the requirement, security control, threat, and UX flow.
2. State acceptance behavior and important failures.
3. Inspect existing code and fix behavior at the shared root.
4. Implement the smallest complete path.
5. Add the smallest runnable checks that fail on regression.
6. Run formatting, static analysis, focused tests, and applicable platform checks.
7. Record actions, observed results, expected but unverified results, skipped checks, limits, and rollback.
8. Update documentation when observed behavior differs.

## 14. Phase 1 progress

The first no-secret slice is implemented with a packaged executable, TermUI application shell, user-level Hush home initialization, domain types, navigation, capability fallbacks, and focused tests.

Observed on macOS 26.3.1, Apple silicon, Node.js 24.4.0, and npm 11.13.0:

- TypeScript static analysis and compilation completed successfully.
- Nine focused tests passed across production layout, application navigation, theme selection, compact ASCII output, private local-state creation, symbolic-link rejection, option validation, and the platform boundary.
- A packed tarball installed into an isolated directory and its `hush --help` executable returned successfully.
- npm reported no known vulnerabilities in the installed dependency graph.
- `scripts/verify-terminal-restoration.sh` mounted the application under a real pty (macOS `script`, no added dependency) and confirmed terminal restoration (exit alt screen, show cursor, SGR reset) with the expected process exit code for SIGINT (130), SIGTERM (143), an uncaught exception (1), an unhandled rejection (1), and the `q` exit key (0). All five scenarios passed.

Not yet verified:

- `@termuijs/dev-server` 0.1.7 was rejected after source inspection and a runtime check showed that it pipes child stdin without forwarding terminal input. `tsx watch` also consumes stdin as its restart trigger. The supported interactive development command is `tsx src/cli.tsx`, with manual restarts after changes.
- Interactive terminal rendering and restoration observed directly in Terminal.app, iTerm2, and the VS Code integrated terminal (the process-level harness above exercises the same restoration path headlessly under a pty, not those specific terminal emulators).
- Intel macOS behavior.

Phase 1 remains in progress until the applicable terminal and process checks are observed. Phase 2 remains blocked on cryptographic review and protected-storage and SQLite evidence.

## 15. Phase 2 progress

The encrypted local vault library is implemented as `src/vault/errors.ts` (typed error hierarchy), `src/vault/envelope.ts` (AES-256-GCM authenticated envelope via `node:crypto`), `src/vault/device-key.ts` (device key lifecycle over `@napi-rs/keyring`), `src/vault/store.ts` (`better-sqlite3` schema, migrations, atomic writes, and file permissions), and `src/vault/vault.ts` (open, lock, read, write composition), plus a `database` field added to `HushHome`. As of Phase 3 (Section 16), the CLI wires this into a real user-facing path ahead of the independent-review gate below. Section 16 records the explicit decision behind that.

Observed on macOS 26.3.1, Apple silicon, Node.js 24.4.0, and npm 11.13.0:

- `npm run typecheck && npm test` passed: TypeScript strict-mode compilation with no errors, and 41 tests across 7 files, all passing.
- AES-256-GCM known-answer test vectors (`test/vault/envelope.test.ts`) were computed independently with real `node:crypto` (not mocked) and reproduced by the implementation for both encryption and decryption.
- `better-sqlite3@13.0.3` and `@napi-rs/keyring@1.3.0` installed with prebuilt native binaries for `darwin-arm64` (confirmed present under each package's `prebuilds`/platform-package directory); no native compilation step ran on this machine.
- Vault database files are created at file mode 0600, verified by a regression test (`test/vault/store.test.ts`) that opens a fresh database and asserts its mode.
- The device key never leaves `Vault` through serialization: `JSON.stringify(vault)` and `Object.keys(vault)` do not expose the raw key, verified by a regression test (`test/vault/vault.test.ts`).

### First review pass and fixes

An adversarial review was run against the vault module. This is not the second-party human cryptographic review the spec's "Independent-review gate" section requires. It is a first pass that closed gaps before the required human review. It found three verified issues, all now fixed:

- **Envelope had no associated data.** `encryptSecret`/`decryptSecret` authenticated only the ciphertext, not which row it belonged to. A vault-file writer (no key needed) could swap one secret's ciphertext into another secret's row, or delete a newer-version row to roll a rotated credential back to an old value, and GCM still reported successful authentication. Fixed by binding `(envelope_version, version, environment_id, name)` as GCM associated data (`buildAssociatedData` in `src/vault/envelope.ts`); `decryptSecret` now requires the identity and version it's decrypting for. Regression tests in `test/vault/envelope.test.ts` and `test/vault/vault.test.ts` reproduce both the ciphertext-swap and the version-rollback attack and assert `EnvelopeAuthenticationError`.
- **`writeSecret` had a version-assignment race.** The next-version read and the insert were not in one transaction, and the schema had no uniqueness constraint, so two concurrent writers could both read the same latest version and both insert the same next version. One write could be silently overwritten with no error. Fixed by wrapping the read-modify-write in `db.transaction(...).immediate()` and adding `UNIQUE(environment_id, name, version)` to the `secrets` table as a second line of defense. True multi-process concurrency under this fix is not yet empirically exercised (see below); the `UNIQUE` constraint is regression-tested directly.
- **The database path wasn't validated against symlinks the way every other `~/.hush` file is.** `openVaultDatabase` used `existsSync` (follows symlinks) with no `lstat` check, unlike `ensureDirectory`/`ensureJsonFile` in `src/hush-home.ts`. A symlinked `hush.db` could relocate the vault outside `~/.hush`, and a dangling symlink was reported as "no vault file," which could cause `resolveDeviceKey` to mint a fresh device key over orphaned encrypted rows. Fixed with a `lstat`-based `vaultFileExists` check (symlink counts as "exists" regardless of target) used both for the device-key first-run decision and inside `openVaultDatabase`, which now refuses to open anything that isn't a regular, non-symlink file.

Not yet verified:

- Real OS keychain fail-closed and prompt behavior on macOS. Tests use only `InMemoryKeyringEntry` (`test/fixtures/keyring-double.ts`), an explicitly labeled in-memory test double per `AGENTS.md`'s prohibition on exercising the real keychain in tests. No test or manual run has touched the actual macOS keychain.
- `hush.db` file permissions in a real end-to-end run outside the test harness (only observed via the test-suite temporary-home path above).
- True multi-process concurrent writes against the `.immediate()` transaction fix above. The transaction and `UNIQUE` constraint are present and a direct duplicate insert is rejected, but two real OS processes racing against the same file have not been tested.
- Independent cryptographic review of the protocol and of published and Hush-specific vectors, by a human second party. This has not happened yet and remains the hard gate the spec's "Independent-review gate" section requires before any real secret is persisted through this code. The first review pass found and closed real issues but does not satisfy this gate.

Phase 2 remains blocked on independent cryptographic review until that review completes.

## 16. Phase 3 progress

Built the first useful local workflow the spec deferred from Phase 2: `src/vault-screens.tsx` (environment selection, secret list, add/edit form with masked input, view/reveal, and a run screen), `src/ui-state.ts` (navigation and theme state, extracted from `app.tsx` to avoid a circular import with the new vault screen), `src/process/run-with-env.ts` (child-process execution with injected secrets), and two additions to the vault library itself: `listSecretNames`/`listSecrets` and `readAllSecrets` (decrypts every secret in an environment for env injection). `cli.tsx` now opens the vault before rendering and locks it in a `finally` after the TUI exits.

**Explicit risk acceptance, not a claim that the review gate is satisfied.** Section 15's "Independent-review gate" is unchanged and still unmet. Only a first-pass review has happened, not the required human second-party cryptographic review. Wiring the vault into the CLI was an explicit decision made after that gate was surfaced and discussed: the vault is only to be exercised with sample or throwaway secrets for now, not real production credentials, until the human review lands.

**A framework-level key-handling bug was found and fixed as part of this work, not scope creep.** TermUI dispatches every mounted component's key handler for every keystroke with no focus scoping (`collectInputHandlers` walks the whole fiber tree; every handler fires, unconditionally, for every key). Two consequences for a free-text secret field:
- The shell's global `exitKey: 'q'` bypasses all component-level input handling before any component sees the event, so typing a secret containing the letter "q" would have silently killed the app mid-entry. `exitKey` was removed from both `render()` call sites (`cli.tsx`, `test/fixtures/terminal-harness.tsx`); the shell now handles `q` itself via `getCurrentApp()?.exit()`, guarded the same way as every other shortcut below.
- The shell's own navigation shortcuts (`1`, `2`, `3`, `t`, `left`, `right`) would otherwise fire on every matching keystroke typed into a vault text field. `isVaultTyping()` in `src/vault-screens.tsx` reports whether the active screen is a vault free-text mode (environment name, add/edit form, run command), and every shell shortcut in `HushShell` (`src/app.tsx`) checks it before acting. Ctrl+C still force-quits unconditionally because it is a control chord, not a character a user would type as part of a secret.

Observed on macOS 26.3.1, Apple silicon, Node.js 24.4.0, and npm 11.13.0:

- `npm run typecheck`, `npm test`, and `npm run build` all passed: 52 tests across 9 files, no TypeScript errors.
- `test/vault-screens.test.tsx` drives the real TUI component tree through `@termuijs/testing` (not a mock): select an environment, add a secret, view it masked then revealed, edit it to a new version (confirmed via a direct row-count query with two versions persisted), and run a real child process (`node -e ...`, not `/bin/true` or a stub) that reads its injected environment variable and writes it to a file, asserting both the file contents and the reported exit code.
- `test/process/run-with-env.test.ts` exercises `runWithEnv` directly against real child processes: env injection, exit-code propagation, and rejection on spawn failure (nonexistent binary).

Not yet verified:

- Interactive use in a real terminal (raw mode, actual masked rendering, keychain prompt behavior on first run). The automated tests exercise the same component tree and a real spawned child process, but not a live TTY session. The user is running this manually per the risk acceptance above.
- Signal handling while a child process launched from the run screen is active (for example, Ctrl+C forwarded to the child versus the parent). `stdio: 'inherit'` gives the child the same controlling terminal as the parent, so POSIX foreground-process-group behavior should apply, but this has not been exercised under an actual signal.
- Everything already listed as unverified in §15 (real OS keychain behavior, true multi-process concurrent writes, the human independent-review gate) remains unverified; Phase 3 does not change any of it.

## 17. Phase 3 follow-up: usability fixes from real use

The user exercised the Phase 3 build interactively and reported five problems, fixed in this pass:

1. **Overview was a static placeholder.** `OverviewScreen` (`src/app.tsx`) now reads `getVaultSummary()` (`src/vault-screens.tsx`) and shows real counts: number of environments, total secrets, the currently open environment, and the environment list. It falls back to guidance text only when the vault has no environments yet.
2. **"Change environment" silently discarded the old one.** The old flow re-entered free-text mode pre-filled with the current name; typing a new name over it made the old environment look lost. It was still in the database, but no longer reachable from the UI. The replacement is a real picker: the `environment` mode lists every environment id that has at least one secret (`listEnvironmentIds`, new in `src/vault/store.ts` and `src/vault/vault.ts`), navigated with up/down and `enter`; `n` opens free-text entry for a genuinely new environment. `c` from the secret list opens the picker with the current environment pre-highlighted instead of pre-filled for editing.
3. **No way to run an external command without the TUI.** `hush -- npm run dev` (optionally `hush --env <name> -- ...`) now runs the command directly. No TUI is mounted, so the command's own output (a development server trace) is not captured behind Hush's screen. Implemented as `runDirect` and `runWithVaultEnv` in `src/cli.tsx`, reusing `runWithEnv` (which skips its raw-mode handling when no TermUI app is mounted). Without `--env`, it falls back to the last environment used in the TUI (`ui-state.json`'s `lastEnvironmentId`); with neither, it errors rather than guessing.
4. **Edit had no way back.** `writeSecret` was already versioning under the hood (confirmed by existing tests asserting row counts), but nothing in the UI exposed history. Added `listSecretVersions`, `readSecretVersion`, and `rollbackSecret` to `src/vault/vault.ts` plus a `history` screen mode (`h` from the view screen). It lists every version newest-first with its timestamp. Selecting an old version with `enter` calls `rollbackSecret`, which writes that value back as a new version instead of deleting anything. The version list only grows, so undoing an undo means selecting the other entry again. This pulls forward part of Section 6's Phase 4 "immutable history, restore-as-new-version" item at the user's explicit request, ahead of the rest of Phase 4 (clipboard and reveal-then-copy, concealed-by-default CRUD, automatic lock timers, `.env` import and export, status or diff without values, help, and accessibility states, all still undone).
5. **Visual flatness.** Added real color semantics using palette tones that already existed but went unused: run exit codes and status messages are now green (`palette.success`) or red (`palette.error`) instead of one flat color for everything, and the Overview screen uses `palette.secondary`/`bold` to give its stats visual hierarchy instead of a wall of plain text.

Files touched: `src/vault/store.ts`, `src/vault/vault.ts`, `src/vault-screens.tsx`, `src/app.tsx`, `src/cli.tsx`, plus matching tests in `test/vault/store.test.ts`, `test/vault/vault.test.ts`, `test/vault-screens.test.tsx`, `test/cli.test.ts`.

Observed: `npm run typecheck`, `npm test` (61/61 across 9 files, up from 52), and `npm run build` all passed on the same machine as Section 16. `runWithVaultEnv` is tested against a real temporary vault and a real spawned child process, not the real `~/.hush` or OS keychain. The `runDirect` CLI argument paths are tested only up to the point where they would touch either of those resources, matching the existing untested keychain path from Sections 15 and 16. Live interactive use of the new picker and history screens and the `hush --` passthrough in a real terminal remains the user's own manual testing under the standing risk acceptance in Section 16.
