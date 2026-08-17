import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { EnvelopeAuthenticationError, IncompatibleEnvelopeVersionError } from './errors.js';

export const CURRENT_ENVELOPE_VERSION = 1;
const SUPPORTED_ENVELOPE_VERSIONS = new Set([1]);

const ALGORITHM = 'aes-256-gcm';
const NONCE_LENGTH = 12;

export interface EncryptedEnvelope {
  envelopeVersion: number;
  nonce: Buffer;
  ciphertext: Buffer;
  tag: Buffer;
}

export function assertSupportedEnvelopeVersion(version: number): void {
  if (!SUPPORTED_ENVELOPE_VERSIONS.has(version)) {
    throw new IncompatibleEnvelopeVersionError(
      `Vault requires a newer Hush version to read envelope_version ${version}.`,
    );
  }
}

export function encryptSecret(
  plaintext: Buffer,
  key: Buffer,
  nonce: Buffer = randomBytes(NONCE_LENGTH),
): EncryptedEnvelope {
  const cipher = createCipheriv(ALGORITHM, key, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { envelopeVersion: CURRENT_ENVELOPE_VERSION, nonce, ciphertext, tag };
}

export function decryptSecret(envelope: EncryptedEnvelope, key: Buffer): Buffer {
  assertSupportedEnvelopeVersion(envelope.envelopeVersion);
  const decipher = createDecipheriv(ALGORITHM, key, envelope.nonce);
  decipher.setAuthTag(envelope.tag);
  try {
    return Buffer.concat([decipher.update(envelope.ciphertext), decipher.final()]);
  } catch {
    throw new EnvelopeAuthenticationError(
      'Vault entry failed authentication: wrong key or corrupted data.',
    );
  }
}
