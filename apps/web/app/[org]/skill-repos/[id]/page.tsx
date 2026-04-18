'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  running: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
  syncing: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
  succeeded: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200',
  healthy: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200',
  partial: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
  degraded: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
  failed: 'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200',
};

export default function SkillRepoDetailPage() {
  const { org, id } = useParams<{ org: string; id: string }>();
  const utils = trpc.useUtils();
  const repo = trpc.skillRepo.get.useQuery({ id });
  const syncs = trpc.skillRepo.listSyncs.useQuery({ id, limit: 25 });

  const triggerSync = trpc.skillRepo.triggerSync.useMutation({
    onSuccess: () => {
      toast.success('Sync queued');
      void utils.skillRepo.get.invalidate({ id });
      void utils.skillRepo.listSyncs.invalidate({ id });
    },
    onError: (e) => toast.error(e.message),
  });
  const disconnect = trpc.skillRepo.disconnect.useMutation({
    onSuccess: () => {
      toast.success('Disconnected');
      void utils.skillRepo.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (repo.isLoading) return <p className="p-10 text-sm text-muted-foreground">Loading…</p>;
  if (!repo.data) return <p className="p-10 text-sm text-muted-foreground">Not found.</p>;

  return (
    <div className="p-6 md:p-10">
      <Link
        href={`/${org}/skill-repos`}
        className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> All skill repos
      </Link>
      <PageHeader
        eyebrow={repo.data.provider}
        title={
          <>
            {repo.data.owner}/<span className="cav-display italic">{repo.data.repo}</span>
          </>
        }
        description={`Default branch ${repo.data.defaultBranch}. Sync status: ${repo.data.syncStatus}.`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => triggerSync.mutate({ id })}
              disabled={triggerSync.isPending}
            >
              <RefreshCw className="size-4" /> Trigger sync
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (confirm(`Disconnect ${repo.data?.owner}/${repo.data?.repo}?`)) {
                  disconnect.mutate({ id });
                }
              }}
            >
              <Trash2 className="size-4" /> Disconnect
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4 text-xs">
          <p className="cav-label text-muted-foreground">Last sync</p>
          <p className="mt-1">
            {repo.data.lastSyncedAt
              ? new Date(repo.data.lastSyncedAt).toLocaleString()
              : 'never'}
          </p>
          {repo.data.lastSyncError ? (
            <p className="mt-2 font-mono text-[11px] text-red-700 dark:text-red-300">
              {repo.data.lastSyncError}
            </p>
          ) : null}
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-xs">
          <p className="cav-label text-muted-foreground">cavalry.yaml</p>
          <pre className="mt-2 overflow-auto rounded bg-muted p-2 font-mono text-[11px]">
            {repo.data.configSnapshot
              ? JSON.stringify(repo.data.configSnapshot, null, 2)
              : 'not yet synced'}
          </pre>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-xs">
          <p className="cav-label text-muted-foreground">Status</p>
          <p className="mt-1">
            <Badge className={STATUS_BADGE[repo.data.syncStatus] ?? ''}>
              {repo.data.syncStatus}
            </Badge>
          </p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-medium">Sync history</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-xs">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-4 py-2 font-medium">started</th>
                <th className="px-4 py-2 font-medium">trigger</th>
                <th className="px-4 py-2 font-medium">status</th>
                <th className="px-4 py-2 font-medium">published</th>
                <th className="px-4 py-2 font-medium">skipped</th>
                <th className="px-4 py-2 font-medium">error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(syncs.data?.items ?? []).map((s) => (
                <tr key={s.id} data-testid={`sync-row-${s.id}`}>
                  <td className="px-4 py-2 font-mono">
                    {new Date(s.startedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">{s.trigger}</td>
                  <td className="px-4 py-2">
                    <Badge className={STATUS_BADGE[s.status] ?? ''}>{s.status}</Badge>
                  </td>
                  <td className="px-4 py-2 font-mono">{s.versionsPublished}</td>
                  <td className="px-4 py-2 font-mono">{s.versionsSkipped}</td>
                  <td className="px-4 py-2 text-[11px] text-muted-foreground">
                    {s.errorMessage ?? ''}
                  </td>
                </tr>
              ))}
              {syncs.data && syncs.data.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-xs text-muted-foreground"
                  >
                    No syncs recorded yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
