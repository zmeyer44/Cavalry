import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { decrypt, encrypt, isEnvelope } from './crypto';

describe('registry-upstream/crypto', () => {
  const originalKey = process.env.CAVALRY_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.CAVALRY_ENCRYPTION_KEY = 'test-key-please-rotate-32+chars';
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.CAVALRY_ENCRYPTION_KEY;
    else process.env.CAVALRY_ENCRYPTION_KEY = originalKey;
  });

  it('round-trips a JSON payload', () => {
    const enc = encrypt({ token: 'sk_live_xyz', extras: [1, 2, 3] });
    expect(isEnvelope(enc)).toBe(true);
    expect(decrypt(enc)).toEqual({ token: 'sk_live_xyz', extras: [1, 2, 3] });
  });

  it('produces different ciphertexts each call (random IV)', () => {
    const a = encrypt('hello');
    const b = encrypt('hello');
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe('hello');
    expect(decrypt(b)).toBe('hello');
  });

  it('throws on tampered envelope', () => {
    const enc = encrypt({ token: 'abc' });
    const parts = enc.split(':');
    parts[3] = Buffer.from('garbage').toString('base64');
    expect(() => decrypt(parts.join(':'))).toThrow();
  });

  it('throws when key is missing', () => {
    delete process.env.CAVALRY_ENCRYPTION_KEY;
    expect(() => encrypt('x')).toThrow(/CAVALRY_ENCRYPTION_KEY/);
  });

  it('rejects malformed envelopes', () => {
    expect(() => decrypt('not-an-envelope')).toThrow();
    expect(() => decrypt('v2:a:b:c')).toThrow();
  });
});
