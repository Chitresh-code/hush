import { existsSync } from 'node:fs';
import Database from 'better-sqlite3';
import type { HushHome } from '../hush-home.js';
import { resolveDeviceKey, type KeyringEntry } from './device-key.js';
import { decryptSecret, encryptSecret } from './envelope.js';
import { insertSecret, latestSecret, openVaultDatabase } from './store.js';

export interface Vault {
  db: InstanceType<typeof Database>;
  key: Buffer;
}

export interface SecretIdentity {
  environmentId: string;
  name: string;
}

export async function openVault(home: HushHome, entry: KeyringEntry): Promise<Vault> {
  const vaultFileExists = existsSync(home.database);
  const key = await resolveDeviceKey(entry, vaultFileExists);
  const db = openVaultDatabase(home.database);
  return { db, key };
}

export function lockVault(vault: Vault): void {
  vault.db.close();
  vault.key.fill(0);
}

export function writeSecret(vault: Vault, identity: SecretIdentity, value: string): void {
  const previous = latestSecret(vault.db, identity.environmentId, identity.name);
  const envelope = encryptSecret(Buffer.from(value, 'utf8'), vault.key);
  insertSecret(vault.db, {
    environmentId: identity.environmentId,
    name: identity.name,
    version: (previous?.version ?? 0) + 1,
    envelopeVersion: envelope.envelopeVersion,
    nonce: envelope.nonce,
    ciphertext: envelope.ciphertext,
    tag: envelope.tag,
    createdAt: new Date().toISOString(),
  });
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
  ).toString('utf8');
}
