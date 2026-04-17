'use client';

import { useMemo, useState } from 'react';
import { Download, Filter, X } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/shared';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
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
    action.endsWith('.deleted') ||
    action.endsWith('.failed') ||
    action.endsWith('force_push_detected')
  )
    return 'cav-signal-red';
  if (
    action.startsWith('skill.installed') ||
    action.startsWith('approval.decided') ||
    action.endsWith('.joined') ||
    action.endsWith('.succeeded')
  )
    return 'cav-signal-green';
  return '';
}

interface FilterState {
  action: string;
  actorType: '' | 'user' | 'token' | 'system';
  resourceType: string;
  actorEmail: string;
  since: string;
  until: string;
}

function emptyFilters(): FilterState {
  return {
    action: '',
    actorType: '',
    resourceType: '',
    actorEmail: '',
    since: '',
    until: '',
  };
}

function toIso(local: string): string | undefined {
  if (!local) return undefined;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function buildQueryInput(f: FilterState, limit: number) {
  const input: Record<string, unknown> = { limit };
  if (f.action.includes('*')) input.actionPrefix = f.action;
  else if (f.action) input.action = f.action;
  if (f.actorType) input.actorType = f.actorType;
  if (f.resourceType) input.resourceType = f.resourceType;
  if (f.actorEmail.trim()) input.actorEmail = f.actorEmail.trim();
  const since = toIso(f.since);
  if (since) input.since = since;
  const until = toIso(f.until);
  if (until) input.until = until;
  return input as { limit: number };
}

function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AuditPage() {
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const utils = trpc.useUtils();

  const facets = trpc.audit.filterFacets.useQuery();

  const queryInput = useMemo(() => buildQueryInput(filters, 50), [filters]);

  const query = trpc.audit.list.useInfiniteQuery(queryInput, {
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialCursor: undefined,
  });

  const events = query.data?.pages.flatMap((p) => p.items) ?? [];
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const exportCsv = async () => {
    const input = buildQueryInput(filters, 10_000) as Record<string, unknown>;
    const { csv, count } = await utils.audit.exportCsv.fetch(
      input as { limit: number },
    );
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    downloadCsv(csv, `cavalry-audit-${ts}.csv`);
    toast.success(`Exported ${count} events`);
  };

  return (
    <div className="p-6 md:p-10">
      <PageHeader
        eyebrow="Append-only log"
        title={
          <>
            <span className="cav-display italic">Audit</span> events
          </>
        }
        description="Every governed mutation is recorded here. Filter, export to CSV, or forward to a SIEM via Settings → Integrations."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFiltersOpen((v) => !v)}
              data-testid="audit-toggle-filters"
            >
              <Filter className="size-3.5" />
              Filters
              {activeFilterCount > 0 ? (
                <span className="ml-1 rounded bg-foreground px-1.5 text-[10px] text-background">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void exportCsv()}
              data-testid="audit-export-csv"
            >
              <Download className="size-3.5" />
              Export CSV
            </Button>
          </div>
        }
      />

      {filtersOpen ? (
        <div
          className="mb-6 rounded-lg border border-border bg-card p-4"
          data-testid="audit-filters-panel"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-[11px]" htmlFor="audit-filter-action">
                Action (supports `skill.*`)
              </Label>
              <Input
                id="audit-filter-action"
                data-testid="audit-filter-action"
                value={filters.action}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, action: e.target.value }))
                }
                placeholder="skill.installed or skill.*"
                list="audit-action-list"
              />
              <datalist id="audit-action-list">
                {facets.data?.actions.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Actor type</Label>
              <Select
                value={filters.actorType}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    actorType: e.target.value as FilterState['actorType'],
                  }))
                }
              >
                <option value="">any</option>
                <option value="user">user</option>
                <option value="token">token</option>
                <option value="system">system</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Resource type</Label>
              <Select
                value={filters.resourceType}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, resourceType: e.target.value }))
                }
              >
                <option value="">any</option>
                {facets.data?.resourceTypes.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Actor email contains</Label>
              <Input
                value={filters.actorEmail}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, actorEmail: e.target.value }))
                }
                placeholder="@company.com"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Since</Label>
              <Input
                type="datetime-local"
                value={filters.since}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, since: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Until</Label>
              <Input
                type="datetime-local"
                value={filters.until}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, until: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters(emptyFilters())}
              disabled={activeFilterCount === 0}
            >
              <X className="size-3.5" /> Clear
            </Button>
          </div>
        </div>
      ) : null}

      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-14 text-center text-sm text-muted-foreground">
          {activeFilterCount > 0 ? 'No events match these filters.' : 'No audit events yet.'}
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
                data-testid={`audit-row-${e.action}`}
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
