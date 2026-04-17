import { createHmac } from 'node:crypto';

/**
 * Mirror of the web app's install-state signer. Used by Slack block-kit
 * messages so button callbacks can verify their orgId + userId. The web app
 * has its own copy at `apps/web/server/state-token.ts` — both use the same
 * secret (CAVALRY_STATE_SECRET / BETTER_AUTH_SECRET) and produce compatible
 * tokens. Moving to a shared package is deferred to avoid an unnecessary
 * layer for a two-call-site helper.
 */

export interface InstallStatePayload {
  orgId: string;
  userId: string;
  nonce: string;
}

interface Signed extends InstallStatePayload {
  iat: number;
}

function getSecret(): string {
  const secret =
    process.env.CAVALRY_STATE_SECRET ?? process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('CAVALRY_STATE_SECRET or BETTER_AUTH_SECRET must be set');
  }
  return secret;
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function signInstallStateForOrg(payload: InstallStatePayload): string {
  const body: Signed = { ...payload, iat: Date.now() };
  const bodyB64 = b64url(JSON.stringify(body));
  const sig = createHmac('sha256', getSecret()).update(bodyB64).digest();
  return `${bodyB64}.${b64url(sig)}`;
}
