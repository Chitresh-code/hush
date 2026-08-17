import Database from 'better-sqlite3';
import type { HushHome } from '../hush-home.js';
import { resolveDeviceKey, type KeyringEntry } from './device-key.js';
import { decryptSecret, encryptSecret } from './envelope.js';
import {
  insertSecret,
  latestSecret,
  listEnvironmentIds as listEnvironmentIdsFromStore,
  listSecretNames,
  openVaultDatabase,
  secretVersion,
  secretVersions,
  vaultFileExists,
} from './store.js';

export interface Vault {
  db: InstanceType<typeof Database>;
  key: Buffer;
}

export interface SecretIdentity {
  environmentId: string;
  name: string;
}

export async function openVault(home: HushHome, entry: KeyringEntry): Promise<Vault> {
  const key = await resolveDeviceKey(entry, vaultFileExists(home.database));
  const db = openVaultDatabase(home.database);
  const vault = { db } as Vault;
  // Non-enumerable so JSON.stringify/console.log/Object.keys never dump the raw device key.
  Object.defineProperty(vault, 'key', { value: key, enumerable: false });
  return vault;
}

export function lockVault(vault: Vault): void {
  vault.key.fill(0);
  vault.db.close();
}

export function writeSecret(vault: Vault, identity: SecretIdentity, value: string): void {
  // Read-modify-write of the next version number runs in one immediate
  // transaction so two concurrent writers can't both observe the same
  // "latest" version and each insert a version that silently shadows the
  // other's. The UNIQUE(environment_id, name, version) constraint in the
  // schema is the second line of defense if a caller ever bypasses this.
  const write = vault.db.transaction(() => {
    const previous = latestSecret(vault.db, identity.environmentId, identity.name);
    const version = (previous?.version ?? 0) + 1;
    const envelope = encryptSecret(Buffer.from(value, 'utf8'), vault.key, {
      environmentId: identity.environmentId,
      name: identity.name,
      version,
    });
    insertSecret(vault.db, {
      environmentId: identity.environmentId,
      name: identity.name,
      version,
      envelopeVersion: envelope.envelopeVersion,
      nonce: envelope.nonce,
      ciphertext: envelope.ciphertext,
      tag: envelope.tag,
      createdAt: new Date().toISOString(),
    });
  });
  write.immediate();
}

export function listSecrets(vault: Vault, environmentId: string): string[] {
  return listSecretNames(vault.db, environmentId);
}

export function readAllSecrets(vault: Vault, environmentId: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const name of listSecretNames(vault.db, environmentId)) {
    result[name] = readSecret(vault, { environmentId, name });
  }
  return result;
}

export function readSecret(vault: Vault, identity: SecretIdentity): string {
  const row = latestSecret(vault.db, identity.environmentId, identity.name);
  if (!row) {
    throw new Error(
      `No secret named "${identity.name}" in environment "${identity.environmentId}".`,
    );
  }
  return decryptSecret(
    {
      envelopeVersion: row.envelopeVersion,
      nonce: row.nonce,
      ciphertext: row.ciphertext,
      tag: row.tag,
    },
    vault.key,
    { environmentId: row.environmentId, name: row.name, version: row.version },
  ).toString('utf8');
}

export interface SecretVersionInfo {
  version: number;
  createdAt: string;
}

export function listSecretVersions(vault: Vault, identity: SecretIdentity): SecretVersionInfo[] {
  return secretVersions(vault.db, identity.environmentId, identity.name).map((row) => ({
    version: row.version,
    createdAt: row.createdAt,
  }));
}

export function readSecretVersion(vault: Vault, identity: SecretIdentity, version: number): string {
  const row = secretVersion(vault.db, identity.environmentId, identity.name, version);
  if (!row) {
    throw new Error(
      `No version ${version} of "${identity.name}" in environment "${identity.environmentId}".`,
    );
  }
  return decryptSecret(
    {
      envelopeVersion: row.envelopeVersion,
      nonce: row.nonce,
      ciphertext: row.ciphertext,
      tag: row.tag,
    },
    vault.key,
    { environmentId: row.environmentId, name: row.name, version: row.version },
  ).toString('utf8');
}

// A rollback writes the old value back as a brand-new version rather than
// deleting anything newer, so the audit trail (Phase 2's immutable-history
// requirement) is never rewritten. Undoing an undo is just picking the
// other version again.
export function rollbackSecret(vault: Vault, identity: SecretIdentity, version: number): void {
  writeSecret(vault, identity, readSecretVersion(vault, identity, version));
}

export function listEnvironmentIds(vault: Vault): string[] {
  return listEnvironmentIdsFromStore(vault.db);
}
