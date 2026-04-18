import { eq, and, sql } from 'drizzle-orm';
import {
  getDb,
  skillRepos,
  skillRepoSyncs,
  skills,
  skillVersions,
  gitInstallations,
  type Database,
} from '@cavalry/database';
import {
  parseCavalryYaml,
  parseManifest,
  CAVALRY_YAML_FILES,
  type CavalryYaml,
} from '@cavalry/skill-format';
import { emitAuditEvent } from '@cavalry/audit';
import {
  createGitHubProvider,
  gitHubAppConfigFromEnv,
  type GitProvider,
  type Tag,
} from '@cavalry/git-provider';
import { getStorageProvider, buildStorageKey } from '@cavalry/storage';
import { planSync, type SkillVersionSummary } from './plan';
import { buildSkillArtifact, toReadable } from './archive';
import { acquireSyncLock } from './lock';
import type { GitSyncJobPayload, SyncTrigger } from './queue';

export interface SyncResult {
  syncId: string;
  status: 'succeeded' | 'partial' | 'failed' | 'skipped';
  versionsPublished: number;
  versionsSkipped: number;
  errors: Array<{ tagName?: string; message: string }>;
}

/** Mutable cache shared across this module so we don't recreate providers. */
let providerSingleton: GitProvider | null = null;
function getGitProvider(): GitProvider | null {
  if (providerSingleton) return providerSingleton;
  const cfg = gitHubAppConfigFromEnv();
  if (!cfg) return null;
  providerSingleton = createGitHubProvider(cfg);
  return providerSingleton;
}

/** Test hook — reset the provider cache and optionally set an override. */
export function setGitProviderForTests(p: GitProvider | null): void {
  providerSingleton = p;
}

/**
 * Top-level entrypoint used by the worker's pg-boss consumer.
 * Loads the skill_repo + installation context and dispatches to syncRepo.
 */
export async function runSyncJob(
  payload: GitSyncJobPayload,
): Promise<SyncResult> {
  const provider = getGitProvider();
  if (!provider) {
    return {
      syncId: '',
      status: 'failed',
      versionsPublished: 0,
      versionsSkipped: 0,
      errors: [{ message: 'No git provider configured (check CAVALRY_GITHUB_APP_* env)' }],
    };
  }
  return syncRepo({ ...payload, provider });
}

export interface SyncRepoParams extends GitSyncJobPayload {
  provider: GitProvider;
}

export async function syncRepo(params: SyncRepoParams): Promise<SyncResult> {
  const db = getDb();
  const release = await acquireSyncLock(params.skillRepoId);
  if (!release) {
    // Another worker holds the lock — drop silently; pg-boss will retry.
    return {
      syncId: '',
      status: 'skipped',
      versionsPublished: 0,
      versionsSkipped: 0,
      errors: [{ message: 'another sync is already running for this repo' }],
    };
  }

  try {
    const repoRow = await db
      .select()
      .from(skillRepos)
      .where(eq(skillRepos.id, params.skillRepoId))
      .limit(1);
    const repo = repoRow[0];
    if (!repo) {
      return {
        syncId: '',
        status: 'failed',
        versionsPublished: 0,
        versionsSkipped: 0,
        errors: [{ message: `skill_repo ${params.skillRepoId} not found` }],
      };
    }

    const installationRow = await db
      .select()
      .from(gitInstallations)
      .where(eq(gitInstallations.id, repo.gitInstallationId))
      .limit(1);
    const installation = installationRow[0];
    if (!installation) {
      return {
        syncId: '',
        status: 'failed',
        versionsPublished: 0,
        versionsSkipped: 0,
        errors: [{ message: 'git installation missing or revoked' }],
      };
    }

    const [syncRow] = await db
      .insert(skillRepoSyncs)
      .values({
        skillRepoId: repo.id,
        trigger: params.trigger,
        triggerRef: params.triggerRef ?? null,
        status: 'running',
      })
      .returning();

    if (!syncRow) throw new Error('failed to insert sync row');

    await emitAuditEvent({
      orgId: repo.orgId,
      actor: { type: 'system' },
      action: 'skill_repo.sync_started',
      resource: { type: 'skill_repo', id: repo.id },
      payload: { syncId: syncRow.id, trigger: params.trigger },
    });

    try {
      const outcome = await runSyncForRepo({
        db,
        provider: params.provider,
        repo,
        installation,
        syncRow,
      });

      await db
        .update(skillRepoSyncs)
        .set({
          status: outcome.status,
          completedAt: new Date(),
          versionsDiscovered: outcome.versionsDiscovered,
          versionsPublished: outcome.versionsPublished,
          versionsSkipped: outcome.versionsSkipped,
          errorMessage: outcome.errorMessage ?? null,
          commitShaAfter: outcome.commitShaAfter ?? null,
          details: outcome.details,
        })
        .where(eq(skillRepoSyncs.id, syncRow.id));

      const statusForRepo =
        outcome.status === 'succeeded' ? 'healthy' : outcome.status === 'partial' ? 'degraded' : 'failed';

      await db
        .update(skillRepos)
        .set({
          syncStatus:
            repo.syncStatus === 'degraded' && outcome.status === 'succeeded'
              ? 'degraded'
              : statusForRepo,
          lastSyncedAt: new Date(),
          lastSuccessfulSyncAt: outcome.status === 'succeeded' ? new Date() : repo.lastSuccessfulSyncAt,
          lastSyncError: outcome.status === 'failed' ? outcome.errorMessage ?? 'sync failed' : null,
          updatedAt: new Date(),
        })
        .where(eq(skillRepos.id, repo.id));

      await emitAuditEvent({
        orgId: repo.orgId,
        actor: { type: 'system' },
        action:
          outcome.status === 'succeeded'
            ? 'skill_repo.sync_succeeded'
            : outcome.status === 'partial'
              ? 'skill_repo.sync_partial'
              : 'skill_repo.sync_failed',
        resource: { type: 'skill_repo', id: repo.id },
        payload: {
          syncId: syncRow.id,
          versionsPublished: outcome.versionsPublished,
          versionsSkipped: outcome.versionsSkipped,
          errors: outcome.errors,
        },
      });

      return {
        syncId: syncRow.id,
        status: outcome.status,
        versionsPublished: outcome.versionsPublished,
        versionsSkipped: outcome.versionsSkipped,
        errors: outcome.errors,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await db
        .update(skillRepoSyncs)
        .set({
          status: 'failed',
          completedAt: new Date(),
          errorMessage: message,
        })
        .where(eq(skillRepoSyncs.id, syncRow.id));
      await db
        .update(skillRepos)
        .set({
          syncStatus: 'failed',
          lastSyncedAt: new Date(),
          lastSyncError: message,
          updatedAt: new Date(),
        })
        .where(eq(skillRepos.id, repo.id));
      await emitAuditEvent({
        orgId: repo.orgId,
        actor: { type: 'system' },
        action: 'skill_repo.sync_failed',
        resource: { type: 'skill_repo', id: repo.id },
        payload: { syncId: syncRow.id, error: message },
      });
      return {
        syncId: syncRow.id,
        status: 'failed',
        versionsPublished: 0,
        versionsSkipped: 0,
        errors: [{ message }],
      };
    }
  } finally {
    await release();
  }
}

interface SyncInternalOutcome {
  status: 'succeeded' | 'partial' | 'failed';
  versionsDiscovered: number;
  versionsPublished: number;
  versionsSkipped: number;
  errors: Array<{ tagName?: string; message: string }>;
  errorMessage?: string;
  commitShaAfter?: string;
  details: Record<string, unknown>;
}

async function runSyncForRepo(args: {
  db: Database;
  provider: GitProvider;
  repo: typeof skillRepos.$inferSelect;
  installation: typeof gitInstallations.$inferSelect;
  syncRow: typeof skillRepoSyncs.$inferSelect;
}): Promise<SyncInternalOutcome> {
  const { db, provider, repo, installation, syncRow } = args;
  const errors: Array<{ tagName?: string; message: string }> = [];

  const config = await loadConfig(provider, repo, installation);
  if (!config) {
    return {
      status: 'failed',
      versionsDiscovered: 0,
      versionsPublished: 0,
      versionsSkipped: 0,
      errors: [{ message: 'cavalry.yaml missing or unreadable' }],
      errorMessage: 'cavalry.yaml missing or unreadable',
      details: {},
    };
  }
  if (!config.parsed.ok) {
    return {
      status: 'failed',
      versionsDiscovered: 0,
      versionsPublished: 0,
      versionsSkipped: 0,
      errors: [{ message: `invalid cavalry.yaml: ${config.parsed.error.message}` }],
      errorMessage: config.parsed.error.message,
      details: { issues: config.parsed.error.issues },
    };
  }

  // Persist updated config snapshot if changed.
  if (
    !repo.configCommitSha ||
    repo.configCommitSha !== config.commitSha
  ) {
    await db
      .update(skillRepos)
      .set({
        configSnapshot: config.parsed.value as unknown as Record<string, unknown>,
        configCommitSha: config.commitSha,
        updatedAt: new Date(),
      })
      .where(eq(skillRepos.id, repo.id));
    await emitAuditEvent({
      orgId: repo.orgId,
      actor: { type: 'system' },
      action: 'skill_repo.config_updated',
      resource: { type: 'skill_repo', id: repo.id },
      payload: { commitSha: config.commitSha },
    });
  }

  // Load tags.
  const tags: Tag[] = [];
  for await (const tag of provider.listTags({
    installationId: installation.externalId,
    owner: repo.owner,
    repo: repo.repo,
  })) {
    tags.push(tag);
  }

  // Load currently published versions for this repo.
  const existingVersions = await db
    .select({
      namespace: skills.namespace,
      name: skills.name,
      version: skillVersions.version,
      sourceCommitSha: skillVersions.sourceCommitSha,
    })
    .from(skillVersions)
    .innerJoin(skills, eq(skills.id, skillVersions.skillId))
    .where(
      and(
        eq(skills.skillRepoId, repo.id),
        eq(skillVersions.sourceKind, 'git_tag'),
      ),
    );

  const plan = planSync({
    config: config.parsed.value,
    tags,
    currentVersions: existingVersions.map((v): SkillVersionSummary => ({
      namespace: v.namespace,
      name: v.name,
      version: v.version,
      sourceCommitSha: v.sourceCommitSha,
    })),
  });

  // Handle force-pushed tags first — security event, no mutation.
  for (const fp of plan.forcePushed) {
    errors.push({
      tagName: fp.tagName,
      message: `tag force-pushed: was ${fp.previousSha}, now ${fp.currentSha}`,
    });
    await emitAuditEvent({
      orgId: repo.orgId,
      actor: { type: 'system' },
      action: 'skill_repo.force_push_detected',
      resource: { type: 'skill_repo', id: repo.id },
      payload: {
        tag: fp.tagName,
        previousSha: fp.previousSha,
        currentSha: fp.currentSha,
        skill: fp.skillBasename,
        version: fp.version,
      },
    });
  }

  let published = 0;
  let skipped = plan.skipped.length;
  const perTagDetails: Array<Record<string, unknown>> = [];

  for (const planned of plan.toPublish) {
    try {
      await publishVersion({
        db,
        provider,
        installationExternalId: installation.externalId,
        repo,
        config: config.parsed.value,
        syncId: syncRow.id,
        planned,
      });
      published += 1;
      perTagDetails.push({ tag: planned.tagName, status: 'published' });
    } catch (err) {
      skipped += 1;
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ tagName: planned.tagName, message });
      perTagDetails.push({ tag: planned.tagName, status: 'skipped', error: message });
    }
  }

  const status: SyncInternalOutcome['status'] =
    errors.length > 0 || plan.forcePushed.length > 0 ? 'partial' : 'succeeded';

  return {
    status: errors.length > 0 && published === 0 && plan.forcePushed.length === 0 ? 'failed' : status,
    versionsDiscovered: plan.toPublish.length + plan.skipped.length + plan.forcePushed.length,
    versionsPublished: published,
    versionsSkipped: skipped,
    errors,
    commitShaAfter: config.commitSha,
    details: {
      plan: {
        toPublish: plan.toPublish.length,
        forcePushed: plan.forcePushed.length,
        skipped: plan.skipped,
      },
      perTag: perTagDetails,
    },
  };
}

async function loadConfig(
  provider: GitProvider,
  repo: typeof skillRepos.$inferSelect,
  installation: typeof gitInstallations.$inferSelect,
): Promise<
  | {
      parsed: ReturnType<typeof parseCavalryYaml>;
      commitSha: string;
      file: string;
    }
  | null
> {
  // Resolve the default branch HEAD commit for reproducible reads.
  const head = await provider.getCommit({
    installationId: installation.externalId,
    owner: repo.owner,
    repo: repo.repo,
    sha: repo.defaultBranch,
  });
  if (!head) return null;

  for (const file of CAVALRY_YAML_FILES) {
    const buf = await provider.readFile({
      installationId: installation.externalId,
      owner: repo.owner,
      repo: repo.repo,
      path: file,
      ref: head.sha,
    });
    if (buf) {
      return { parsed: parseCavalryYaml(buf.toString('utf8')), commitSha: head.sha, file };
    }
  }
  return null;
}

async function publishVersion(args: {
  db: Database;
  provider: GitProvider;
  installationExternalId: string;
  repo: typeof skillRepos.$inferSelect;
  config: CavalryYaml;
  syncId: string;
  planned: {
    tagName: string;
    commitSha: string;
    skillBasename: string;
    version: string;
  };
}): Promise<void> {
  const { db, provider, installationExternalId, repo, config, syncId, planned } = args;

  // Locate the skill directory inside the repo by checking each configured
  // glob; take the first match.
  let skillPath: string | null = null;
  for (const entry of config.skills) {
    const candidate = entry.path.replace('*', planned.skillBasename);
    const probe = await provider.readFile({
      installationId: installationExternalId,
      owner: repo.owner,
      repo: repo.repo,
      path: `${candidate}/skill.json`,
      ref: planned.commitSha,
    });
    if (probe) {
      skillPath = candidate;
      break;
    }
  }
  if (!skillPath) {
    throw new Error(
      `skill directory for "${planned.skillBasename}" not found at ${planned.commitSha}`,
    );
  }

  // Read + validate manifest.
  const manifestBuf = await provider.readFile({
    installationId: installationExternalId,
    owner: repo.owner,
    repo: repo.repo,
    path: `${skillPath}/skill.json`,
    ref: planned.commitSha,
  });
  if (!manifestBuf) throw new Error('skill.json disappeared');

  let manifestJson: unknown;
  try {
    manifestJson = JSON.parse(manifestBuf.toString('utf8'));
  } catch (err) {
    throw new Error(
      `invalid skill.json: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // Inject defaults from cavalry.yaml if the manifest omits them.
  const merged = {
    namespace: config.defaults.namespace,
    license: config.defaults.license,
    targets: config.defaults.targets,
    ...(manifestJson as Record<string, unknown>),
    name: (manifestJson as Record<string, unknown>).name ?? planned.skillBasename,
    version: planned.version,
  };
  const parsed = parseManifest(merged);
  if (!parsed.ok) {
    throw new Error(
      `manifest validation failed: ${parsed.error.issues
        .map((i) => `${i.path}: ${i.message}`)
        .join('; ')}`,
    );
  }

  // Build the tarball.
  const artifact = await buildSkillArtifact({
    provider,
    installationId: installationExternalId,
    owner: repo.owner,
    repo: repo.repo,
    ref: planned.commitSha,
    skillPath,
    ignorePatterns: config.sync?.ignore ?? [],
  });

  // Write to content-addressed storage.
  const storage = getStorageProvider();
  const storageKey = buildStorageKey({
    orgId: repo.orgId,
    kind: 'skill',
    namespace: parsed.value.namespace,
    name: parsed.value.name,
    version: parsed.value.version,
    hash: artifact.hash,
  });
  await storage.put(storageKey, toReadable(artifact.body), {
    contentType: 'application/gzip',
  });

  // Upsert skill row + insert skill_version in a transaction.
  await db.transaction(async (tx) => {
    const existingSkill = await tx
      .select()
      .from(skills)
      .where(
        and(
          eq(skills.orgId, repo.orgId),
          eq(skills.namespace, parsed.value.namespace),
          eq(skills.name, parsed.value.name),
        ),
      )
      .limit(1);

    let skillRow = existingSkill[0];
    if (!skillRow) {
      const [created] = await tx
        .insert(skills)
        .values({
          orgId: repo.orgId,
          namespace: parsed.value.namespace,
          name: parsed.value.name,
          visibility: 'private',
          description: parsed.value.description ?? null,
          source: 'git',
          status: 'active',
          skillRepoId: repo.id,
          repoPath: skillPath,
        })
        .returning();
      if (!created) throw new Error('failed to create skill row');
      skillRow = created;
    } else if (skillRow.source !== 'git' || skillRow.skillRepoId !== repo.id) {
      throw new Error(
        `namespace collision: ${parsed.value.namespace}/${parsed.value.name} is already owned by another source in this org`,
      );
    } else {
      // Keep skills.updatedAt and repoPath fresh.
      await tx
        .update(skills)
        .set({ repoPath: skillPath, status: 'active', updatedAt: new Date() })
        .where(eq(skills.id, skillRow.id));
    }

    await tx.insert(skillVersions).values({
      skillId: skillRow.id,
      version: parsed.value.version,
      manifest: parsed.value as unknown as Record<string, unknown>,
      artifactHash: artifact.hash,
      artifactSizeBytes: artifact.body.length,
      sourceKind: 'git_tag',
      sourceRef: planned.tagName,
      sourceCommitSha: planned.commitSha,
      syncId,
      publishedBy: null,
    });

    await emitAuditEvent({
      orgId: repo.orgId,
      actor: { type: 'system' },
      action: 'skill.published',
      resource: { type: 'skill_version', id: `${parsed.value.namespace}/${parsed.value.name}@${parsed.value.version}` },
      payload: {
        skillRepoId: repo.id,
        tag: planned.tagName,
        commitSha: planned.commitSha,
        artifactHash: artifact.hash,
      },
      tx,
    });
  });
}

/** Convenience used by the webhook handler / UI to trigger a one-shot sync. */
export function syncTriggerFromRef(ref: string | undefined): SyncTrigger {
  if (!ref) return 'manual';
  return 'webhook';
}

/** Expose a minimal query for the reconciler. */
export async function listStaleRepos(params: {
  /** Seconds since last_synced_at after which a repo is considered stale. */
  staleAfterSeconds: number;
}): Promise<Array<{ id: string }>> {
  const db = getDb();
  const seconds = Math.floor(params.staleAfterSeconds);
  const rows = await db
    .select({ id: skillRepos.id })
    .from(skillRepos)
    .where(
      sql`${skillRepos.enabled} = true AND (${skillRepos.lastSyncedAt} IS NULL OR ${skillRepos.lastSyncedAt} < now() - (${seconds} * interval '1 second'))`,
    );
  return rows;
}
