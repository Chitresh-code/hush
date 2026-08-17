# Hush

Hush is a local-first terminal application for managing project secrets and environment variables. It provides a keyboard-first interface for organizing environments, reviewing changes, running commands with selected values, and sharing encrypted data with collaborators.

## Status

Hush is under active development. Version 0.1.0 contains an initial runnable application shell, but it does not store or manage secrets yet.

## Installation

Install Hush globally from npm:

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

Start the development application:

```sh
npm run dev
```

## Contributing

Hush is not currently accepting external contributions. A contribution guide, development workflow, and code of conduct will be added when that changes.

For repository automation and coding standards, see [AGENTS.md](AGENTS.md).

## Security

Do not report security vulnerabilities through a public issue. Follow the private reporting instructions in [SECURITY.md](SECURITY.md).

## License

No open-source license has been granted. All rights are reserved until a license is added to this repository.
