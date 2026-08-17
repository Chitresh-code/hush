import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { initializeHushHome } from '../../src/hush-home.js';
import { EnvelopeAuthenticationError } from '../../src/vault/errors.js';
import { lockVault, openVault, readSecret, writeSecret } from '../../src/vault/vault.js';
import { InMemoryKeyringEntry } from '../fixtures/keyring-double.js';

const createdHomes: string[] = [];

async function temporaryHome(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'hush-vault-test-'));
  createdHomes.push(path);
  return path;
}

afterEach(async () => {
  await Promise.all(createdHomes.splice(0).map((dir) => rm(dir, { recursive: true })));
});

describe('vault', () => {
  it('creates, writes, locks, and unlocks with the same device key', async () => {
    const userHome = await temporaryHome();
    const home = await initializeHushHome(userHome);
    const entry = new InMemoryKeyringEntry();

    const vault = await openVault(home, entry);
    writeSecret(vault, { environmentId: 'env-1', name: 'API_KEY' }, 'super-secret-value');
    expect(readSecret(vault, { environmentId: 'env-1', name: 'API_KEY' })).toBe(
      'super-secret-value',
    );
    lockVault(vault);

    const reunlocked = await openVault(home, entry);
    expect(readSecret(reunlocked, { environmentId: 'env-1', name: 'API_KEY' })).toBe(
      'super-secret-value',
    );
    lockVault(reunlocked);
  });

  it('fails authentication when unlocked with the wrong device key', async () => {
    const userHome = await temporaryHome();
    const home = await initializeHushHome(userHome);
    const writerEntry = new InMemoryKeyringEntry();

    const vault = await openVault(home, writerEntry);
    writeSecret(vault, { environmentId: 'env-1', name: 'API_KEY' }, 'super-secret-value');
    lockVault(vault);

    const wrongKeyEntry = new InMemoryKeyringEntry();
    await wrongKeyEntry.setSecret(new Uint8Array(32).fill(0xaa));
    const wrongVault = await openVault(home, wrongKeyEntry);
    expect(() =>
      readSecret(wrongVault, { environmentId: 'env-1', name: 'API_KEY' }),
    ).toThrow(EnvelopeAuthenticationError);
    lockVault(wrongVault);
  });

  it('stores a new version on each write and reads the latest', async () => {
    const userHome = await temporaryHome();
    const home = await initializeHushHome(userHome);
    const entry = new InMemoryKeyringEntry();
    const vault = await openVault(home, entry);

    writeSecret(vault, { environmentId: 'env-1', name: 'API_KEY' }, 'first');
    writeSecret(vault, { environmentId: 'env-1', name: 'API_KEY' }, 'second');

    expect(readSecret(vault, { environmentId: 'env-1', name: 'API_KEY' })).toBe('second');
    lockVault(vault);
  });

  it('does not leak the device key through JSON.stringify', async () => {
    const userHome = await temporaryHome();
    const home = await initializeHushHome(userHome);
    const entry = new InMemoryKeyringEntry();
    const vault = await openVault(home, entry);

    const serialized = JSON.stringify(vault);
    expect(serialized).not.toContain(vault.key.toString('hex'));
    expect(Object.keys(vault)).not.toContain('key');
    lockVault(vault);
  });

  it('fails authentication when a ciphertext is swapped into a different row', async () => {
    const userHome = await temporaryHome();
    const home = await initializeHushHome(userHome);
    const entry = new InMemoryKeyringEntry();
    const vault = await openVault(home, entry);

    writeSecret(vault, { environmentId: 'prod', name: 'DB_PASSWORD' }, 'prod-real-password');
    writeSecret(vault, { environmentId: 'staging', name: 'DB_PASSWORD' }, 'staging-throwaway');

    const staging = vault.db
      .prepare('SELECT nonce, ciphertext, tag FROM secrets WHERE environment_id = ?')
      .get('staging') as { nonce: Buffer; ciphertext: Buffer; tag: Buffer };
    vault.db
      .prepare('UPDATE secrets SET nonce = ?, ciphertext = ?, tag = ? WHERE environment_id = ?')
      .run(staging.nonce, staging.ciphertext, staging.tag, 'prod');

    expect(() => readSecret(vault, { environmentId: 'prod', name: 'DB_PASSWORD' })).toThrow(
      EnvelopeAuthenticationError,
    );
    lockVault(vault);
  });

  it('fails authentication when an older version row is restored after a rotation', async () => {
    const userHome = await temporaryHome();
    const home = await initializeHushHome(userHome);
    const entry = new InMemoryKeyringEntry();
    const vault = await openVault(home, entry);

    writeSecret(vault, { environmentId: 'env-1', name: 'API' }, 'v1-old');
    writeSecret(vault, { environmentId: 'env-1', name: 'API' }, 'v2-rotated');

    const v1 = vault.db
      .prepare('SELECT * FROM secrets WHERE environment_id = ? AND name = ? AND version = 1')
      .get('env-1', 'API') as { nonce: Buffer; ciphertext: Buffer; tag: Buffer };
    vault.db.prepare('DELETE FROM secrets WHERE version = 2').run();
    vault.db
      .prepare('UPDATE secrets SET version = 2 WHERE environment_id = ? AND name = ?')
      .run('env-1', 'API');

    expect(() => readSecret(vault, { environmentId: 'env-1', name: 'API' })).toThrow(
      EnvelopeAuthenticationError,
    );
    lockVault(vault);
  });
});
