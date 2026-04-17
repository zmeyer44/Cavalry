'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Boxes, ChevronRight } from 'lucide-react';
import { trpc } from '@/lib/trpc/shared';
import { PageHeader } from '@/components/page-header';

export default function SkillsInventoryPage() {
  const { org } = useParams<{ org: string }>();
  const list = trpc.skill.list.useQuery();

  return (
    <div className="p-6 md:p-10">
      <PageHeader
        eyebrow="Private registry"
        title={
          <>
            Published <span className="cav-display italic">skills</span>
          </>
        }
        description="Internal skills published to this organization. Each version is content-addressed and immutable once published."
      />

      {list.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : list.data && list.data.length > 0 ? (
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {list.data.map((s) => (
            <Link
              key={s.id}
              href={`/${org}/skills/${s.namespace}/${s.name}`}
              className="group grid grid-cols-12 items-center gap-4 px-5 py-4 transition-colors hover:bg-card-elevated"
            >
              <div className="col-span-6 min-w-0 flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
                  <Boxes className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-mono text-[13px] leading-tight">
                    <span className="text-muted-foreground">{s.namespace}</span>
                    <span className="mx-0.5 text-muted-foreground">/</span>
                    <span>{s.name}</span>
                  </p>
                  {s.description ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {s.description}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="col-span-2 flex justify-start">
                {s.latestVersion ? (
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] tabular">
                    v{s.latestVersion}
                  </span>
                ) : (
                  <span className="cav-label">no versions</span>
                )}
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <span className="cav-label">versions</span>
                <span className="font-mono text-[13px] tabular">
                  {s.versionCount ?? 0}
                </span>
              </div>
              <div className="col-span-2 flex items-center justify-end gap-3 text-xs text-muted-foreground">
                <span className="tabular">
                  {s.latestAt ? new Date(s.latestAt).toLocaleDateString() : '—'}
                </span>
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-14 text-center">
          <Boxes className="mx-auto size-7 text-muted-foreground" />
          <p className="mt-4 text-sm">No skills published yet.</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            Publish from the CLI:{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              cavalry publish ./skill-dir
            </code>
          </p>
        </div>
      )}
    </div>
  );
}
