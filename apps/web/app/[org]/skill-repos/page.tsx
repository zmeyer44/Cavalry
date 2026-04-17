'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronRight, GitBranch, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { cn } from '@/lib/utils';

const STATUS_VARIANTS: Record<string, string> = {
  pending: 'cav-signal cav-signal-neutral',
  syncing: 'cav-signal cav-signal-amber',
  healthy: 'cav-signal cav-signal-green',
  degraded: 'cav-signal cav-signal-amber',
  failed: 'cav-signal cav-signal-red',
};

export default function SkillReposPage() {
  const { org } = useParams<{ org: string }>();
  const utils = trpc.useUtils();
  const list = trpc.skillRepo.list.useQuery();
  const triggerSync = trpc.skillRepo.triggerSync.useMutation({
    onSuccess: () => {
      toast.success('Sync queued');
      void utils.skillRepo.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-6 md:p-10">
      <PageHeader
        eyebrow="Source of truth"
        title={
          <>
            Connected <span className="cav-display italic">skill repositories</span>
          </>
        }
        description="Customer-owned git repos that Cavalry indexes and serves. Pushes, tags, and cavalry.yaml changes flow through the sync engine."
        actions={
          <Link href={`/${org}/skill-repos/connect`}>
            <Button>
              <Plus className="size-4" /> Connect repo
            </Button>
          </Link>
        }
      />

      {list.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : list.data && list.data.length > 0 ? (
        <div
          className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card"
          data-testid="skill-repos-list"
        >
          {list.data.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-12 items-center gap-4 px-5 py-3"
              data-testid={`skill-repo-row-${r.owner}-${r.repo}`}
            >
              <div className="col-span-5 flex items-center gap-3 min-w-0">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
                  <GitBranch className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium leading-tight">
                    {r.owner}/{r.repo}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                    {r.provider} · default {r.defaultBranch}
                  </p>
                </div>
              </div>
              <div className="col-span-2 flex items-center gap-2 text-xs">
                <span
                  className={cn(
                    STATUS_VARIANTS[r.syncStatus] ?? STATUS_VARIANTS.pending,
                  )}
                  data-testid={`skill-repo-status-${r.syncStatus}`}
                />
                {r.syncStatus}
              </div>
              <div className="col-span-3 text-xs text-muted-foreground">
                {r.lastSyncedAt
                  ? `synced ${new Date(r.lastSyncedAt).toLocaleString()}`
                  : 'never synced'}
                {r.lastSyncError ? (
                  <Badge variant="outline" className="ml-1 text-[10px]">
                    error
                  </Badge>
                ) : null}
              </div>
              <div className="col-span-2 flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Trigger sync for ${r.owner}/${r.repo}`}
                  onClick={() => triggerSync.mutate({ id: r.id })}
                  disabled={triggerSync.isPending}
                >
                  <RefreshCw className="size-4" />
                </Button>
                <Link
                  href={`/${org}/skill-repos/${r.id}`}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  details <ChevronRight className="size-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-14 text-center">
          <GitBranch className="mx-auto size-7 text-muted-foreground" />
          <p className="mt-4 text-sm">No repos connected.</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            Install the Cavalry GitHub App on your org, then connect a repo that contains a
            <code className="mx-1 font-mono">cavalry.yaml</code>. Tags push through the sync
            engine.
          </p>
          <Link href={`/${org}/skill-repos/connect`} className="mt-4 inline-block">
            <Button>Connect a repo</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
