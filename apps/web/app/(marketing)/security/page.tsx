import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowUpRight,
  Fingerprint,
  KeySquare,
  Lock,
  ScrollText,
  ServerCog,
  ShieldCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Eyebrow, SectionLead, SectionTitle } from '@/components/marketing/sections/_shared';

const GITHUB_URL = process.env.NEXT_PUBLIC_CAVALRY_GITHUB_URL as string;

export const metadata: Metadata = {
  title: 'Security · Cavalry',
  description:
    'Content-addressed artifacts, actor-preserving audit, self-hosted deploys. How Cavalry ships security as an append-only row instead of a PDF.',
};

type Pillar = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
};

const PILLARS: Pillar[] = [
  {
    icon: Fingerprint,
    eyebrow: '01 · Integrity',
    title: 'Every artifact is content-addressed.',
    body: 'Skills resolve by sha256, not by mutable tag. The CLI streams and verifies the hash on install; a mismatch fails closed before any code reaches the workspace.',
    bullets: [
      'sha256 resolution end to end',
      'Streaming verification on install',
      'Append-only audit on every fetch',
    ],
  },
  {
    icon: Fingerprint,
    eyebrow: '02 · Identity',
    title: 'Actor identity is preserved, row by row.',
    body: 'Every governed event records user, token, and system context. API tokens are scoped to a workspace and skill namespace — leaked tokens cannot escalate laterally.',
    bullets: [
      'User · token · system on each row',
      'Workspace-scoped API tokens',
      'Signed webhook delivery to your SIEM',
    ],
  },
  {
    icon: ServerCog,
    eyebrow: '03 · Isolation',
    title: 'Runs in your VPC, on your Postgres.',
    body: 'Apache-licensed, Helm chart included, no telemetry home. S3-compatible object storage, Postgres primary, Redis optional for ratelimits.',
    bullets: [
      'Self-host by default',
      'No vendor phone-home',
      'Bring your own Postgres · S3 · KMS',
    ],
  },
  {
    icon: ShieldCheck,
    eyebrow: '04 · Posture',
    title: 'Compliance tracks the product, not the reverse.',
    body: "SOC 2 Type I is in flight for the managed tier. Self-hosted deploys inherit your environment's controls; Cavalry publishes the mapping.",
    bullets: [
      'SOC 2 Type I · in progress · 2026 Q3',
      'Data residency: you pick the region',
      'Apache 2.0 source · third-party audit welcome',
    ],
  },
];

const DATA_MODEL = [
  {
    k: 'Data at rest',
    v: 'Postgres (encrypted via the storage layer you provide). Artifacts in S3-compatible object storage with server-side encryption.',
  },
  {
    k: 'Data in transit',
    v: 'TLS 1.2+ terminates at your ingress. Internal gateway-to-database traffic honors your VPC policies.',
  },
  {
    k: 'Secrets',
    v: 'API tokens are stored hashed (argon2). Upstream registry credentials live in the secret backend you configure — not in the database.',
  },
  {
    k: 'Retention',
    v: 'Audit rows are append-only. Soft-delete does not apply. Retention windows are configurable per org; the default is indefinite.',
  },
];

export default function SecurityPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 80% at 85% 10%, oklch(0.94 0.05 260 / 0.35) 0%, transparent 60%), radial-gradient(60% 80% at 10% 70%, oklch(0.96 0.02 85 / 0.7) 0%, transparent 55%)',
          }}
        />
        <div className="relative mx-auto max-w-[1280px] px-6 pb-16 pt-20 md:px-10 md:pb-24 md:pt-28">
          <div className="max-w-3xl">
            <Eyebrow tone="primary">Security</Eyebrow>
            <div className="mt-6">
              <SectionTitle lead="Security is operational," emph="not a PDF." />
            </div>
            <SectionLead>
              Cavalry is the single enforcement point between your engineers and every public
              or private skill source. Here is the posture that ships with the product, plus
              the channel for reporting issues.
            </SectionLead>
          </div>
        </div>
      </section>

      <section className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-[1280px] px-6 py-16 md:px-10 md:py-24">
          <div className="grid gap-px overflow-hidden rounded-xl bg-stone-200 md:grid-cols-2">
            {PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <article key={p.eyebrow} className="flex flex-col gap-5 bg-white p-8 md:p-10">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-5" strokeWidth={1.75} />
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
                      {p.eyebrow}
                    </span>
                  </div>
                  <h3 className="font-display text-[22px] font-semibold leading-[1.15] tracking-[-0.02em] text-stone-950">
                    {p.title}
                  </h3>
                  <p className="text-[14.5px] leading-[1.6] text-stone-600">{p.body}</p>
                  <ul className="mt-auto space-y-2.5 text-[13.5px] text-stone-700">
                    {p.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-3">
                        <span
                          aria-hidden
                          className="mt-[9px] size-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-primary)_18%,transparent)]"
                        />
                        {b}
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-stone-50">
        <div className="mx-auto max-w-[1280px] px-6 py-16 md:px-10 md:py-24">
          <div className="grid gap-10 md:grid-cols-[1fr_1.6fr] md:gap-16">
            <div>
              <Eyebrow>Data model</Eyebrow>
              <h3 className="mt-4 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-stone-950">
                What Cavalry stores, where it stores it.
              </h3>
              <p className="mt-4 max-w-sm text-[14.5px] leading-[1.6] text-stone-600">
                The gateway holds policy, audit, and skill metadata. Artifacts live in object
                storage you control. Nothing else.
              </p>
            </div>
            <dl className="grid gap-px overflow-hidden rounded-xl bg-stone-200">
              {DATA_MODEL.map((r) => (
                <div key={r.k} className="grid gap-2 bg-white p-6 md:grid-cols-[200px_1fr] md:gap-8">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500">
                    {r.k}
                  </dt>
                  <dd className="text-[14.5px] leading-[1.6] text-stone-700">{r.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="border-t border-stone-200 bg-white">
        <div className="mx-auto grid max-w-[1280px] gap-10 px-6 py-16 md:grid-cols-2 md:gap-16 md:px-10 md:py-24">
          <div>
            <Eyebrow tone="primary">Reporting</Eyebrow>
            <h3 className="mt-4 font-display text-[28px] font-semibold leading-[1.08] tracking-[-0.02em] text-stone-950">
              Found something?<span className="text-stone-500"> Tell us first.</span>
            </h3>
            <p className="mt-5 max-w-md text-[15px] leading-[1.6] text-stone-600">
              Report to <span className="font-mono text-stone-950">security@cavalry.sh</span>{' '}
              with repro steps and impact. A human replies within one business day; a fix or
              mitigation plan follows within seven.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="mailto:security@cavalry.sh"
                className="relative inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-3xl bg-primary px-4 font-display text-[15px] font-medium text-white transition-all duration-200 hover:rounded-none"
              >
                security@cavalry.sh
              </Link>
              <Link
                href={`${GITHUB_URL}/security/advisories`}
                target="_blank"
                rel="noopener noreferrer"
                className="group/link inline-flex items-center gap-1.5 font-mono text-[12.5px] uppercase tracking-[0.12em] text-stone-700 transition-colors hover:text-primary"
              >
                Private advisory
                <ArrowUpRight className="size-3.5 transition-transform group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" />
              </Link>
            </div>
          </div>

          <dl className="grid gap-px overflow-hidden rounded-xl bg-stone-200">
            {[
              { icon: Lock, k: 'Disclosure window', v: '90 days from triage · extensions by agreement' },
              { icon: KeySquare, k: 'Safe harbor', v: 'Good-faith reports get public credit, no takedown threats' },
              { icon: ScrollText, k: 'Out of scope', v: 'DoS, social engineering, physical attacks, third-party SaaS' },
            ].map((r) => {
              const Icon = r.icon;
              return (
                <div key={r.k} className="flex items-start gap-4 bg-white p-6">
                  <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" strokeWidth={1.75} />
                  </span>
                  <div>
                    <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500">
                      {r.k}
                    </dt>
                    <dd className="mt-1 text-[14px] leading-[1.55] text-stone-700">{r.v}</dd>
                  </div>
                </div>
              );
            })}
          </dl>
        </div>
      </section>
    </>
  );
}
