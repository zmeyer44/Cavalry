import { randomBytes, createHash } from 'node:crypto';
import { createId } from '@paralleldrive/cuid2';
import { encrypt } from '@cavalry/registry-upstream';
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

export async function insertPolicy(params: {
  orgId: string;
  name: string;
  type: 'allowlist' | 'blocklist' | 'version_pin' | 'require_approval';
  config: Record<string, unknown>;
  priority?: number;
  enabled?: boolean;
  scopeType?: 'org' | 'workspace';
  scopeId?: string | null;
}): Promise<{ id: string }> {
  const pool = getPool();
  const id = createId();
  await pool.query(
    `INSERT INTO policies (id, org_id, scope_type, scope_id, name, type, config, priority, enabled)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)`,
    [
      id,
      params.orgId,
      params.scopeType ?? 'org',
      params.scopeId ?? null,
      params.name,
      params.type,
      JSON.stringify(params.config),
      params.priority ?? 0,
      params.enabled ?? true,
    ],
  );
  return { id };
}

export async function insertGitInstallation(params: {
  orgId: string;
  userId: string;
  provider?: 'github';
  externalId: string;
  accountLogin: string;
  accountType?: 'user' | 'organization';
}): Promise<{ id: string }> {
  const pool = getPool();
  const id = createId();
  await pool.query(
    `INSERT INTO git_installations (
       id, org_id, provider, external_id, account_login, account_type, installed_by
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
      params.orgId,
      params.provider ?? 'github',
      params.externalId,
      params.accountLogin,
      params.accountType ?? 'organization',
      params.userId,
    ],
  );
  return { id };
}

export async function insertSkillRepo(params: {
  orgId: string;
  gitInstallationId: string;
  owner: string;
  repo: string;
  defaultBranch?: string;
  syncStatus?: 'pending' | 'syncing' | 'healthy' | 'degraded' | 'failed';
}): Promise<{ id: string }> {
  const pool = getPool();
  const id = createId();
  await pool.query(
    `INSERT INTO skill_repos (
       id, org_id, git_installation_id, provider, owner, repo, default_branch, sync_status
     ) VALUES ($1, $2, $3, 'github', $4, $5, $6, $7)`,
    [
      id,
      params.orgId,
      params.gitInstallationId,
      params.owner,
      params.repo,
      params.defaultBranch ?? 'main',
      params.syncStatus ?? 'pending',
    ],
  );
  return { id };
}

export async function findAuditEvents(params: {
  orgId: string;
  action?: string;
}): Promise<Array<{ action: string; payload: Record<string, unknown> }>> {
  const pool = getPool();
  if (params.action) {
    const res = await pool.query<{ action: string; payload: Record<string, unknown> }>(
      `SELECT action, payload FROM audit_events WHERE org_id = $1 AND action = $2 ORDER BY created_at DESC`,
      [params.orgId, params.action],
    );
    return res.rows;
  }
  const res = await pool.query<{ action: string; payload: Record<string, unknown> }>(
    `SELECT action, payload FROM audit_events WHERE org_id = $1 ORDER BY created_at DESC`,
    [params.orgId],
  );
  return res.rows;
}

export async function insertRegistry(params: {
  orgId: string;
  name: string;
  type: 'tessl' | 'github' | 'http' | 'mcp';
  url: string;
  authConfig?: Record<string, unknown>;
  enabled?: boolean;
}): Promise<{ id: string }> {
  const pool = getPool();
  const id = createId();
  const auth =
    params.authConfig && Object.keys(params.authConfig).length > 0
      ? encrypt(params.authConfig)
      : '{}';
  const authJson =
    typeof auth === 'string' && auth.startsWith('v1:') ? JSON.stringify(auth) : auth;
  await pool.query(
    `INSERT INTO registries (id, org_id, name, type, url, auth_config, enabled)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
    [
      id,
      params.orgId,
      params.name,
      params.type,
      params.url,
      authJson,
      params.enabled ?? true,
    ],
  );
  return { id };
}
