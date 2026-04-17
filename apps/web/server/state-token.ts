import { createHmac, timingSafeEqual } from 'node:crypto';

const MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

export interface InstallStatePayload {
  orgId: string;
  userId: string;
  nonce: string;
}

interface SignedPayload extends InstallStatePayload {
  iat: number;
}

function getSecret(): string {
  const secret = process.env.CAVALRY_STATE_SECRET ?? process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('CAVALRY_STATE_SECRET or BETTER_AUTH_SECRET must be set and >=16 chars');
  }
  return secret;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlDecode(input: string): Buffer {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(b64, 'base64');
}

export function signInstallState(payload: InstallStatePayload): string {
  const body: SignedPayload = { ...payload, iat: Date.now() };
  const bodyB64 = base64url(JSON.stringify(body));
  const sig = createHmac('sha256', getSecret()).update(bodyB64).digest();
  return `${bodyB64}.${base64url(sig)}`;
}

export function verifyInstallState(token: string):
  | { ok: true; value: InstallStatePayload }
  | { ok: false; reason: string } {
  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false, reason: 'malformed' };
  const [bodyB64, sigB64] = parts as [string, string];
  const expectedSig = createHmac('sha256', getSecret()).update(bodyB64).digest();
  const providedSig = base64urlDecode(sigB64);
  if (
    expectedSig.length !== providedSig.length ||
    !timingSafeEqual(expectedSig, providedSig)
  ) {
    return { ok: false, reason: 'invalid signature' };
  }
  let parsed: SignedPayload;
  try {
    parsed = JSON.parse(base64urlDecode(bodyB64).toString('utf8')) as SignedPayload;
  } catch {
    return { ok: false, reason: 'invalid payload' };
  }
  if (Date.now() - parsed.iat > MAX_AGE_MS) {
    return { ok: false, reason: 'expired' };
  }
  const { iat, ...rest } = parsed;
  return { ok: true, value: rest };
}
