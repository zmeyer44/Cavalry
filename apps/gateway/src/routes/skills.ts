import { Hono } from 'hono';
import { and, desc, eq } from 'drizzle-orm';
import { Readable } from 'node:stream';
import { skills, skillVersions } from '@cavalry/database';
import { parseManifest, skillRef as formatRef } from '@cavalry/skill-format';
import { emitAuditEvent } from '@cavalry/audit';
import {
  buildStorageKey,
  getStorageProvider,
} from '@cavalry/storage';
import { requireToken, requireScope } from '../auth';
import { config } from '../config';
import { logger } from '../logger';
import { enforcePolicy, recordAllowedInstall } from '../pipeline/policy';
import { resolveWorkspaceHeader } from '../pipeline/workspace';

export const skillsRouter = new Hono();

skillsRouter.use('*', requireToken);

// GET /v1/skills/:namespace/:name
skillsRouter.get('/v1/skills/:namespace/:name', requireScope('skills:read'), async (c) => {
  const auth = c.get('auth');
  const { namespace, name } = c.req.param();
  const [skill] = await auth.db
    .select()
    .from(skills)
    .where(
      and(
        eq(skills.orgId, auth.orgId),
        eq(skills.namespace, namespace),
        eq(skills.name, name),
      ),
    )
    .limit(1);
  if (!skill) return c.json({ title: 'not_found', status: 404, detail: 'Skill not found' }, 404);

  const versions = await auth.db
    .select({
      id: skillVersions.id,
      version: skillVersions.version,
      artifactHash: skillVersions.artifactHash,
      artifactSizeBytes: skillVersions.artifactSizeBytes,
      publishedAt: skillVersions.publishedAt,
    })
    .from(skillVersions)
    .where(eq(skillVersions.skillId, skill.id))
    .orderBy(desc(skillVersions.publishedAt));

  return c.json({
    id: skill.id,
    namespace: skill.namespace,
    name: skill.name,
    description: skill.description,
    visibility: skill.visibility,
    versions,
  });
});

// GET /v1/skills/:namespace/:name/:version
skillsRouter.get(
  '/v1/skills/:namespace/:name/:version',
  requireScope('skills:read'),
  async (c) => {
    const auth = c.get('auth');
    const { namespace, name, version } = c.req.param();
    const [row] = await auth.db
      .select({
        manifest: skillVersions.manifest,
        version: skillVersions.version,
        artifactHash: skillVersions.artifactHash,
        artifactSizeBytes: skillVersions.artifactSizeBytes,
        publishedAt: skillVersions.publishedAt,
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
    if (!row) return c.json({ title: 'not_found', status: 404, detail: 'Version not found' }, 404);
    return c.json(row);
  },
);

// GET /v1/skills/:namespace/:name/:version/artifact
skillsRouter.get(
  '/v1/skills/:namespace/:name/:version/artifact',
  requireScope('skills:install'),
  async (c) => {
    const auth = c.get('auth');
    const { namespace, name, version } = c.req.param();
    const [row] = await auth.db
      .select({
        skillId: skills.id,
        versionId: skillVersions.id,
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
    if (!row) return c.json({ title: 'not_found', status: 404, detail: 'Version not found' }, 404);

    const userAgent = c.req.header('user-agent') ?? null;
    const projectIdentifier = c.req.header('x-cavalry-project') ?? null;
    // Workspace header is caller-supplied; resolve it against the authed org
    // so a token can't claim a workspace in a different tenant. Invalid or
    // cross-org values are silently dropped to null.
    const workspaceHdr = await resolveWorkspaceHeader({
      db: auth.db,
      orgId: auth.orgId,
      header: c.req.header('x-cavalry-workspace') ?? null,
    });
    // Wire ref stays `namespace/name@version` for backward compat (the CLI
    // displays this verbatim). The policy context carries a normalized
    // `internal:` prefix separately so patterns can target internal skills.
    const ref = `${namespace}/${name}@${version}`;

    const policy = await enforcePolicy({
      auth,
      context: {
        action: 'install',
        org: { id: auth.orgId },
        workspace: workspaceHdr ? { id: workspaceHdr } : null,
        actor: { userId: auth.userId ?? null, tokenId: auth.tokenId },
        skill: {
          ref: `internal:${ref}`,
          namespace,
          name,
          version,
          source: 'internal',
        },
      },
      install: {
        skillRef: ref,
        resolvedVersion: version,
        sourceRegistryId: null,
        sourceSkillVersionId: row.versionId,
        workspaceId: workspaceHdr,
        projectIdentifier,
        userAgent,
      },
    });
    if (policy.blocked) {
      return new Response(JSON.stringify(policy.body), {
        status: policy.statusCode,
        headers: { 'content-type': 'application/problem+json' },
      });
    }

    const key = buildStorageKey({
      orgId: auth.orgId,
      kind: 'skill',
      namespace,
      name,
      version,
      hash: row.artifactHash,
    });
    const storage = getStorageProvider();
    const got = await storage.get(key);
    if (!got) {
      return c.json({ title: 'not_found', status: 404, detail: 'Artifact missing' }, 404);
    }

    recordAllowedInstall({
      auth,
      install: {
        skillRef: ref,
        resolvedVersion: version,
        sourceRegistryId: null,
        sourceSkillVersionId: row.versionId,
        workspaceId: workspaceHdr,
        projectIdentifier,
        userAgent,
      },
      evaluations: policy.evaluations,
      approvalId: policy.approvalId,
    }).catch((err) => logger.error({ err }, 'failed to record install'));

    c.header('content-type', got.contentType);
    c.header('content-length', String(got.size));
    c.header('x-cavalry-artifact-hash', got.hash);
    c.header('x-cavalry-skill-ref', ref);

    const webStream = Readable.toWeb(got.body) as unknown as ReadableStream;
    return new Response(webStream, { status: 200, headers: c.res.headers });
  },
);

// POST /v1/skills/:namespace/:name/versions   (multipart: manifest + artifact)
skillsRouter.post(
  '/v1/skills/:namespace/:name/versions',
  requireScope('skills:write'),
  async (c) => {
    const auth = c.get('auth');
    const { namespace, name } = c.req.param();

    let body: Record<string, string | File>;
    try {
      body = await c.req.parseBody();
    } catch {
      return c.json({ title: 'validation_error', status: 422, detail: 'Expected multipart body' }, 422);
    }

    const manifestText = typeof body.manifest === 'string' ? body.manifest : null;
    const artifactFile = body.artifact;

    if (!manifestText) {
      return c.json({ title: 'validation_error', status: 422, detail: 'Missing manifest field' }, 422);
    }
    if (!(artifactFile instanceof File)) {
      return c.json({ title: 'validation_error', status: 422, detail: 'Missing artifact file' }, 422);
    }
    if (artifactFile.size > config.maxArtifactSize) {
      return c.json(
        {
          title: 'validation_error',
          status: 413,
          detail: `Artifact exceeds max size of ${config.maxArtifactSize} bytes`,
        },
        413,
      );
    }

    let manifestJson: unknown;
    try {
      manifestJson = JSON.parse(manifestText);
    } catch {
      return c.json({ title: 'validation_error', status: 422, detail: 'manifest is not valid JSON' }, 422);
    }

    const parsed = parseManifest(manifestJson);
    if (!parsed.ok) {
      return c.json(
        {
          title: 'validation_error',
          status: 422,
          detail: parsed.error.message,
          issues: parsed.error.issues,
        },
        422,
      );
    }
    const manifest = parsed.value;

    if (manifest.namespace !== namespace || manifest.name !== name) {
      return c.json(
        {
          title: 'validation_error',
          status: 422,
          detail: `Manifest namespace/name (${manifest.namespace}/${manifest.name}) must match URL (${namespace}/${name})`,
        },
        422,
      );
    }

    // Upsert skill row
    const [existingSkill] = await auth.db
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
      if (manifest.description) {
        await auth.db
          .update(skills)
          .set({ description: manifest.description, updatedAt: new Date() })
          .where(eq(skills.id, skillId));
      }
    } else {
      const [created] = await auth.db
        .insert(skills)
        .values({
          orgId: auth.orgId,
          namespace,
          name,
          description: manifest.description,
          visibility: 'private',
        })
        .returning({ id: skills.id });
      if (!created) {
        return c.json({ title: 'internal_error', status: 500, detail: 'Failed to create skill' }, 500);
      }
      skillId = created.id;
    }

    // Check for version collision
    const [collision] = await auth.db
      .select({ id: skillVersions.id })
      .from(skillVersions)
      .where(and(eq(skillVersions.skillId, skillId), eq(skillVersions.version, manifest.version)))
      .limit(1);
    if (collision) {
      return c.json(
        {
          title: 'conflict',
          status: 409,
          detail: `Version ${manifest.version} already published`,
        },
        409,
      );
    }

    const buffer = Buffer.from(await artifactFile.arrayBuffer());
    const { computeArtifactHash } = await import('@cavalry/skill-format');
    const artifactHash = await computeArtifactHash(buffer);
    const storage = getStorageProvider();
    const finalKey = buildStorageKey({
      orgId: auth.orgId,
      kind: 'skill',
      namespace,
      name,
      version: manifest.version,
      hash: artifactHash,
    });
    const put = await storage.put(finalKey, buffer, { contentType: 'application/gzip' });

    const created = await auth.db.transaction(async (tx) => {
      if (!auth.userId) {
        throw new Error('Publishing requires a user-bound token');
      }
      const [version] = await tx
        .insert(skillVersions)
        .values({
          skillId,
          version: manifest.version,
          manifest: manifest as unknown as Record<string, unknown>,
          artifactHash: put.hash,
          artifactSizeBytes: put.size,
          publishedBy: auth.userId,
        })
        .returning();
      if (!version) throw new Error('Failed to insert skill_version');

      await emitAuditEvent({
        orgId: auth.orgId,
        actor: { type: 'user', userId: auth.userId },
        action: 'skill.published',
        resource: { type: 'skill_version', id: version.id },
        payload: {
          ref: formatRef(manifest),
          hash: put.hash,
          sizeBytes: put.size,
          viaToken: auth.tokenId,
        },
        request: { userAgent: c.req.header('user-agent') ?? undefined },
        tx,
      });
      return version;
    });

    return c.json(
      {
        id: created.id,
        skillId,
        namespace,
        name,
        version: manifest.version,
        artifactHash: put.hash,
        artifactSizeBytes: put.size,
      },
      201,
    );
  },
);
