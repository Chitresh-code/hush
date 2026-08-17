import { describe, expect, it } from 'vitest';
import {
  CURRENT_ENVELOPE_VERSION,
  assertSupportedEnvelopeVersion,
  decryptSecret,
  encryptSecret,
  type EnvelopeIdentity,
} from '../../src/vault/envelope.js';
import {
  EnvelopeAuthenticationError,
  IncompatibleEnvelopeVersionError,
} from '../../src/vault/errors.js';

const KEY = Buffer.from(
  '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
  'hex',
);
const NONCE = Buffer.from('202122232425262728292a2b', 'hex');
const PLAINTEXT = Buffer.from('hush-phase2-known-answer-vector', 'utf8');
const IDENTITY: EnvelopeIdentity = { environmentId: 'env-1', name: 'API_KEY', version: 1 };
const EXPECTED_CIPHERTEXT = Buffer.from(
  'ba4fd51841e8726f691970e3aa769b8ebe648df2f4f7069c418009713de52c',
  'hex',
);
const EXPECTED_TAG = Buffer.from('b88a037dd966917b58a6e8ebe2666548', 'hex');

describe('vault envelope', () => {
  it('encrypts a known-answer vector to the expected ciphertext and tag', () => {
    const envelope = encryptSecret(PLAINTEXT, KEY, IDENTITY, NONCE);
    expect(envelope.ciphertext.toString('hex')).toBe(EXPECTED_CIPHERTEXT.toString('hex'));
    expect(envelope.tag.toString('hex')).toBe(EXPECTED_TAG.toString('hex'));
    expect(envelope.envelopeVersion).toBe(CURRENT_ENVELOPE_VERSION);
  });

  it('decrypts a known-answer vector back to the expected plaintext', () => {
    const plaintext = decryptSecret(
      {
        envelopeVersion: CURRENT_ENVELOPE_VERSION,
        nonce: NONCE,
        ciphertext: EXPECTED_CIPHERTEXT,
        tag: EXPECTED_TAG,
      },
      KEY,
      IDENTITY,
    );
    expect(plaintext.toString('utf8')).toBe(PLAINTEXT.toString('utf8'));
  });

  it('generates a fresh random nonce for every encryption by default', () => {
    const first = encryptSecret(PLAINTEXT, KEY, IDENTITY);
    const second = encryptSecret(PLAINTEXT, KEY, IDENTITY);
    expect(first.nonce.equals(second.nonce)).toBe(false);
  });

  it('throws EnvelopeAuthenticationError when the ciphertext is tampered', () => {
    const envelope = encryptSecret(PLAINTEXT, KEY, IDENTITY);
    const tampered = Buffer.from(envelope.ciphertext);
    tampered[0] = tampered[0]! ^ 0xff;
    expect(() =>
      decryptSecret({ ...envelope, ciphertext: tampered }, KEY, IDENTITY),
    ).toThrow(EnvelopeAuthenticationError);
  });

  it('throws EnvelopeAuthenticationError when the tag is tampered', () => {
    const envelope = encryptSecret(PLAINTEXT, KEY, IDENTITY);
    const tampered = Buffer.from(envelope.tag);
    tampered[0] = tampered[0]! ^ 0xff;
    expect(() => decryptSecret({ ...envelope, tag: tampered }, KEY, IDENTITY)).toThrow(
      EnvelopeAuthenticationError,
    );
  });

  it('rejects truncated auth tag (prevents tag-shortening bypass)', () => {
    const envelope = encryptSecret(PLAINTEXT, KEY, IDENTITY);
    const truncated = envelope.tag.subarray(0, 4);
    expect(() => decryptSecret({ ...envelope, tag: truncated }, KEY, IDENTITY)).toThrow(
      EnvelopeAuthenticationError,
    );
  });

  it('throws EnvelopeAuthenticationError when decrypting with the wrong key', () => {
    const envelope = encryptSecret(PLAINTEXT, KEY, IDENTITY);
    const wrongKey = Buffer.alloc(32, 0xaa);
    expect(() => decryptSecret(envelope, wrongKey, IDENTITY)).toThrow(
      EnvelopeAuthenticationError,
    );
  });

  it('refuses an unsupported envelope version before touching ciphertext', () => {
    const envelope = encryptSecret(PLAINTEXT, KEY, IDENTITY);
    expect(() => decryptSecret({ ...envelope, envelopeVersion: 99 }, KEY, IDENTITY)).toThrow(
      IncompatibleEnvelopeVersionError,
    );
  });

  it('assertSupportedEnvelopeVersion accepts the current version', () => {
    expect(() => assertSupportedEnvelopeVersion(CURRENT_ENVELOPE_VERSION)).not.toThrow();
  });

  it('rejects decryption when the ciphertext is moved to a different identity', () => {
    const envelope = encryptSecret(PLAINTEXT, KEY, IDENTITY);
    const otherIdentity: EnvelopeIdentity = { ...IDENTITY, name: 'OTHER_KEY' };
    expect(() => decryptSecret(envelope, KEY, otherIdentity)).toThrow(
      EnvelopeAuthenticationError,
    );
  });

  it('rejects decryption when the version is rolled back', () => {
    const envelope = encryptSecret(PLAINTEXT, KEY, { ...IDENTITY, version: 2 });
    const rolledBack: EnvelopeIdentity = { ...IDENTITY, version: 1 };
    expect(() => decryptSecret(envelope, KEY, rolledBack)).toThrow(EnvelopeAuthenticationError);
  });
});
