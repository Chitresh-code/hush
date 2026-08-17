# Repository instructions

These instructions apply to every coding agent working in this repository.

## Engineering standard

- Verify claims against repository code, tests, primary documentation, and reproducible commands.
- Distinguish confirmed facts, explicit assumptions, and unknown or unverified information.
- Never invent production endpoints, schemas, configuration, credentials, versions, runtime behavior, or test and deployment results.
- Produce complete, maintainable changes with input validation, explicit errors, secure defaults, authorization boundaries, cleanup, safe concurrency, redacted structured logging, documented configuration, and tests where the behavior requires them.
- Do not add placeholder logic, speculative abstractions, empty scaffolding, or deferred essential work unless the task explicitly requests a prototype.
- Prefer the standard library, native platform behavior, and existing dependencies before adding code or packages.
- Fix behavior at the shared root after tracing every caller and data path.
- Preserve unrelated work and never perform destructive Git or filesystem operations without explicit authorization.

## Hush decisions

- The local client is TypeScript and TermUI. It is not a Rust TUI.
- The intended package is `@chitresh-code/hush` with a `hush` executable.
- Hush owns one user-level directory resolved from the operating-system home directory: `~/.hush`. Never create `.hush` in a project or current working directory.
- Store non-secret settings and UI state under `~/.hush`. Store device private material and session credentials in an accepted OS credential store, never in configuration files.
- Do not use TermUI `useLocalStorage` or `useConf` because their default paths violate the Hush directory boundary.
- Do not use TermUI `useKeychain` for Hush secrets. Its current dependency and fallback behavior do not meet the fail-closed requirement.
- Treat imported `.env` files as inert data. Never source them or evaluate shell syntax.
- Start child processes directly with argument arrays. Never put secret values in command arguments or interpolate a shell command.
- Keep domain, persistence, encryption, and authorization rules outside TUI rendering components.
- Use `tsx src/cli.tsx` for interactive local development. Do not wrap the TUI in `tsx watch` or `@termuijs/dev-server` 0.1.7 because both consume or withhold terminal input from Hush.
- Do not persist user secrets until the cryptographic protocol, vectors, OS credential storage, SQLite behavior, and independent-review gates in Phase 2 are satisfied.

## Authorization invariants

- A User may have multiple OrganizationMembership records.
- Organization roles are `admin` and `member`.
- A Project belongs to exactly one Organization.
- A project collaborator is a ProjectMembership for an active member of the same Organization.
- Project roles are `co_owner`, `editor`, and `viewer`.
- Derive organization and roles from server-owned records. Never trust client-provided tenant or role claims.
- Organization admins govern users, organization settings, projects, and project access, but do not automatically receive secret decryption keys.
- Project co-owners manage project configuration and collaborators. Editors mutate project secrets and environments. Viewers have read-only use and disclosure access.
- Removing organization membership disables project memberships and triggers the documented future-key rotation workflow.

## Evidence and validation

- Inspect the relevant code, exact dependency versions, and current primary documentation before changing library-specific behavior.
- State the commands run and results observed. Label expected but unobserved results explicitly.
- Do not claim that code builds, tests pass, a package installs, a platform is supported, or a deployment works unless that result was observed.
- Use test doubles only in tests, identify them clearly, and never present them as production evidence.
- Keep tests isolated from the real `~/.hush` directory and use a temporary home.
- Treat security, terminal, key-store, filesystem, process, and packaging claims as platform checks, not unit-test conclusions.

## Writing and repository hygiene

- Match existing terminology and update affected documentation when behavior or a decision changes.
- Write direct, project-specific prose. Avoid generic filler, decorative comments, emojis, stylized punctuation, and em dashes.
- Comments explain non-obvious intent, constraints, or trade-offs. Do not narrate ordinary code.
- Do not add contributor, co-author, agent, model, tool, or generated-content attribution.

## Package versioning

- Treat the version as release state. Do not bump it for every edit or for documentation, tests, or internal refactoring that does not change the shipped package behavior.
- Keep initial development releases on `0.x.y`. Use a patch bump for backward-compatible fixes, a minor bump for new user-visible behavior or incompatible changes during `0.x`, and prerelease identifiers such as `0.2.0-alpha.1` for test releases.
- Move to `1.0.0` only when the public CLI and package contract are explicitly declared stable.
- Never reuse or overwrite a version already published to npm.
- Update `package.json` and `package-lock.json` together with `npm version <version> --no-git-tag-version`. Do not create a Git tag or commit unless explicitly requested.
- Before a release, run the required checks and `npm pack`, inspect the tarball contents, and confirm that the package name and version in the pack output match the intended release.
- Stable versions from `1.0.0` onward publish from `.github/workflows/publish-npm.yml` after they reach `main`. Never add a long-lived npm token to GitHub. Use npm trusted publishing for this workflow.
- State the reason for the selected version bump and distinguish completed validation from checks that remain unverified.

## Git

- Do not commit unless explicitly requested.
- When a commit is requested, use exactly one line: `type(scope): single line summary`. Use a concise lowercase imperative summary and no body or trailers.
