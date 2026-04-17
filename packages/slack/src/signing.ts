import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verify a Slack request's `X-Slack-Signature` header. Slack signs the raw
 * request body with the signing secret, prefixed by the request timestamp
 * to prevent replay:
 *
 *   v0:<timestamp>:<body>
 *
 * Anything older than 5 minutes is rejected even if the signature matches.
 */
export function verifySlackSignature(params: {
  signingSecret: string;
  timestamp: string;
  signature: string;
  rawBody: string;
  /** Override current time for deterministic testing. Epoch seconds. */
  nowSeconds?: number;
}): boolean {
  const ts = Number(params.timestamp);
  if (!Number.isFinite(ts)) return false;
  const now = params.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 5 * 60) return false;

  const basestring = `v0:${params.timestamp}:${params.rawBody}`;
  const expected = `v0=${createHmac('sha256', params.signingSecret).update(basestring).digest('hex')}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(params.signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
