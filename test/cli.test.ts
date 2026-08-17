import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { assertSupportedPlatform, runCli, runWithVaultEnv } from '../src/cli.js';
import { initializeHushHome } from '../src/hush-home.js';
import { lockVault, openVault, writeSecret } from '../src/vault/vault.js';
import { InMemoryKeyringEntry } from './fixtures/keyring-double.js';

describe('CLI platform boundary', () => {
  it('rejects unsupported operating systems explicitly', () => {
    expect(() => assertSupportedPlatform('linux')).toThrow('supports macOS only');
  });

  it('accepts macOS', () => {
    expect(() => assertSupportedPlatform('darwin')).not.toThrow();
  });

  it('rejects unknown options before starting the terminal', async () => {
    await expect(runCli(['--unknown'])).rejects.toThrow('Unknown option: --unknown');
  });
});

describe('CLI direct passthrough (hush -- <command>)', () => {
  it('rejects an empty command after --', async () => {
    await expect(runCli(['--'])).rejects.toThrow('Usage: hush [--env <name>]');
  });

  it('rejects --env with no value', async () => {
    await expect(runCli(['--env', '--', 'npm', 'run', 'dev'])).rejects.toThrow(
      '--env requires a value',
    );
  });
});

describe('runWithVaultEnv', () => {
  const createdDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(createdDirs.splice(0).map((dir) => rm(dir, { recursive: true })));
  });

  it('injects the chosen environment and reports the exit code', async () => {
    const userHome = await mkdtemp(join(tmpdir(), 'hush-cli-run-'));
    createdDirs.push(userHome);
    const runDir = await mkdtemp(join(tmpdir(), 'hush-cli-out-'));
    createdDirs.push(runDir);
    const outFile = join(runDir, 'out.txt');

    const home = await initializeHushHome(userHome);
    const vault = await openVault(home, new InMemoryKeyringEntry());
    writeSecret(vault, { environmentId: 'acme/prod', name: 'OUT_MARKER' }, 'from-cli');

    const code = await runWithVaultEnv(vault, 'acme/prod', [
      process.execPath,
      '-e',
      `require("fs").writeFileSync(${JSON.stringify(outFile)}, process.env.OUT_MARKER || "")`,
    ]);

    expect(code).toBe(0);
    expect(readFileSync(outFile, 'utf8')).toBe('from-cli');
    lockVault(vault);
  });
});
