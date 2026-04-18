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

  it('honors an explicit ttlMs past the default 10-minute window', () => {
    const elevenMinutes = 11 * 60 * 1000;
    const realNow = Date.now;
    const t0 = realNow();
    // Sign with a 24h TTL.
    const token = signInstallState(
      { orgId: 'o1', userId: 'u1', nonce: 'n1' },
      { ttlMs: 24 * 60 * 60 * 1000 },
    );
    // Advance the clock 11 minutes; default TTL would reject this.
    Date.now = () => t0 + elevenMinutes;
    try {
      const verified = verifyInstallState(token);
      expect(verified.ok).toBe(true);
    } finally {
      Date.now = realNow;
    }
  });

  it('rejects when exp is in the past', () => {
    const realNow = Date.now;
    const token = signInstallState(
      { orgId: 'o1', userId: 'u1', nonce: 'n1' },
      { ttlMs: 1000 },
    );
    Date.now = () => realNow() + 60_000;
    try {
      const result = verifyInstallState(token);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('expired');
    } finally {
      Date.now = realNow;
    }
  });
});
