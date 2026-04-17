import type PgBoss from 'pg-boss';

export const GIT_SYNC_JOB_NAME = 'git-sync';

export type SyncTrigger = 'webhook' | 'scheduled' | 'manual' | 'initial';

export interface GitSyncJobPayload {
  skillRepoId: string;
  trigger: SyncTrigger;
  /** Ref that triggered the sync (tag/branch) or the webhook delivery id. */
  triggerRef?: string;
}

/**
 * Enqueue a sync job on the shared pg-boss instance. Callers own the PgBoss
 * connection; we never create one here to avoid double-starting boss from
 * apps that already have it.
 */
export async function enqueueSync(
  boss: Pick<PgBoss, 'send'>,
  payload: GitSyncJobPayload,
): Promise<string | null> {
  return boss.send(GIT_SYNC_JOB_NAME, payload);
}
