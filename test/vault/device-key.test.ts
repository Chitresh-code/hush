import { describe, expect, it } from 'vitest';
import { DEVICE_KEY_LENGTH, resolveDeviceKey } from '../../src/vault/device-key.js';
import { DeviceKeyUnavailableError } from '../../src/vault/errors.js';
import { InMemoryKeyringEntry } from '../fixtures/keyring-double.js';

describe('device key lifecycle', () => {
  it('creates and stores a new device key on first run', async () => {
    const entry = new InMemoryKeyringEntry();
    const key = await resolveDeviceKey(entry, false);
    expect(key.length).toBe(DEVICE_KEY_LENGTH);
    expect((await entry.getSecret())?.length).toBe(DEVICE_KEY_LENGTH);
  });

  it('returns the existing key on a normal unlock', async () => {
    const entry = new InMemoryKeyringEntry();
    const created = await resolveDeviceKey(entry, false);
    const unlocked = await resolveDeviceKey(entry, true);
    expect(unlocked.equals(created)).toBe(true);
  });

  it('never overwrites an existing key on a repeated first-run call', async () => {
    const entry = new InMemoryKeyringEntry();
    const first = await resolveDeviceKey(entry, false);
    const second = await resolveDeviceKey(entry, false);
    expect(second.equals(first)).toBe(true);
  });

  it('fails closed when the key is missing but a vault file exists', async () => {
    const entry = new InMemoryKeyringEntry();
    await expect(resolveDeviceKey(entry, true)).rejects.toThrow(DeviceKeyUnavailableError);
  });
});
