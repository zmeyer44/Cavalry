import { randomBytes, createHash } from 'node:crypto';
import { createId } from '@paralleldrive/cuid2';
import { getPool } from './db';

const TOKEN_PREFIX = 'cav_';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function randomSuffix(): string {
  return randomBytes(6).toString('hex');
}

export interface UserProfile {
  name: string;
  email: string;
  password: string;
}

export function makeUserProfile(): UserProfile {
  const s = randomSuffix();
  return {
    name: `E2E User ${s}`,
    email: `e2e-${s}@cavalry.test`,
    password: 'e2e-password-123',
  };
}

export interface OrgProfile {
  name: string;
  slug: string;
}

export function makeOrgProfile(): OrgProfile {
  const s = randomSuffix();
  return {
    name: `E2E Org ${s}`,
    slug: `e2e-${s}`,
  };
}

export interface CreatedToken {
  id: string;
  token: string;
  prefix: string;
}

export async function insertApiToken(params: {
  orgId: string;
  userId: string;
  name: string;
  scopes: string[];
}): Promise<CreatedToken> {
  const raw = randomBytes(32).toString('base64url');
  const token = `${TOKEN_PREFIX}${raw}`;
  const tokenHash = hashToken(token);
  const prefix = token.slice(0, 12);

  const pool = getPool();
  const id = createId();
  await pool.query(
    `INSERT INTO api_tokens (id, org_id, user_id, name, token_hash, prefix, scopes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, params.orgId, params.userId, params.name, tokenHash, prefix, params.scopes],
  );
  return { id, token, prefix };
}

export async function findOrgBySlug(slug: string): Promise<{ id: string } | null> {
  const pool = getPool();
  const res = await pool.query<{ id: string }>(
    `SELECT id FROM organizations WHERE slug = $1 LIMIT 1`,
    [slug],
  );
  return res.rows[0] ?? null;
}

export async function findUserByEmail(email: string): Promise<{ id: string } | null> {
  const pool = getPool();
  const res = await pool.query<{ id: string }>(
    `SELECT id FROM users WHERE email = $1 LIMIT 1`,
    [email],
  );
  return res.rows[0] ?? null;
}
