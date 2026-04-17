import { Hono } from 'hono';
import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import {
  registries,
  skills,
  skillVersions,
  installs,
} from '@cavalry/database';
import {
  decrypt,
  getAdapter,
  isEnvelope,
  UpstreamError,
  type UpstreamRegistry,
} from '@cavalry/registry-upstream';
import { emitAuditEvent } from '@cavalry/audit';
import { buildStorageKey, getStorageProvider } from '@cavalry/storage';
import type { SkillSource } from '@cavalry/policy';
import { requireToken, requireScope } from '../auth';
import { config } from '../config';
import { logger } from '../logger';
import { enforcePolicy, recordAllowedInstall } from '../pipeline/policy';

function sourceFromRegistryType(type: UpstreamRegistry['type']): SkillSource {
  switch (type) {
    case 'tessl':
      return 'tessl';
    case 'github':
      return 'github_public';
    case 'http':
      return 'http';
    case 'mcp':
      // MCP registries are bundle endpoints, not artifact proxies; we treat
      // them as `http` for policy purposes.
      return 'http';
  }
}

export const proxyRouter = new Hono();
proxyRouter.use('*', requireToken);

// ─── In-memory version-list cache (5 min TTL) ────────────────────────────────

interface VersionsEntry {
  versions: Array<{ version: string; publishedAt?: string | null }>;
  expiresAt: number;
}
const versionsCache = new Map<string, VersionsEntry>();
const VERSIONS_TTL_MS = 5 * 60 * 1000;

function versionsKey(orgId: string, registryId: string, ns: string, name: string): string {
  return `${orgId}:${registryId}:${ns}/${name}`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function loadRegistry(
  db: import('@cavalry/database').Database,
  orgId: string,
  name: string,
): Promise<UpstreamRegistry | null> {
  const [row] = await db
    .select()
    .from(registries)
    .where(and(eq(registries.orgId, orgId), eq(registries.name, name)))
    .limit(1);
  if (!row) return null;
  if (!row.enabled) return null;
  let authConfig: Record<string, unknown> | undefined;
  const raw = row.authConfig as unknown;
  if (raw) {
    if (typeof raw === 'string') {
      authConfig = isEnvelope(raw) ? decrypt<Record<string, unknown>>(raw) : undefined;
    } else if (typeof raw === 'object' && Object.keys(raw as object).length > 0) {
      authConfig = raw as Record<string, unknown>;
    }
  }
  return {
    name: row.name,
    type: row.type as UpstreamRegistry['type'],
    url: row.url,
    authConfig,
  };
}

function upstreamErrorBody(err: unknown) {
  if (err instanceof UpstreamError) {
    return {
      status: err.status >= 500 ? 502 : err.status,
      body: {
        title: err.status === 404 ? 'not_found' : 'upstream_error',
        status: err.status >= 500 ? 502 : err.status,
        detail: err.message,
      },
    };
  }
  return {
    status: 502,
    body: {
      title: 'upstream_error',
      status: 502,
      detail: err instanceof Error ? err.message : String(err),
    },
  };
}

// ─── GET /v1/proxy/:registry/:ns/:name ───────────────────────────────────────

proxyRouter.get(
  '/v1/proxy/:registry/:namespace/:name',
  requireScope('skills:read'),
  async (c) => {
    const auth = c.get('auth');
    const { registry: registryName, namespace, name } = c.req.param();
    const registry = await loadRegistry(auth.db, auth.orgId, registryName);
    if (!registry) {
      return c.json(
        { title: 'not_found', status: 404, detail: `registry "${registryName}" not configured or disabled` },
        404,
      );
    }

    const key = versionsKey(auth.orgId, registryName, namespace, name);
    const cached = versionsCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return c.json({ registry: registryName, namespace, name, versions: cached.versions, cached: true });
    }

    try {
      const adapter = getAdapter(registry);
      const versions = await adapter.listVersions({ namespace, name });
      versionsCache.set(key, { versions, expiresAt: Date.now() + VERSIONS_TTL_MS });
      return c.json({ registry: registryName, namespace, name, versions, cached: false });
    } catch (err) {
      const e = upstreamErrorBody(err);
      void emitAuditEvent({
        orgId: auth.orgId,
        actor: { type: 'token', tokenId: auth.tokenId },
        action: 'registry.fetch_failed',
        resource: { type: 'registry', id: registryName },
        payload: { phase: 'listVersions', namespace, name, status: e.status, detail: e.body.detail },
      }).catch(() => {});
      return c.json(e.body, e.status as 404 | 502);
    }
  },
);

// ─── GET /v1/proxy/:registry/:ns/:name/:version ──────────────────────────────

proxyRouter.get(
  '/v1/proxy/:registry/:namespace/:name/:version',
  requireScope('skills:read'),
  async (c) => {
    const auth = c.get('auth');
    const { registry: registryName, namespace, name, version } = c.req.param();
    const registry = await loadRegistry(auth.db, auth.orgId, registryName);
    if (!registry) {
      return c.json({ title: 'not_found', status: 404, detail: 'registry not configured' }, 404);
    }

    // Cache hit: existing skill_version row from prior proxy
    const [existing] = await auth.db
      .select({
        manifest: skillVersions.manifest,
        version: skillVersions.version,
        artifactHash: skillVersions.artifactHash,
        artifactSizeBytes: skillVersions.artifactSizeBytes,
      })
      .from(skillVersions)
      .innerJoin(skills, eq(skillVersions.skillId, skills.id))
      .where(
        and(
          eq(skills.orgId, auth.orgId),
          eq(skills.namespace, namespace),
          eq(skills.name, name),
          eq(skillVersions.version, version),
        ),
      )
      .limit(1);
    if (existing) {
      return c.json({ ...existing, cached: true });
    }

    try {
      const adapter = getAdapter(registry);
      const manifest = await adapter.fetchManifest({ namespace, name, version });
      return c.json({ manifest: manifest.manifest, version, cached: false });
    } catch (err) {
      const e = upstreamErrorBody(err);
      void emitAuditEvent({
        orgId: auth.orgId,
        actor: { type: 'token', tokenId: auth.tokenId },
        action: 'registry.fetch_failed',
        resource: { type: 'registry', id: registryName },
        payload: { phase: 'fetchManifest', namespace, name, version, status: e.status, detail: e.body.detail },
      }).catch(() => {});
      return c.json(e.body, e.status as 404 | 502);
    }
  },
);

// ─── GET /v1/proxy/:registry/:ns/:name/:version/artifact ─────────────────────

proxyRouter.get(
  '/v1/proxy/:registry/:namespace/:name/:version/artifact',
  requireScope('skills:install'),
  async (c) => {
    const auth = c.get('auth');
    const { registry: registryName, namespace, name, version } = c.req.param();
    const registry = await loadRegistry(auth.db, auth.orgId, registryName);
    if (!registry) {
      return c.json({ title: 'not_found', status: 404, detail: 'registry not configured' }, 404);
    }

    const ref = `${registryName}:${namespace}/${name}@${version}`;
    const userAgent = c.req.header('user-agent') ?? null;
    const projectIdentifier = c.req.header('x-cavalry-project') ?? null;
    const workspaceHdr = c.req.header('x-cavalry-workspace') ?? null;
    const storage = getStorageProvider();

    // Evaluate policy before touching upstream or storage. Denials do not
    // need to hit the network.
    const policy = await enforcePolicy({
      auth,
      context: {
        action: 'install',
        org: { id: auth.orgId },
        workspace: workspaceHdr ? { id: workspaceHdr } : null,
        actor: { userId: auth.userId ?? null, tokenId: auth.tokenId },
        skill: {
          ref,
          namespace,
          name,
          version,
          source: sourceFromRegistryType(registry.type),
        },
      },
      install: {
        skillRef: ref,
        resolvedVersion: version,
        sourceRegistryId: null,
        sourceSkillVersionId: null,
        workspaceId: workspaceHdr,
        projectIdentifier,
        userAgent,
        registryName,
      },
    });
    if (policy.blocked) {
      return new Response(JSON.stringify(policy.body), {
        status: policy.statusCode,
        headers: { 'content-type': 'application/problem+json' },
      });
    }

    // ─── Cache hit: serve from storage ──────────────────────────────────────
    const [cached] = await auth.db
      .select({
        skillId: skills.id,
        versionId: skillVersions.id,
        artifactHash: skillVersions.artifactHash,
        artifactSizeBytes: skillVersions.artifactSizeBytes,
        sourceRegistryId: skills.sourceRegistryId,
      })
      .from(skillVersions)
      .innerJoin(skills, eq(skillVersions.skillId, skills.id))
      .where(
        and(
          eq(skills.orgId, auth.orgId),
          eq(skills.namespace, namespace),
          eq(skills.name, name),
          eq(skillVersions.version, version),
        ),
      )
      .limit(1);

    if (cached) {
      const key = buildStorageKey({
        orgId: auth.orgId,
        kind: 'skill',
        namespace,
        name,
        version,
        hash: cached.artifactHash,
      });
      const got = await storage.get(key);
      if (!got) {
        return c.json({ title: 'not_found', status: 404, detail: 'artifact missing from cache' }, 404);
      }
      recordAllowedInstall({
        auth,
        install: {
          skillRef: ref,
          resolvedVersion: version,
          sourceRegistryId: cached.sourceRegistryId,
          sourceSkillVersionId: cached.versionId,
          workspaceId: workspaceHdr,
          projectIdentifier,
          userAgent,
          cacheHit: true,
          registryName,
        },
        evaluations: policy.evaluations,
        approvalId: policy.approvalId,
        action: 'registry.proxy_hit',
      }).catch((err) => logger.error({ err }, 'failed to record proxied install'));
      c.header('content-type', got.contentType);
      c.header('content-length', String(got.size));
      c.header('x-cavalry-artifact-hash', got.hash);
      c.header('x-cavalry-skill-ref', ref);
      c.header('x-cavalry-cache', 'HIT');
      return new Response(Readable.toWeb(got.body) as unknown as ReadableStream, {
        status: 200,
        headers: c.res.headers,
      });
    }

    // ─── Cache miss: fetch upstream → store → record ────────────────────────
    let buffer: Buffer;
    let manifest: Record<string, unknown> | null = null;
    let upstreamRef: string;
    try {
      const adapter = getAdapter(registry);
      const fetched = await adapter.fetchArtifact({ namespace, name, version });
      upstreamRef = fetched.upstreamRef;
      buffer = await streamToBuffer(fetched.body, config.maxArtifactSize);
      // Best-effort manifest fetch — null on failure (not all adapters require manifest).
      try {
        const m = await adapter.fetchManifest({ namespace, name, version });
        manifest = m.manifest;
      } catch (err) {
        logger.warn({ err, namespace, name, version }, 'manifest fetch failed; storing artifact without manifest');
      }
    } catch (err) {
      const e = upstreamErrorBody(err);
      void emitAuditEvent({
        orgId: auth.orgId,
        actor: { type: 'token', tokenId: auth.tokenId },
        action: 'registry.fetch_failed',
        resource: { type: 'registry', id: registryName },
        payload: { phase: 'fetchArtifact', namespace, name, version, status: e.status, detail: e.body.detail },
      }).catch(() => {});
      return c.json(e.body, e.status as 404 | 502);
    }

    const artifactHash = createHash('sha256').update(buffer).digest('hex');
    const storageKey = buildStorageKey({
      orgId: auth.orgId,
      kind: 'skill',
      namespace,
      name,
      version,
      hash: artifactHash,
    });
    const put = await storage.put(storageKey, buffer, { contentType: 'application/gzip' });

    // Look up the registry id for FK
    const [registryRow] = await auth.db
      .select({ id: registries.id })
      .from(registries)
      .where(and(eq(registries.orgId, auth.orgId), eq(registries.name, registryName)))
      .limit(1);
    const sourceRegistryId = registryRow?.id ?? null;

    // Insert/upsert skill + skill_version
    const versionRow = await auth.db.transaction(async (tx) => {
      const [existingSkill] = await tx
        .select({ id: skills.id })
        .from(skills)
        .where(
          and(
            eq(skills.orgId, auth.orgId),
            eq(skills.namespace, namespace),
            eq(skills.name, name),
          ),
        )
        .limit(1);

      let skillId: string;
      if (existingSkill) {
        skillId = existingSkill.id;
      } else {
        const [created] = await tx
          .insert(skills)
          .values({
            orgId: auth.orgId,
            namespace,
            name,
            description:
              manifest && typeof manifest.description === 'string' ? manifest.description : null,
            visibility: 'private',
            sourceRegistryId,
          })
          .returning({ id: skills.id });
        if (!created) throw new Error('failed to create proxied skill');
        skillId = created.id;
      }

      const [versionInserted] = await tx
        .insert(skillVersions)
        .values({
          skillId,
          version,
          manifest: (manifest ?? {}) as Record<string, unknown>,
          artifactHash: put.hash,
          artifactSizeBytes: put.size,
          publishedBy: null,
          sourceRegistryId,
          upstreamRef,
        })
        .returning();
      if (!versionInserted) throw new Error('failed to insert proxied skill_version');

      await emitAuditEvent({
        orgId: auth.orgId,
        actor: { type: 'token', tokenId: auth.tokenId },
        action: 'registry.proxy_miss',
        resource: { type: 'registry', id: registryName },
        payload: {
          ref,
          hash: put.hash,
          sizeBytes: put.size,
          upstreamRef,
        },
        request: { userAgent: userAgent ?? undefined },
        tx,
      });
      return versionInserted;
    });

    recordAllowedInstall({
      auth,
      install: {
        skillRef: ref,
        resolvedVersion: version,
        sourceRegistryId,
        sourceSkillVersionId: versionRow.id,
        workspaceId: workspaceHdr,
        projectIdentifier,
        userAgent,
        cacheHit: false,
        registryName,
      },
      evaluations: policy.evaluations,
      approvalId: policy.approvalId,
      action: 'skill.installed',
    }).catch((err) => logger.error({ err }, 'failed to record proxied install'));

    c.header('content-type', 'application/gzip');
    c.header('content-length', String(put.size));
    c.header('x-cavalry-artifact-hash', put.hash);
    c.header('x-cavalry-skill-ref', ref);
    c.header('x-cavalry-cache', 'MISS');
    return new Response(new Uint8Array(buffer), { status: 200, headers: c.res.headers });
  },
);

// ─── helpers ──────────────────────────────────────────────────────────────────

async function streamToBuffer(stream: Readable, maxBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of stream) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    total += buf.length;
    if (total > maxBytes) {
      throw new UpstreamError(`upstream artifact exceeds ${maxBytes} bytes`, 413);
    }
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

// Test-only: clear caches between runs.
export function _clearVersionsCache(): void {
  versionsCache.clear();
}
