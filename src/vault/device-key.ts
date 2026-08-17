import { randomBytes } from 'node:crypto';
import { AsyncEntry } from '@napi-rs/keyring';
import { DeviceKeyUnavailableError } from './errors.js';

export const DEVICE_KEY_LENGTH = 32;
const KEYRING_SERVICE = 'anvara-hush';

export interface KeyringEntry {
  getSecret(): Promise<Uint8Array | undefined>;
  setSecret(secret: Uint8Array): Promise<void>;
}

export function createKeyringEntry(username: string): KeyringEntry {
  return new AsyncEntry(KEYRING_SERVICE, username);
}

export async function resolveDeviceKey(
  entry: KeyringEntry,
  vaultFileExists: boolean,
): Promise<Buffer> {
  const stored = await entry.getSecret();
  if (stored !== undefined) {
    return Buffer.from(stored);
  }

  if (vaultFileExists) {
    throw new DeviceKeyUnavailableError(
      'Device key is unavailable but a vault file exists. Refusing to create a new key over existing data.',
    );
  }

  const key = randomBytes(DEVICE_KEY_LENGTH);
  await entry.setSecret(key);
  return key;
}
