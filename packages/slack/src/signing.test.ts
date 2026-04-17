import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifySlackSignature } from './signing';

function sign(secret: string, timestamp: string, body: string): string {
  const base = `v0:${timestamp}:${body}`;
  return 'v0=' + createHmac('sha256', secret).update(base).digest('hex');
}

describe('verifySlackSignature', () => {
  const secret = 'slack-signing-secret';
  const body = 'payload=%7B%22type%22%3A%22block_actions%22%7D';
  const now = 1_700_000_000;
  const ts = String(now);

  it('accepts a valid signature within the freshness window', () => {
    const signature = sign(secret, ts, body);
    expect(
      verifySlackSignature({
        signingSecret: secret,
        timestamp: ts,
        signature,
        rawBody: body,
        nowSeconds: now,
      }),
    ).toBe(true);
  });

  it('rejects an expired timestamp', () => {
    const signature = sign(secret, ts, body);
    expect(
      verifySlackSignature({
        signingSecret: secret,
        timestamp: ts,
        signature,
        rawBody: body,
        nowSeconds: now + 10 * 60,
      }),
    ).toBe(false);
  });

  it('rejects a tampered body', () => {
    const signature = sign(secret, ts, body);
    expect(
      verifySlackSignature({
        signingSecret: secret,
        timestamp: ts,
        signature,
        rawBody: 'evil=1',
        nowSeconds: now,
      }),
    ).toBe(false);
  });

  it('rejects with wrong secret', () => {
    const signature = sign('wrong', ts, body);
    expect(
      verifySlackSignature({
        signingSecret: secret,
        timestamp: ts,
        signature,
        rawBody: body,
        nowSeconds: now,
      }),
    ).toBe(false);
  });

  it('rejects non-numeric timestamps', () => {
    expect(
      verifySlackSignature({
        signingSecret: secret,
        timestamp: 'not-a-number',
        signature: 'v0=abc',
        rawBody: body,
        nowSeconds: now,
      }),
    ).toBe(false);
  });
});
