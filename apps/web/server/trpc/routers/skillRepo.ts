import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { and, desc, eq, lt } from 'drizzle-orm';
import {
  gitInstallations,
  skillRepos,
  skillRepoSyncs,
  skills,
} from '@cavalry/database';
import { emitAuditEvent } from '@cavalry/audit';
import {
  createGitHubProvider,
  gitHubAppConfigFromEnv,
} from '@cavalry/git-provider';
import { parseCavalryYaml, CAVALRY_YAML_FILES } from '@cavalry/skill-format';
import { router, orgProcedure, adminProcedure } from '../trpc';
import { enqueueGitSync } from '../../jobs';

function repoView(row: typeof skillRepos.$inferSelect) {
  return {
    id: row.id,
    provider: row.provider as 'github' | 'gitlab' | 'bitbucket',
    gitInstallationId: row.gitInstallationId,
    workspaceId: row.workspaceId,
    owner: row.owner,
    repo: row.repo,
    defaultBranch: row.defaultBranch,
    syncStatus: row.syncStatus as
      | 'pending'
      | 'syncing'
      | 'healthy'
      | 'degraded'
      | 'failed',
    lastSyncedAt: row.lastSyncedAt,
    lastSuccessfulSyncAt: row.lastSuccessfulSyncAt,
    lastSyncError: row.lastSyncError,
    enabled: row.enabled,
    createdAt: row.createdAt,
  };
}

function syncView(row: typeof skillRepoSyncs.$inferSelect) {
  return {
    id: row.id,
    skillRepoId: row.skillRepoId,
    trigger: row.trigger as 'webhook' | 'scheduled' | 'manual' | 'initial',
    triggerRef: row.triggerRef,
    status: row.status as 'running' | 'succeeded' | 'partial' | 'failed',
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    versionsDiscovered: row.versionsDiscovered,
    versionsPublished: row.versionsPublished,
    versionsSkipped: row.versionsSkipped,
    errorMessage: row.errorMessage,
    details: row.details,
  };
}

export const skillRepoRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select()
      .from(skillRepos)
      .where(eq(skillRepos.orgId, ctx.org.id))
      .orderBy(desc(skillRepos.createdAt));
    return rows.map(repoView);
  }),

  get: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(skillRepos)
        .where(
          and(
            eq(skillRepos.id, input.id),
            eq(skillRepos.orgId, ctx.org.id),
          ),
        )
        .limit(1);
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      return { ...repoView(row), configSnapshot: row.configSnapshot ?? null };
    }),

  listSyncs: orgProcedure
    .input(
      z.object({
        id: z.string(),
        limit: z.number().min(1).max(100).default(25),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Confirm repo belongs to this org
      const [repo] = await ctx.db
        .select()
        .from(skillRepos)
        .where(
          and(eq(skillRepos.id, input.id), eq(skillRepos.orgId, ctx.org.id)),
        )
        .limit(1);
      if (!repo) throw new TRPCError({ code: 'NOT_FOUND' });

      const whereClause = input.cursor
        ? and(
            eq(skillRepoSyncs.skillRepoId, input.id),
            lt(skillRepoSyncs.startedAt, new Date(input.cursor)),
          )
        : eq(skillRepoSyncs.skillRepoId, input.id);

      const rows = await ctx.db
        .select()
        .from(skillRepoSyncs)
        .where(whereClause)
        .orderBy(desc(skillRepoSyncs.startedAt))
        .limit(input.limit + 1);

      const hasMore = rows.length > input.limit;
      const items = rows.slice(0, input.limit).map(syncView);
      const last = items[items.length - 1];
      return {
        items,
        nextCursor: hasMore && last ? last.startedAt.toISOString() : null,
      };
    }),

  listAvailableRepos: orgProcedure
    .input(z.object({ gitInstallationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const appConfig = gitHubAppConfigFromEnv();
      if (!appConfig) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'GitHub App is not configured',
        });
      }
      const [installation] = await ctx.db
        .select()
        .from(gitInstallations)
        .where(
          and(
            eq(gitInstallations.id, input.gitInstallationId),
            eq(gitInstallations.orgId, ctx.org.id),
          ),
        )
        .limit(1);
      if (!installation) throw new TRPCError({ code: 'NOT_FOUND' });

      const alreadyConnected = await ctx.db
        .select({ owner: skillRepos.owner, repo: skillRepos.repo })
        .from(skillRepos)
        .where(
          and(
            eq(skillRepos.orgId, ctx.org.id),
            eq(skillRepos.gitInstallationId, installation.id),
          ),
        );
      const taken = new Set(
        alreadyConnected.map((r) => `${r.owner}/${r.repo}`),
      );

      const provider = createGitHubProvider(appConfig);
      const results: Array<{
        owner: string;
        repo: string;
        defaultBranch: string;
        private: boolean;
        alreadyConnected: boolean;
        description?: string;
      }> = [];
      for await (const repo of provider.listRepositoriesForInstallation(
        installation.externalId,
      )) {
        results.push({
          owner: repo.owner,
          repo: repo.repo,
          defaultBranch: repo.defaultBranch,
          private: repo.private,
          description: repo.description,
          alreadyConnected: taken.has(`${repo.owner}/${repo.repo}`),
        });
        if (results.length >= 200) break; // UI paginates in-process
      }
      return results;
    }),

  connect: adminProcedure
    .input(
      z.object({
        gitInstallationId: z.string(),
        owner: z.string().min(1).max(255),
        repo: z.string().min(1).max(255),
        workspaceId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [installation] = await ctx.db
        .select()
        .from(gitInstallations)
        .where(
          and(
            eq(gitInstallations.id, input.gitInstallationId),
            eq(gitInstallations.orgId, ctx.org.id),
          ),
        )
        .limit(1);
      if (!installation) throw new TRPCError({ code: 'NOT_FOUND' });

      const appConfig = gitHubAppConfigFromEnv();
      if (!appConfig) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'GitHub App is not configured',
        });
      }
      const provider = createGitHubProvider(appConfig);

      // Resolve default branch by asking GitHub for the repo info via a single
      // commit read at the ref "HEAD". We list tags too just as a sanity check.
      const head = await provider.getCommit({
        installationId: installation.externalId,
        owner: input.owner,
        repo: input.repo,
        sha: 'HEAD',
      });
      if (!head) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Repository not accessible via installation',
        });
      }

      // Probe for cavalry.yaml so we can surface a friendly error before
      // persisting the connection.
      let configFound = false;
      for (const file of CAVALRY_YAML_FILES) {
        const buf = await provider.readFile({
          installationId: installation.externalId,
          owner: input.owner,
          repo: input.repo,
          path: file,
          ref: head.sha,
        });
        if (buf) {
          const parsed = parseCavalryYaml(buf.toString('utf8'));
          if (!parsed.ok) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `${file} is invalid: ${parsed.error.issues[0]?.message ?? parsed.error.message}`,
            });
          }
          configFound = true;
          break;
        }
      }
      if (!configFound) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No cavalry.yaml found on the default branch',
        });
      }

      const [created] = await ctx.db
        .insert(skillRepos)
        .values({
          orgId: ctx.org.id,
          gitInstallationId: installation.id,
          workspaceId: input.workspaceId ?? null,
          provider: 'github',
          owner: input.owner,
          repo: input.repo,
          defaultBranch: 'main',
          syncStatus: 'pending',
        })
        .returning()
        .onConflictDoNothing();

      if (!created) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This repository is already connected to the org',
        });
      }

      await emitAuditEvent({
        orgId: ctx.org.id,
        actor: { type: 'user', userId: ctx.user.id },
        action: 'skill_repo.connected',
        resource: { type: 'skill_repo', id: created.id },
        payload: { owner: input.owner, repo: input.repo },
      });

      await enqueueGitSync({
        skillRepoId: created.id,
        trigger: 'initial',
      });

      return repoView(created);
    }),

  disconnect: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [repo] = await ctx.db
        .select()
        .from(skillRepos)
        .where(
          and(
            eq(skillRepos.id, input.id),
            eq(skillRepos.orgId, ctx.org.id),
          ),
        )
        .limit(1);
      if (!repo) throw new TRPCError({ code: 'NOT_FOUND' });

      await ctx.db
        .update(skillRepos)
        .set({ enabled: false, updatedAt: new Date() })
        .where(eq(skillRepos.id, input.id));

      // Archive the skills sourced from this repo. Versions remain installable.
      await ctx.db
        .update(skills)
        .set({ status: 'archived', updatedAt: new Date() })
        .where(
          and(eq(skills.orgId, ctx.org.id), eq(skills.skillRepoId, input.id)),
        );

      await emitAuditEvent({
        orgId: ctx.org.id,
        actor: { type: 'user', userId: ctx.user.id },
        action: 'skill_repo.disconnected',
        resource: { type: 'skill_repo', id: input.id },
        payload: { owner: repo.owner, repo: repo.repo },
      });

      return { ok: true };
    }),

  triggerSync: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [repo] = await ctx.db
        .select()
        .from(skillRepos)
        .where(
          and(
            eq(skillRepos.id, input.id),
            eq(skillRepos.orgId, ctx.org.id),
          ),
        )
        .limit(1);
      if (!repo) throw new TRPCError({ code: 'NOT_FOUND' });

      await enqueueGitSync({
        skillRepoId: repo.id,
        trigger: 'manual',
      });

      return { ok: true };
    }),
});
