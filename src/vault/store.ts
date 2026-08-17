import { chmodSync, lstatSync } from 'node:fs';
import Database from 'better-sqlite3';
import { InterruptedMigrationError, VaultCorruptionError } from './errors.js';

const LATEST_MIGRATION_ID = 1;

export interface SecretRow {
  id: number;
  environmentId: string;
  name: string;
  version: number;
  envelopeVersion: number;
  nonce: Buffer;
  ciphertext: Buffer;
  tag: Buffer;
  createdAt: string;
}

export interface NewSecretRow {
  environmentId: string;
  name: string;
  version: number;
  envelopeVersion: number;
  nonce: Buffer;
  ciphertext: Buffer;
  tag: Buffer;
  createdAt: string;
}

// Symlink-aware existence check: a dangling or foreign-target symlink must
// still count as "something is here" so the caller fails closed instead of
// treating it as first run, and it must never be silently followed to write
// the vault outside ~/.hush.
export function vaultFileExists(path: string): boolean {
  return lstatSync(path, { throwIfNoEntry: false }) !== undefined;
}

export function openVaultDatabase(path: string): InstanceType<typeof Database> {
  const priorEntry = lstatSync(path, { throwIfNoEntry: false });
  if (priorEntry && (!priorEntry.isFile() || priorEntry.isSymbolicLink())) {
    throw new VaultCorruptionError(`Vault database path is not a regular file: ${path}`);
  }
  const fileExisted = priorEntry !== undefined;
  const db = openRawDatabase(path);
  // Set mode before enabling WAL so the -wal/-shm sidecars inherit 0600 too.
  chmodSync(path, 0o600);

  try {
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
  } catch (error) {
    db.close();
    throw new VaultCorruptionError(
      `Vault database is unreadable: ${path} (${(error as Error).message})`,
    );
  }

  if (fileExisted) {
    try {
      const integrity = db.pragma('integrity_check', { simple: true });
      if (integrity !== 'ok') {
        db.close();
        throw new VaultCorruptionError(`Vault database failed integrity check: ${path}`);
      }
    } catch (error) {
      if (error instanceof VaultCorruptionError) throw error;
      db.close();
      throw new VaultCorruptionError(
        `Vault database is unreadable: ${path} (${(error as Error).message})`,
      );
    }
  }

  const migrationsTableExists = tableExists(db, 'schema_migrations');
  const secretsTableExists = tableExists(db, 'secrets');

  if (migrationsTableExists !== secretsTableExists) {
    db.close();
    throw new InterruptedMigrationError(`Vault schema is partially migrated: ${path}`);
  }

  if (!migrationsTableExists) {
    runMigration(db);
  } else {
    const applied = db
      .prepare('SELECT id FROM schema_migrations WHERE id = ?')
      .get(LATEST_MIGRATION_ID);
    if (!applied) {
      db.close();
      throw new InterruptedMigrationError(
        `Vault schema is missing migration ${LATEST_MIGRATION_ID}: ${path}`,
      );
    }
  }

  return db;
}

function openRawDatabase(path: string): InstanceType<typeof Database> {
  try {
    return new Database(path);
  } catch (error) {
    throw new VaultCorruptionError(
      `Vault database is unreadable: ${path} (${(error as Error).message})`,
    );
  }
}

function tableExists(db: InstanceType<typeof Database>, name: string): boolean {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(name);
  return row !== undefined;
}

function runMigration(db: InstanceType<typeof Database>): void {
  const migrate = db.transaction(() => {
    db.exec(`
      CREATE TABLE schema_migrations (
        id INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
      CREATE TABLE secrets (
        id INTEGER PRIMARY KEY,
        environment_id TEXT NOT NULL,
        name TEXT NOT NULL,
        version INTEGER NOT NULL,
        envelope_version INTEGER NOT NULL,
        nonce BLOB NOT NULL,
        ciphertext BLOB NOT NULL,
        tag BLOB NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE (environment_id, name, version)
      );
    `);
    db.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)').run(
      LATEST_MIGRATION_ID,
      new Date().toISOString(),
    );
  });
  migrate();
}

export function insertSecret(db: InstanceType<typeof Database>, row: NewSecretRow): void {
  const insert = db.prepare(`
    INSERT INTO secrets (environment_id, name, version, envelope_version, nonce, ciphertext, tag, created_at)
    VALUES (@environmentId, @name, @version, @envelopeVersion, @nonce, @ciphertext, @tag, @createdAt)
  `);
  db.transaction(() => insert.run(row))();
}

export function listSecretNames(
  db: InstanceType<typeof Database>,
  environmentId: string,
): string[] {
  const rows = db
    .prepare('SELECT DISTINCT name FROM secrets WHERE environment_id = ? ORDER BY name')
    .all(environmentId) as { name: string }[];
  return rows.map((row) => row.name);
}

export function latestSecret(
  db: InstanceType<typeof Database>,
  environmentId: string,
  name: string,
): SecretRow | undefined {
  return db
    .prepare(
      `
      SELECT id, environment_id AS environmentId, name, version,
             envelope_version AS envelopeVersion, nonce, ciphertext, tag, created_at AS createdAt
      FROM secrets
      WHERE environment_id = ? AND name = ?
      ORDER BY version DESC, id DESC
      LIMIT 1
    `,
    )
    .get(environmentId, name) as SecretRow | undefined;
}

export function secretVersions(
  db: InstanceType<typeof Database>,
  environmentId: string,
  name: string,
): SecretRow[] {
  return db
    .prepare(
      `
      SELECT id, environment_id AS environmentId, name, version,
             envelope_version AS envelopeVersion, nonce, ciphertext, tag, created_at AS createdAt
      FROM secrets
      WHERE environment_id = ? AND name = ?
      ORDER BY version DESC
    `,
    )
    .all(environmentId, name) as SecretRow[];
}

export function secretVersion(
  db: InstanceType<typeof Database>,
  environmentId: string,
  name: string,
  version: number,
): SecretRow | undefined {
  return db
    .prepare(
      `
      SELECT id, environment_id AS environmentId, name, version,
             envelope_version AS envelopeVersion, nonce, ciphertext, tag, created_at AS createdAt
      FROM secrets
      WHERE environment_id = ? AND name = ? AND version = ?
    `,
    )
    .get(environmentId, name, version) as SecretRow | undefined;
}

export function listEnvironmentIds(db: InstanceType<typeof Database>): string[] {
  const rows = db
    .prepare('SELECT DISTINCT environment_id AS environmentId FROM secrets ORDER BY environment_id')
    .all() as { environmentId: string }[];
  return rows.map((row) => row.environmentId);
}
