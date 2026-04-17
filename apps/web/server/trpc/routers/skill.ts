import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { and, desc, eq, sql, gte, lte, count, inArray } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { PassThrough } from 'node:stream';
import tarStream from 'tar-stream';
import { skills, skillVersions, installs, users } from '@cavalry/database';
import { namespaceSchema, skillNameSchema } from '@cavalry/common';
import { parseManifest, type SkillManifest } from '@cavalry/skill-format';
import { buildStorageKey, getStorageProvider } from '@cavalry/storage';
import { emitAuditEvent } from '@cavalry/audit';
import { router, orgProcedure, adminProcedure } from '../trpc';

export const skillRouter = router({
  list: orgProcedure
    .input(
      z
        .object({
          query: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const latestSubquery = ctx.db
        .select({
          skillId: skillVersions.skillId,
          latestVersion: sql<string>`max(${skillVersions.version})`.as('latest_version'),
          latestAt: sql<Date>`max(${skillVersions.publishedAt})`.as('latest_at'),
          versionCount: sql<number>`count(${skillVersions.id})::int`.as('version_count'),
        })
        .from(skillVersions)
        .groupBy(skillVersions.skillId)
        .as('latest');

      const rows = await ctx.db
        .select({
          id: skills.id,
          namespace: skills.namespace,
          name: skills.name,
          description: skills.description,
          sourceRegistryId: skills.sourceRegistryId,
          createdAt: skills.createdAt,
          latestVersion: latestSubquery.latestVersion,
          latestAt: latestSubquery.latestAt,
          versionCount: latestSubquery.versionCount,
        })
        .from(skills)
        .leftJoin(latestSubquery, eq(latestSubquery.skillId, skills.id))
        .where(eq(skills.orgId, ctx.org.id))
        .orderBy(desc(skills.updatedAt))
        .limit(limit);
      return rows;
    }),

  get: orgProcedure
    .input(z.object({ namespace: namespaceSchema, name: skillNameSchema }))
    .query(async ({ ctx, input }) => {
      const [skill] = await ctx.db
        .select()
        .from(skills)
        .where(
          and(
            eq(skills.orgId, ctx.org.id),
            eq(skills.namespace, input.namespace),
            eq(skills.name, input.name),
          ),
        )
        .limit(1);
      if (!skill) throw new TRPCError({ code: 'NOT_FOUND' });
      return skill;
    }),

  listVersions: orgProcedure
    .input(z.object({ namespace: namespaceSchema, name: skillNameSchema }))
    .query(async ({ ctx, input }) => {
      const [skill] = await ctx.db
        .select({ id: skills.id })
        .from(skills)
        .where(
          and(
            eq(skills.orgId, ctx.org.id),
            eq(skills.namespace, input.namespace),
            eq(skills.name, input.name),
          ),
        )
        .limit(1);
      if (!skill) throw new TRPCError({ code: 'NOT_FOUND' });
      return ctx.db
        .select({
          id: skillVersions.id,
          version: skillVersions.version,
          artifactHash: skillVersions.artifactHash,
          artifactSizeBytes: skillVersions.artifactSizeBytes,
          publishedAt: skillVersions.publishedAt,
          publisherId: skillVersions.publishedBy,
          publisherEmail: users.email,
        })
        .from(skillVersions)
        .leftJoin(users, eq(users.id, skillVersions.publishedBy))
        .where(eq(skillVersions.skillId, skill.id))
        .orderBy(desc(skillVersions.publishedAt));
    }),

  diffVersions: orgProcedure
    .input(
      z.object({
        namespace: namespaceSchema,
        name: skillNameSchema,
        versionA: z.string().min(1).max(64),
        versionB: z.string().min(1).max(64),
      }),
    )
    .query(async ({ ctx, input }) => {
      const [skill] = await ctx.db
        .select({ id: skills.id })
        .from(skills)
        .where(
          and(
            eq(skills.orgId, ctx.org.id),
            eq(skills.namespace, input.namespace),
            eq(skills.name, input.name),
          ),
        )
        .limit(1);
      if (!skill) throw new TRPCError({ code: 'NOT_FOUND' });

      const rows = await ctx.db
        .select()
        .from(skillVersions)
        .where(
          and(
            eq(skillVersions.skillId, skill.id),
            inArray(skillVersions.version, [input.versionA, input.versionB]),
          ),
        );
      const a = rows.find((r) => r.version === input.versionA);
      const b = rows.find((r) => r.version === input.versionB);
      if (!a || !b) throw new TRPCError({ code: 'NOT_FOUND' });
      return {
        a: {
          version: a.version,
          publishedAt: a.publishedAt,
          artifactHash: a.artifactHash,
          artifactSizeBytes: a.artifactSizeBytes,
          manifest: a.manifest,
        },
        b: {
          version: b.version,
          publishedAt: b.publishedAt,
          artifactHash: b.artifactHash,
          artifactSizeBytes: b.artifactSizeBytes,
          manifest: b.manifest,
        },
      };
    }),

  publishInline: adminProcedure
    .input(
      z.object({
        namespace: namespaceSchema,
        name: skillNameSchema,
        version: z.string().min(1).max(64),
        description: z.string().min(1).max(2000).optional(),
        skillMarkdown: z.string().min(1).max(200_000),
        rules: z
          .array(
            z.object({
              path: z
                .string()
                .min(1)
                .max(255)
                .regex(/^[a-z0-9][a-z0-9/_.-]*\.md$/, 'rule files must be markdown'),
              content: z.string().min(1).max(200_000),
            }),
          )
          .max(32)
          .optional(),
        targets: z
          .array(
            z.enum(['claude-code', 'cursor', 'codex', 'windsurf', 'aider', 'generic']),
          )
          .min(1)
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const manifest: SkillManifest = {
        name: input.name,
        namespace: input.namespace,
        version: input.version,
        description: input.description,
        targets: input.targets ?? ['claude-code'],
        entrypoints: {
          skill: 'SKILL.md',
          rules: input.rules?.map((r) => r.path),
        },
      };
      const parsed = parseManifest(manifest);
      if (!parsed.ok) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: parsed.error.issues
            .map((i) => `${i.path}: ${i.message}`)
            .join('; '),
        });
      }

      const [existingSkill] = await ctx.db
        .select({ id: skills.id, source: skills.source })
        .from(skills)
        .where(
          and(
            eq(skills.orgId, ctx.org.id),
            eq(skills.namespace, input.namespace),
            eq(skills.name, input.name),
          ),
        )
        .limit(1);

      if (existingSkill && existingSkill.source !== 'direct') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `${input.namespace}/${input.name} is already owned by another source in this org`,
        });
      }

      // Pack tarball in-memory. Deterministic mtime so hashes don't drift
      // on retry.
      const pack = tarStream.pack();
      const chunks: Buffer[] = [];
      const collector = new PassThrough();
      collector.on('data', (c: Buffer) => chunks.push(c));
      const gzip = createGzip({ level: 9 });
      const pipelineDone = pipeline(pack, gzip, collector);

      const entries: Array<{ path: string; content: string }> = [
        { path: 'skill.json', content: JSON.stringify(parsed.value, null, 2) },
        { path: 'SKILL.md', content: input.skillMarkdown },
      ];
      for (const r of input.rules ?? []) entries.push(r);
      entries.sort((a, b) => a.path.localeCompare(b.path));

      for (const e of entries) {
        const buf = Buffer.from(e.content, 'utf8');
        await new Promise<void>((resolve, reject) => {
          pack.entry(
            {
              name: e.path,
              size: buf.length,
              mode: 0o644,
              mtime: new Date(0),
              uid: 0,
              gid: 0,
              uname: '',
              gname: '',
              type: 'file',
            },
            buf,
            (err) => (err ? reject(err) : resolve()),
          );
        });
      }
      pack.finalize();
      await pipelineDone;
      const body = Buffer.concat(chunks);
      const artifactHash = createHash('sha256').update(body).digest('hex');

      // Version collision check.
      if (existingSkill) {
        const [collision] = await ctx.db
          .select({ id: skillVersions.id })
          .from(skillVersions)
          .where(
            and(
              eq(skillVersions.skillId, existingSkill.id),
              eq(skillVersions.version, input.version),
            ),
          )
          .limit(1);
        if (collision) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `Version ${input.version} already published`,
          });
        }
      }

      const storage = getStorageProvider();
      const storageKey = buildStorageKey({
        orgId: ctx.org.id,
        kind: 'skill',
        namespace: input.namespace,
        name: input.name,
        version: input.version,
        hash: artifactHash,
      });
      await storage.put(storageKey, body, { contentType: 'application/gzip' });

      const created = await ctx.db.transaction(async (tx) => {
        let skillId: string;
        if (existingSkill) {
          skillId = existingSkill.id;
          await tx
            .update(skills)
            .set({ description: input.description ?? null, updatedAt: new Date() })
            .where(eq(skills.id, skillId));
        } else {
          const [row] = await tx
            .insert(skills)
            .values({
              orgId: ctx.org.id,
              namespace: input.namespace,
              name: input.name,
              description: input.description ?? null,
              visibility: 'private',
              source: 'direct',
            })
            .returning({ id: skills.id });
          if (!row) throw new Error('failed to create skill');
          skillId = row.id;
        }

        const [version] = await tx
          .insert(skillVersions)
          .values({
            skillId,
            version: input.version,
            manifest: parsed.value as unknown as Record<string, unknown>,
            artifactHash,
            artifactSizeBytes: body.length,
            publishedBy: ctx.user.id,
            sourceKind: 'direct_publish',
          })
          .returning();
        if (!version) throw new Error('failed to create skill_version');

        await emitAuditEvent({
          orgId: ctx.org.id,
          actor: { type: 'user', userId: ctx.user.id },
          action: 'skill.published',
          resource: { type: 'skill_version', id: version.id },
          payload: {
            ref: `${input.namespace}/${input.name}@${input.version}`,
            hash: artifactHash,
            sizeBytes: body.length,
            via: 'ui',
          },
          tx,
        });
        return version;
      });

      return {
        id: created.id,
        namespace: input.namespace,
        name: input.name,
        version: input.version,
        artifactHash,
        artifactSizeBytes: body.length,
      };
    }),

  /**
   * SBOM: the set of skill_versions installed via a workspace or project
   * identifier as of a given timestamp. For each (skill, version) we report
   * the most recent allowed install and the corresponding artifact hash.
   * Callers get a flat list suitable for CSV/JSON export into an SBOM tool.
   */
  sbom: orgProcedure
    .input(
      z.object({
        workspaceId: z.string().optional(),
        projectIdentifier: z.string().optional(),
        asOf: z.string().datetime().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const asOf = input.asOf ? new Date(input.asOf) : new Date();
      const conditions = [
        eq(installs.orgId, ctx.org.id),
        eq(installs.result, 'allowed'),
        lte(installs.createdAt, asOf),
      ];
      if (input.workspaceId) {
        conditions.push(eq(installs.workspaceId, input.workspaceId));
      }
      if (input.projectIdentifier) {
        conditions.push(eq(installs.projectIdentifier, input.projectIdentifier));
      }

      const rows = await ctx.db
        .select({
          namespace: skills.namespace,
          name: skills.name,
          version: skillVersions.version,
          artifactHash: skillVersions.artifactHash,
          artifactSizeBytes: skillVersions.artifactSizeBytes,
          lastInstalledAt: installs.createdAt,
          source: skills.source,
          sourceRegistryId: skills.sourceRegistryId,
        })
        .from(installs)
        .innerJoin(skillVersions, eq(skillVersions.id, installs.sourceSkillVersionId))
        .innerJoin(skills, eq(skills.id, skillVersions.skillId))
        .where(and(...conditions))
        .orderBy(
          skills.namespace,
          skills.name,
          skillVersions.version,
          desc(installs.createdAt),
        );

      // Collapse to distinct (ns, name, version) — keep the newest install per
      // tuple since rows are sorted by createdAt desc within each group.
      const seen = new Set<string>();
      const items: Array<{
        namespace: string;
        name: string;
        version: string;
        artifactHash: string;
        artifactSizeBytes: number;
        lastInstalledAt: Date;
        source: string;
        sourceRegistryId: string | null;
      }> = [];
      for (const r of rows) {
        const key = `${r.namespace}/${r.name}@${r.version}`;
        if (seen.has(key)) continue;
        seen.add(key);
        items.push({
          namespace: r.namespace,
          name: r.name,
          version: r.version,
          artifactHash: r.artifactHash,
          artifactSizeBytes: Number(r.artifactSizeBytes),
          lastInstalledAt: r.lastInstalledAt,
          source: r.source,
          sourceRegistryId: r.sourceRegistryId,
        });
      }

      return {
        asOf,
        workspaceId: input.workspaceId ?? null,
        projectIdentifier: input.projectIdentifier ?? null,
        items,
      };
    }),

  getUsage: orgProcedure
    .input(
      z.object({
        namespace: namespaceSchema,
        name: skillNameSchema,
        window: z.enum(['7d', '30d', '90d']).default('30d'),
      }),
    )
    .query(async ({ ctx, input }) => {
      const [skill] = await ctx.db
        .select({ id: skills.id })
        .from(skills)
        .where(
          and(
            eq(skills.orgId, ctx.org.id),
            eq(skills.namespace, input.namespace),
            eq(skills.name, input.name),
          ),
        )
        .limit(1);
      if (!skill) throw new TRPCError({ code: 'NOT_FOUND' });

      const days = input.window === '7d' ? 7 : input.window === '30d' ? 30 : 90;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const refPrefix = `${input.namespace}/${input.name}`;

      const [totals] = await ctx.db
        .select({ installs: count() })
        .from(installs)
        .where(
          and(
            eq(installs.orgId, ctx.org.id),
            eq(installs.skillRef, `${refPrefix}@latest`),
            gte(installs.createdAt, since),
          ),
        );

      const [byRef] = await ctx.db
        .select({ installs: count() })
        .from(installs)
        .where(
          and(
            eq(installs.orgId, ctx.org.id),
            sql`${installs.skillRef} LIKE ${`${refPrefix}@%`}`,
            gte(installs.createdAt, since),
          ),
        );

      return {
        window: input.window,
        totalInstalls: byRef?.installs ?? 0,
        latestInstalls: totals?.installs ?? 0,
      };
    }),
});
