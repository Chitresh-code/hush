import { readFileSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { InterruptedMigrationError, VaultCorruptionError } from '../../src/vault/errors.js';
import {
  insertSecret,
  latestSecret,
  openVaultDatabase,
  vaultFileExists,
} from '../../src/vault/store.js';

const createdDirs: string[] = [];

async function tempDbPath(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'hush-vault-test-'));
  createdDirs.push(dir);
  return join(dir, 'hush.db');
}

afterEach(async () => {
  await Promise.all(createdDirs.splice(0).map((dir) => rm(dir, { recursive: true })));
});

function sampleRow(overrides: Partial<Parameters<typeof insertSecret>[1]> = {}) {
  return {
    environmentId: 'env-1',
    name: 'API_KEY',
    version: 1,
    envelopeVersion: 1,
    nonce: Buffer.alloc(12, 1),
    ciphertext: Buffer.from('ciphertext'),
    tag: Buffer.alloc(16, 2),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('vault store', () => {
  it('creates the schema on first open and round-trips a row', async () => {
    const path = await tempDbPath();
    const db = openVaultDatabase(path);
    insertSecret(db, sampleRow());
    const row = latestSecret(db, 'env-1', 'API_KEY');
    expect(row?.version).toBe(1);
    expect(row?.ciphertext.toString()).toBe('ciphertext');
    db.close();
  });

  it('creates the vault database file at mode 0600', async () => {
    const path = await tempDbPath();
    const db = openVaultDatabase(path);
    expect(statSync(path).mode & 0o777).toBe(0o600);
    db.close();
  });

  it('reopens an existing vault without re-running migrations', async () => {
    const path = await tempDbPath();
    const first = openVaultDatabase(path);
    insertSecret(first, sampleRow());
    first.close();

    const second = openVaultDatabase(path);
    expect(latestSecret(second, 'env-1', 'API_KEY')?.version).toBe(1);
    second.close();
  });

  it('returns the highest version when multiple versions exist', async () => {
    const path = await tempDbPath();
    const db = openVaultDatabase(path);
    for (const version of [1, 2, 3]) {
      insertSecret(db, sampleRow({ version, ciphertext: Buffer.from(`v${version}`) }));
    }
    expect(latestSecret(db, 'env-1', 'API_KEY')?.version).toBe(3);
    db.close();
  });

  it('rejects a corrupt database file', async () => {
    const path = await tempDbPath();
    writeFileSync(path, 'not a sqlite file');
    expect(() => openVaultDatabase(path)).toThrow(VaultCorruptionError);
  });

  it('rejects a partially migrated database', async () => {
    const path = await tempDbPath();
    const db = openVaultDatabase(path);
    db.close();

    const reopened = openVaultDatabase(path);
    reopened.exec('DROP TABLE schema_migrations');
    reopened.close();

    expect(() => openVaultDatabase(path)).toThrow(InterruptedMigrationError);
  });

  it('rolls back a failed transaction and leaves prior rows unchanged', async () => {
    const path = await tempDbPath();
    const db = openVaultDatabase(path);
    insertSecret(db, sampleRow({ version: 1, ciphertext: Buffer.from('v1') }));

    const failingWrite = db.transaction(() => {
      insertSecret(db, sampleRow({ version: 2, ciphertext: Buffer.from('v2') }));
      throw new Error('simulated failure mid-transaction');
    });

    expect(() => failingWrite()).toThrow('simulated failure mid-transaction');
    expect(latestSecret(db, 'env-1', 'API_KEY')?.version).toBe(1);
    db.close();
  });

  it('rejects a database with failed integrity check', async () => {
    const path = await tempDbPath();

    // Create a valid database with data
    const db = openVaultDatabase(path);
    insertSecret(db, sampleRow());
    db.close();

    // Corrupt the database file by flipping bits in a data section
    const buffer = readFileSync(path);
    // Corrupt bytes beyond the header (after 4096 bytes) to affect data pages
    if (buffer.length > 4096) {
      buffer[4096] ^= 0xFF;
    }
    writeFileSync(path, buffer);

    expect(() => openVaultDatabase(path)).toThrow(VaultCorruptionError);
  });

  it('rejects a second row with the same environment, name, and version', async () => {
    const path = await tempDbPath();
    const db = openVaultDatabase(path);
    insertSecret(db, sampleRow({ version: 1 }));
    expect(() => insertSecret(db, sampleRow({ version: 1 }))).toThrow();
    db.close();
  });

  it('treats a dangling symlink at the database path as existing, not first run', async () => {
    const path = await tempDbPath();
    symlinkSync(join(path, '..', 'nonexistent-target.db'), path);
    expect(vaultFileExists(path)).toBe(true);
  });

  it('refuses to open the database through a symlink', async () => {
    const path = await tempDbPath();
    const realPath = `${path}.real`;
    openVaultDatabase(realPath).close();
    symlinkSync(realPath, path);
    expect(() => openVaultDatabase(path)).toThrow(VaultCorruptionError);
  });
});
