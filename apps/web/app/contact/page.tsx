import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, LifeBuoy, Mail, ShieldCheck, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { MarketingShell } from '@/components/marketing/marketing-shell';
import { Eyebrow, SectionLead, SectionTitle } from '@/components/marketing/sections/_shared';

const GITHUB_URL = process.env.NEXT_PUBLIC_CAVALRY_GITHUB_URL as string;

export const metadata: Metadata = {
  title: 'Contact · Cavalry',
  description:
    'Pilots, procurement, security review. Most teams start with a 30-minute walkthrough of their install to policy flow.',
};

type Channel = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  href: string;
  external?: boolean;
};

const CHANNELS: Channel[] = [
  {
    icon: Mail,
    eyebrow: 'Sales',
    title: 'Pilots, procurement, custom terms.',
    body: 'A 30-minute walkthrough of the gateway, policy engine, and audit model mapped against your org chart. Signed MSAs and DPAs on request.',
    ctaLabel: 'sales@cavalry.sh',
    href: 'mailto:sales@cavalry.sh',
  },
  {
    icon: ShieldCheck,
    eyebrow: 'Security',
    title: 'Vulnerability reports, responsible disclosure.',
    body: '90-day disclosure window, public credit on fix, no takedowns. PGP key available on request — encrypt if the report contains a working PoC.',
    ctaLabel: 'security@cavalry.sh',
    href: 'mailto:security@cavalry.sh',
  },
  {
    icon: Users,
    eyebrow: 'Community',
    title: 'Questions, feature requests, self-host help.',
    body: 'GitHub Discussions is the fastest path. File issues against the repo for reproducible bugs. The maintainers read every thread.',
    ctaLabel: 'GitHub Discussions',
    href: `${GITHUB_URL}/discussions`,
    external: true,
  },
  {
    icon: LifeBuoy,
    eyebrow: 'Press · analysts',
    title: 'Briefings, comment, research threads.',
    body: 'Background conversations, product demos for analysts, coverage on open-source governance tooling for AI agents.',
    ctaLabel: 'press@cavalry.sh',
    href: 'mailto:press@cavalry.sh',
  },
];

const FACTS = [
  { k: 'Response time', v: 'Next business day · UTC' },
  { k: 'Security', v: 'Paged, 24/7' },
  { k: 'Status page', v: 'status.cavalry.sh' },
  { k: 'Legal entity', v: 'Cavalry, Inc. · Delaware' },
];

export default function ContactPage() {
  return (
    <MarketingShell>
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
            <Eyebrow tone="primary">Contact</Eyebrow>
            <div className="mt-6">
              <SectionTitle lead="Talk to a human" emph="who runs the gateway." />
            </div>
            <SectionLead>
              Pilots, procurement questions, security review, press. Pick the channel that
              fits — replies arrive from platform engineers, not a ticket queue.
            </SectionLead>
          </div>
        </div>
      </section>

      <section className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-[1280px] px-6 py-16 md:px-10 md:py-20">
          <div className="grid gap-px overflow-hidden rounded-xl bg-stone-200 md:grid-cols-2">
            {CHANNELS.map((c) => {
              const Icon = c.icon;
              return (
                <Link
                  key={c.eyebrow}
                  href={c.href}
                  {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="group/card relative flex flex-col gap-5 bg-white p-8 transition-colors duration-200 hover:bg-stone-50 md:p-10"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors duration-200 group-hover/card:bg-primary group-hover/card:text-white">
                      <Icon className="size-5" strokeWidth={1.75} />
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500">
                      {c.eyebrow}
                    </span>
                  </div>
                  <h3 className="max-w-sm font-display text-[22px] font-semibold leading-[1.15] tracking-[-0.02em] text-stone-950">
                    {c.title}
                  </h3>
                  <p className="max-w-md text-[14.5px] leading-[1.6] text-stone-600">
                    {c.body}
                  </p>
                  <span className="mt-auto inline-flex items-center gap-1.5 font-mono text-[12.5px] text-stone-950 transition-colors duration-200 group-hover/card:text-primary">
                    {c.ctaLabel}
                    <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover/card:-translate-y-0.5 group-hover/card:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-stone-50">
        <div className="mx-auto max-w-[1280px] px-6 py-16 md:px-10 md:py-20">
          <div className="grid gap-10 md:grid-cols-[1fr_1.4fr]">
            <div>
              <Eyebrow>Operations</Eyebrow>
              <h3 className="mt-4 max-w-sm font-display text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] text-stone-950">
                The facts we answer most often.
              </h3>
            </div>
            <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-stone-200 sm:grid-cols-2">
              {FACTS.map((f) => (
                <div key={f.k} className="bg-white p-6">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500">
                    {f.k}
                  </dt>
                  <dd className="mt-2 font-display text-[17px] font-medium tracking-[-0.015em] text-stone-950">
                    {f.v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
