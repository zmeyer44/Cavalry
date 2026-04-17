import { describe, expect, it } from 'vitest';
import { Readable } from 'node:stream';
import { computeArtifactHash, verifyArtifactHash } from './hash';

const KNOWN_EMPTY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

describe('computeArtifactHash', () => {
  it('hashes a Buffer', async () => {
    const hash = await computeArtifactHash(Buffer.alloc(0));
    expect(hash).toBe(KNOWN_EMPTY_SHA256);
  });

  it('hashes a Readable stream', async () => {
    const hash = await computeArtifactHash(Readable.from([Buffer.from('hello')]));
    // sha256("hello") is known-good
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });
});

describe('verifyArtifactHash', () => {
  it('returns true for equal hashes', () => {
    expect(verifyArtifactHash(KNOWN_EMPTY_SHA256, KNOWN_EMPTY_SHA256)).toBe(true);
  });
  it('returns false for different hashes', () => {
    expect(verifyArtifactHash(KNOWN_EMPTY_SHA256, 'a'.repeat(64))).toBe(false);
  });
  it('returns false for different length', () => {
    expect(verifyArtifactHash('abc', 'abcd')).toBe(false);
  });
});
