'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Network, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';

export default function RegistryDetailPage() {
  const { org, id } = useParams<{ org: string; id: string }>();
  const utils = trpc.useUtils();
  const reg = trpc.registry.get.useQuery({ id });
  const audit = trpc.audit.list.useQuery({
    limit: 25,
    resourceId: id,
  });
  const test = trpc.registry.test.useMutation({
    onSuccess: (r) => {
      if (r.ok) toast.success('Health check passed');
      else toast.error(r.detail ?? 'Health check failed');
      utils.audit.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const [scanNs, setScanNs] = useState('');
  const [scanName, setScanName] = useState('');
  const scan = trpc.registry.scan.useMutation();

  if (reg.isLoading) {
    return <div className="p-6 md:p-10 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!reg.data) {
    return <div className="p-6 md:p-10 text-sm">Not found.</div>;
  }

  const events = audit.data?.items ?? [];
  const proxyEvents = events.filter((e) =>
    e.action.startsWith('registry.') || e.action === 'skill.installed',
  );
  const hits = proxyEvents.filter((e) => e.action === 'registry.proxy_hit').length;
  const misses = proxyEvents.filter((e) => e.action === 'registry.proxy_miss').length;
  const failures = proxyEvents.filter((e) => e.action === 'registry.fetch_failed').length;

  return (
    <div className="p-6 md:p-10 space-y-8">
      <Link
        href={`/${org}/registries`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> All registries
      </Link>

      <PageHeader
        eyebrow="Registry"
        title={
          <>
            <span className="cav-display italic">{reg.data.name}</span>
          </>
        }
        description={reg.data.url}
        actions={
          <Button
            onClick={() => test.mutate({ id })}
            disabled={test.isPending}
            variant="outline"
          >
            {test.isPending ? <Loader2 className="size-4 animate-spin" /> : <Network className="size-4" />}
            Test connection
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCell label="Type" value={reg.data.type} />
        <KpiCell label="Status" value={reg.data.enabled ? 'enabled' : 'disabled'} />
        <KpiCell label="Cache hits" value={String(hits)} />
        <KpiCell label="Cache misses" value={String(misses)} sub={`${failures} failures`} />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Probe a namespace</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            scan.mutate({ id, namespace: scanNs, name: scanName });
          }}
          className="flex gap-2"
        >
          <input
            placeholder="namespace"
            value={scanNs}
            onChange={(e) => setScanNs(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono"
            required
          />
          <input
            placeholder="name"
            value={scanName}
            onChange={(e) => setScanName(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono"
            required
          />
          <Button type="submit" disabled={scan.isPending}>
            Scan
          </Button>
        </form>
        {scan.data ? (
          <pre className="rounded-md border border-border bg-card p-3 text-xs font-mono">
            {JSON.stringify(scan.data, null, 2)}
          </pre>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Recent registry events</h2>
        {audit.isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : proxyEvents.length === 0 ? (
          <p className="text-xs text-muted-foreground">No events yet.</p>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {proxyEvents.slice(0, 25).map((e) => {
              const ok = e.action === 'registry.proxy_hit';
              const failed = e.action === 'registry.fetch_failed';
              return (
                <div
                  key={e.id}
                  className="flex items-center gap-3 px-4 py-2.5 text-xs"
                >
                  {failed ? (
                    <XCircle className="size-4 text-destructive" />
                  ) : ok ? (
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  ) : (
                    <Network className="size-4 text-muted-foreground" />
                  )}
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {e.action}
                  </Badge>
                  <span className="font-mono text-muted-foreground truncate flex-1">
                    {e.payload && typeof e.payload === 'object' && 'ref' in (e.payload as Record<string, unknown>)
                      ? String((e.payload as Record<string, unknown>).ref)
                      : ''}
                  </span>
                  <span className="text-muted-foreground tabular shrink-0">
                    {new Date(e.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function KpiCell({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="cav-label">{label}</p>
      <p className="mt-1 text-2xl tabular">{value}</p>
      {sub ? <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p> : null}
    </div>
  );
}
