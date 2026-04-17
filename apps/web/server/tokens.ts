import { createHash, randomBytes } from 'node:crypto';

const TOKEN_PREFIX = 'cav_';

export function generateApiToken(): { token: string; prefix: string; hash: string } {
  const raw = randomBytes(32).toString('base64url');
  const token = `${TOKEN_PREFIX}${raw}`;
  return {
    token,
    prefix: token.slice(0, 12),
    hash: hashToken(token),
  };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateInviteToken(): { token: string; hash: string } {
  const raw = randomBytes(24).toString('base64url');
  return { token: raw, hash: hashToken(raw) };
}
