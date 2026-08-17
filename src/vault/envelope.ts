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

export interface EnvelopeIdentity {
  environmentId: string;
  name: string;
  version: number;
}

export function assertSupportedEnvelopeVersion(version: number): void {
  if (!SUPPORTED_ENVELOPE_VERSIONS.has(version)) {
    throw new IncompatibleEnvelopeVersionError(
      `Vault requires a newer Hush version to read envelope_version ${version}.`,
    );
  }
}

// Binds the ciphertext to the row it belongs to as GCM associated data, so
// swapping a ciphertext/tag pair into a different row's identity or version
// fails authentication instead of decrypting as if it were legitimate.
// environmentId is length-prefixed because name follows it with no
// delimiter; otherwise ('', 'ab') and ('a', 'b') would produce the same AAD.
function buildAssociatedData(envelopeVersion: number, identity: EnvelopeIdentity): Buffer {
  const environmentIdBytes = Buffer.from(identity.environmentId, 'utf8');
  const nameBytes = Buffer.from(identity.name, 'utf8');
  const header = Buffer.alloc(12);
  header.writeUInt32BE(envelopeVersion, 0);
  header.writeUInt32BE(identity.version, 4);
  header.writeUInt32BE(environmentIdBytes.length, 8);
  return Buffer.concat([header, environmentIdBytes, nameBytes]);
}

export function encryptSecret(
  plaintext: Buffer,
  key: Buffer,
  identity: EnvelopeIdentity,
  nonce: Buffer = randomBytes(NONCE_LENGTH),
): EncryptedEnvelope {
  const cipher = createCipheriv(ALGORITHM, key, nonce, { authTagLength: 16 });
  cipher.setAAD(buildAssociatedData(CURRENT_ENVELOPE_VERSION, identity));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { envelopeVersion: CURRENT_ENVELOPE_VERSION, nonce, ciphertext, tag };
}

export function decryptSecret(
  envelope: EncryptedEnvelope,
  key: Buffer,
  identity: EnvelopeIdentity,
): Buffer {
  assertSupportedEnvelopeVersion(envelope.envelopeVersion);
  try {
    const decipher = createDecipheriv(ALGORITHM, key, envelope.nonce, { authTagLength: 16 });
    decipher.setAAD(buildAssociatedData(envelope.envelopeVersion, identity));
    decipher.setAuthTag(envelope.tag);
    return Buffer.concat([decipher.update(envelope.ciphertext), decipher.final()]);
  } catch {
    throw new EnvelopeAuthenticationError(
      'Vault entry failed authentication: wrong key or corrupted data.',
    );
  }
}
