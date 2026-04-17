'use client';

import { trpc } from '@/lib/trpc/shared';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function relativeTime(from: Date): string {
  const diffMs = Date.now() - from.getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function actionTone(action: string): string {
  if (
    action.endsWith('_blocked') ||
    action.endsWith('.revoked') ||
    action.endsWith('.removed') ||
    action.endsWith('.deleted')
  )
    return 'cav-signal-red';
  if (
    action.startsWith('skill.installed') ||
    action.startsWith('approval.decided') ||
    action.endsWith('.joined')
  )
    return 'cav-signal-green';
  return '';
}

export default function AuditPage() {
  const query = trpc.audit.list.useInfiniteQuery(
    { limit: 50 },
    {
      getNextPageParam: (last) => last.nextCursor ?? undefined,
      initialCursor: undefined,
    },
  );
  const events = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="p-6 md:p-10">
      <PageHeader
        eyebrow="Append-only log"
        title={
          <>
            <span className="cav-display italic">Audit</span> events
          </>
        }
        description="Every governed mutation is recorded here. Filtering, export, and webhook delivery arrive in M5/M6."
      />

      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-14 text-center text-sm text-muted-foreground">
          No audit events yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <span className="cav-label">log.cavalry.audit</span>
            <span className="cav-label tabular">{events.length} events</span>
          </div>
          <ul className="divide-y divide-border">
            {events.map((e) => (
              <li
                key={e.id}
                className="grid grid-cols-12 items-center gap-4 px-5 py-3 font-mono text-[12.5px] transition-colors hover:bg-card-elevated"
              >
                <div className="col-span-2 flex items-center gap-2 text-muted-foreground">
                  <span className={cn('cav-signal shrink-0', actionTone(e.action))} />
                  <time
                    dateTime={new Date(e.createdAt).toISOString()}
                    title={new Date(e.createdAt).toLocaleString()}
                    className="tabular"
                  >
                    {relativeTime(new Date(e.createdAt))}
                  </time>
                </div>
                <div className="col-span-3 truncate text-foreground">
                  {e.action}
                </div>
                <div className="col-span-4 truncate text-muted-foreground">
                  {e.resourceType}
                  <span className="text-foreground">
                    /{e.resourceId.slice(0, 10)}…
                  </span>
                </div>
                <div className="col-span-3 truncate text-right text-muted-foreground">
                  {e.actorType === 'user'
                    ? e.actorEmail ?? '—'
                    : `<${e.actorType}>`}
                </div>
              </li>
            ))}
          </ul>
          {query.hasNextPage ? (
            <div className="flex items-center justify-center border-t border-border p-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
              >
                {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          ) : (
            <div className="border-t border-border px-5 py-3 text-center font-mono text-[11px] text-muted-foreground">
              — end of log —
            </div>
          )}
        </div>
      )}
    </div>
  );
}
