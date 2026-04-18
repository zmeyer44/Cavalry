import { listStaleRepos } from './sync';
import type { GitSyncJobPayload } from './queue';

export interface ReconcileOptions {
  /** Seconds since last sync beyond which a repo is re-enqueued. */
  staleAfterSeconds?: number;
  enqueue: (payload: GitSyncJobPayload) => Promise<string | null>;
}

export interface ReconcileResult {
  examined: number;
  enqueued: number;
}

export async function reconcileStaleRepos(
  opts: ReconcileOptions,
): Promise<ReconcileResult> {
  const stale = await listStaleRepos({
    staleAfterSeconds: opts.staleAfterSeconds ?? 900,
  });
  for (const repo of stale) {
    await opts.enqueue({ skillRepoId: repo.id, trigger: 'scheduled' });
  }
  return { examined: stale.length, enqueued: stale.length };
}
