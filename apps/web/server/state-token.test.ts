import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { signInstallState, verifyInstallState } from './state-token';

const originalSecret = process.env.BETTER_AUTH_SECRET;

beforeAll(() => {
  process.env.BETTER_AUTH_SECRET = 'test-secret-at-least-sixteen-chars';
});

afterAll(() => {
  process.env.BETTER_AUTH_SECRET = originalSecret;
});

describe('state-token', () => {
  it('round-trips a valid payload', () => {
    const token = signInstallState({ orgId: 'o1', userId: 'u1', nonce: 'n1' });
    const verified = verifyInstallState(token);
    expect(verified.ok).toBe(true);
    if (!verified.ok) return;
    expect(verified.value.orgId).toBe('o1');
  });

  it('rejects a tampered body', () => {
    const token = signInstallState({ orgId: 'o1', userId: 'u1', nonce: 'n1' });
    const [body, sig] = token.split('.');
    const tamperedBody = body + 'x';
    const result = verifyInstallState(`${tamperedBody}.${sig}`);
    expect(result.ok).toBe(false);
  });

  it('rejects a malformed token', () => {
    const result = verifyInstallState('garbage');
    expect(result.ok).toBe(false);
  });
});
