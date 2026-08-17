#!/usr/bin/env node

import { render } from '@termuijs/jsx';
import { realpathSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { userInfo } from 'node:os';
import { fileURLToPath } from 'node:url';
import { HushApp } from './app.js';
import { initializeHushHome, readUiState } from './hush-home.js';
import { runWithEnv } from './process/run-with-env.js';
import { createKeyringEntry } from './vault/device-key.js';
import { lockVault, openVault, readAllSecrets, type Vault } from './vault/vault.js';
import { setActiveHome, setActiveVault, setInitialEnvironmentId } from './vault-screens.js';

async function readPackageVersion(): Promise<string> {
  const raw = await readFile(new URL('../package.json', import.meta.url), 'utf8');
  const pkg = JSON.parse(raw) as { version?: string };
  return pkg.version ?? 'dev';
}

const HELP = `Usage: hush
       hush [--env <name>] -- <command> [args...]

Launch the Hush terminal interface, or run a command directly with an
environment's secrets injected (no TUI). --env picks the environment;
without it, the last environment used in the TUI is used.

Options:
  -h, --help    Show this help message
  --env <name>  Environment to inject when running a command directly
`;

export function assertSupportedPlatform(platform = process.platform): void {
  if (platform !== 'darwin') {
    throw new Error('Hush Phase 1 supports macOS only.');
  }
}

function parseEnvFlag(preArgs: string[]): string | undefined {
  const flagIndex = preArgs.indexOf('--env');
  if (flagIndex === -1) return undefined;
  const value = preArgs[flagIndex + 1];
  if (!value) {
    throw new Error('--env requires a value, e.g. hush --env acme/prod -- npm run dev');
  }
  return value;
}

// Split out from runDirect so it's testable against a real temp vault
// without touching the real ~/.hush or OS keychain.
export async function runWithVaultEnv(
  vault: Vault,
  environmentId: string,
  cmd: string[],
): Promise<number> {
  const env = readAllSecrets(vault, environmentId);
  return runWithEnv(cmd, env);
}

// Runs a command with an environment's secrets injected, without ever
// mounting the TUI. For `hush -- npm run dev`, the command's own output
// (a dev server's trace, a test runner) isn't captured behind the terminal
// UI. No TTY requirement here: unlike the TUI, a direct passthrough works
// fine piped or in CI.
async function runDirect(cmd: string[], environmentId: string | undefined): Promise<number> {
  if (cmd.length === 0) {
    throw new Error('Usage: hush [--env <name>] -- <command> [args...]');
  }
  assertSupportedPlatform();

  const home = await initializeHushHome();
  const targetEnvironmentId = environmentId ?? (await readUiState(home)).lastEnvironmentId;
  if (!targetEnvironmentId) {
    throw new Error(
      'No environment selected. Pass --env <name>, or launch hush and pick one first.',
    );
  }

  const entry = createKeyringEntry(userInfo().username);
  const vault = await openVault(home, entry);
  try {
    return await runWithVaultEnv(vault, targetEnvironmentId, cmd);
  } finally {
    lockVault(vault);
  }
}

export async function runCli(args = process.argv.slice(2)): Promise<number> {
  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write(HELP);
    return 0;
  }

  const dashIndex = args.indexOf('--');
  if (dashIndex !== -1) {
    const environmentId = parseEnvFlag(args.slice(0, dashIndex));
    return runDirect(args.slice(dashIndex + 1), environmentId);
  }

  if (args.length > 0) {
    throw new Error(`Unknown option: ${args[0]}`);
  }

  assertSupportedPlatform();
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Hush requires an interactive terminal.');
  }

  const home = await initializeHushHome();
  const version = await readPackageVersion();

  const entry = createKeyringEntry(userInfo().username);
  const vault = await openVault(home, entry);
  setActiveVault(vault);
  setActiveHome(home);
  setInitialEnvironmentId((await readUiState(home)).lastEnvironmentId);

  try {
    return await render(<HushApp version={version} />, { title: 'Hush', fullscreen: true });
  } finally {
    lockVault(vault);
  }
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;

  try {
    return realpathSync(entry) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isMainModule()) {
  runCli()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unexpected startup failure.';
      process.stderr.write(`hush: ${message}\n`);
      process.exitCode = 1;
    });
}
