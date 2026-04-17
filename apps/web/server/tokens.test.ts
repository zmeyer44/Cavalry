import { describe, expect, it } from 'vitest';
import { generateApiToken, hashToken, generateInviteToken } from './tokens';

describe('generateApiToken', () => {
  it('emits a cav_-prefixed token and matching hash', () => {
    const { token, prefix, hash } = generateApiToken();
    expect(token.startsWith('cav_')).toBe(true);
    expect(prefix.startsWith('cav_')).toBe(true);
    expect(prefix).toHaveLength(12);
    expect(hash).toBe(hashToken(token));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generates unique tokens', () => {
    const a = generateApiToken();
    const b = generateApiToken();
    expect(a.token).not.toBe(b.token);
    expect(a.hash).not.toBe(b.hash);
  });
});

describe('generateInviteToken', () => {
  it('returns a token with matching sha256 hash', () => {
    const { token, hash } = generateInviteToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(hash).toBe(hashToken(token));
  });
});
