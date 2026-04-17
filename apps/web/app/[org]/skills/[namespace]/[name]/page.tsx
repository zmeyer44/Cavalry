'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { trpc } from '@/lib/trpc/shared';
import { PageHeader } from '@/components/page-header';

function humanBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function SkillDetailPage() {
  const params = useParams<{ org: string; namespace: string; name: string }>();
  const { namespace, name } = params;
  const skill = trpc.skill.get.useQuery({ namespace, name });
  const versions = trpc.skill.listVersions.useQuery({ namespace, name });
  const usage = trpc.skill.getUsage.useQuery({ namespace, name, window: '30d' });

  const installCommand = `cavalry install ${namespace}/${name}`;
  const [copied, setCopied] = useState(false);

  return (
    <div className="p-6 md:p-10">
      <Link
        href={`/${params.org}/skills`}
        className="cav-label mb-4 inline-flex items-center gap-1 transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        All skills
      </Link>

      <PageHeader
        eyebrow={skill.data?.visibility === 'private' ? 'Internal · Private' : 'Internal'}
        title={
          <span className="font-mono text-2xl tracking-tight md:text-[28px]">
            <span className="text-muted-foreground">{namespace}</span>
            <span className="mx-0.5 text-muted-foreground">/</span>
            <span>{name}</span>
          </span>
        }
        description={skill.data?.description ?? undefined}
      />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border">
        <div className="bg-card p-5">
          <span className="cav-label">Installs · 30d</span>
          <div className="mt-3 cav-display text-5xl leading-none">
            {usage.data?.totalInstalls ?? 0}
          </div>
        </div>
        <div className="bg-card p-5">
          <span className="cav-label">Versions</span>
          <div className="mt-3 cav-display text-5xl leading-none">
            {versions.data?.length ?? 0}
          </div>
        </div>
        <div className="bg-card p-5">
          <span className="cav-label">Latest</span>
          <div className="mt-3 font-mono text-xl tabular">
            {versions.data?.[0]?.version ?? '—'}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {versions.data?.[0]
              ? new Date(versions.data[0].publishedAt).toLocaleDateString()
              : '—'}
          </p>
        </div>
      </div>

      {/* Install command */}
      <div className="mt-10 rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="cav-label">Install via CLI</span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(installCommand);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            }}
            className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="px-5 py-4 font-mono text-[13px]">
          <span className="text-muted-foreground">$ </span>
          {installCommand}
        </pre>
      </div>

      {/* Version timeline */}
      <section className="mt-10">
        <h2 className="cav-label mb-3">Version history</h2>
        {versions.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : versions.data && versions.data.length > 0 ? (
          <div className="relative border-l border-border pl-6">
            {versions.data.map((v, i) => (
              <div key={v.id} className="relative pb-6 last:pb-0">
                <span className="absolute -left-[29px] top-1.5 inline-flex size-2 rounded-full border border-primary bg-background" />
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-mono text-base tabular">v{v.version}</span>
                  {i === 0 && (
                    <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                      LATEST
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(v.publishedAt).toLocaleString()}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>by {v.publisherEmail ?? '—'}</span>
                  <span className="tabular">
                    {humanBytes(v.artifactSizeBytes)}
                  </span>
                  <span className="font-mono" title={v.artifactHash}>
                    sha256:{v.artifactHash.slice(0, 12)}…
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No versions published yet.
          </p>
        )}
      </section>
    </div>
  );
}
