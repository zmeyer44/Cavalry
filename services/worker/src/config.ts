export interface WorkerConfig {
  databaseUrl: string;
  reconcileIntervalSeconds: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): WorkerConfig {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  const reconcile = Number(env.CAVALRY_SYNC_RECONCILE_INTERVAL_SECONDS ?? 900);
  if (!Number.isFinite(reconcile) || reconcile < 60) {
    throw new Error('CAVALRY_SYNC_RECONCILE_INTERVAL_SECONDS must be >= 60');
  }
  return {
    databaseUrl,
    reconcileIntervalSeconds: reconcile,
  };
}
