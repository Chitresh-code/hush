import type { KeyringEntry } from '../../src/vault/device-key.js';

/**
 * Test double for @napi-rs/keyring's AsyncEntry. In-memory only — never
 * touches the real OS keychain. Not production evidence of keychain behavior.
 */
export class InMemoryKeyringEntry implements KeyringEntry {
  private secret: Uint8Array | undefined;

  async getSecret(): Promise<Uint8Array | undefined> {
    return this.secret;
  }

  async setSecret(secret: Uint8Array): Promise<void> {
    this.secret = Uint8Array.from(secret);
  }
}
