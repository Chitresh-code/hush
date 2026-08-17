# Hush

Hush is a local-first terminal application for managing project secrets and environment variables. It provides a keyboard-first interface for organizing environments, reviewing changes, running commands with selected values, and sharing encrypted data with collaborators.

## Status

Hush is under active development. The repository contains an initial runnable application shell, but it does not store or manage secrets yet. The npm package is not published.

## Installation

When the first release is available, install Hush globally from npm:

```sh
npm install -g @anvara/hush
```

The current development build requires macOS and Node.js 24 or later.

## Usage

After building from source, launch the application with:

```sh
node dist/cli.js
```

Run `node dist/cli.js --help` for the available options. The current build creates non-secret settings and UI state under `~/.hush`.

## Development

Install dependencies and run the checks:

```sh
npm install
npm run typecheck
npm test
npm run build
```

Start the Node-based development watcher:

```sh
npm run dev
```

## Contributing

Hush is currently developed privately and is not accepting external contributions. A contribution guide, development workflow, and code of conduct will be added if the project opens to contributors.

For repository automation and coding standards, see [AGENTS.md](AGENTS.md).

## Security

Do not report security vulnerabilities through a public issue. A private reporting channel and supported-version policy will be published before the first public release.

## License

No open-source license has been granted. All rights are reserved until a license is added to this repository.
