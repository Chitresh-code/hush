import { chmodSync, existsSync } from 'node:fs';
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

export function openVaultDatabase(path: string): InstanceType<typeof Database> {
  const fileExisted = existsSync(path);
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
        created_at TEXT NOT NULL
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
      ORDER BY version DESC
      LIMIT 1
    `,
    )
    .get(environmentId, name) as SecretRow | undefined;
}
