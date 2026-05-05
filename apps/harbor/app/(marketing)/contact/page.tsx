import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Compass, LifeBuoy, Mail, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Eyebrow, SectionLead, SectionTitle } from '@/components/marketing/sections/_shared';

export const metadata: Metadata = {
  title: 'Contact · Harbor Intelligence',
  description:
    'Book an AI Workflow Audit, ask about an engagement, or send us a security report. Replies come from the team that does the work.',
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
    icon: Compass,
    eyebrow: 'Workflow audit',
    title: 'Find your highest-ROI AI opportunities.',
    body: 'A 30-minute walkthrough of how your team operates today. We leave you with a prioritized list of workflows where AI creates immediate ROI — even if we never work together.',
    ctaLabel: 'audit@harborintelligence.com',
    href: 'mailto:audit@harborintelligence.com',
  },
  {
    icon: Mail,
    eyebrow: 'Engagements',
    title: 'Pilots, custom builds, ongoing partnerships.',
    body: 'Already know which workflow you want to automate? Get a scoped proposal with milestones and a fixed-cost pilot. MSAs, DPAs, and security reviews handled before kickoff.',
    ctaLabel: 'hello@harborintelligence.com',
    href: 'mailto:hello@harborintelligence.com',
  },
  {
    icon: ShieldCheck,
    eyebrow: 'Security',
    title: 'Vulnerability reports, responsible disclosure.',
    body: '90-day disclosure window, credit on fix, no takedowns. Encrypt with our PGP key if the report contains a working PoC against a deployed system we built for you.',
    ctaLabel: 'security@harborintelligence.com',
    href: 'mailto:security@harborintelligence.com',
  },
  {
    icon: LifeBuoy,
    eyebrow: 'Press · analysts',
    title: 'Briefings, comment, research threads.',
    body: 'Background conversations on AI in mid-market operations, case studies, and analyst briefings on what we are seeing across engagements.',
    ctaLabel: 'press@harborintelligence.com',
    href: 'mailto:press@harborintelligence.com',
  },
];

const FACTS = [
  { k: 'Response time', v: 'Next business day · UTC' },
  { k: 'Audit length', v: '30 minutes · async follow-up' },
  { k: 'First pilot', v: 'Scoped in 1 · 2 weeks' },
  { k: 'Legal entity', v: 'Harbor Intelligence, Inc. · Delaware' },
];

export default function ContactPage() {
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
            <Eyebrow tone="primary">Contact</Eyebrow>
            <div className="mt-6">
              <SectionTitle lead="Talk to the team" emph="that does the work." />
            </div>
            <SectionLead>
              Audits, pilots, security reviews, press. Pick the channel that fits — replies
              come from the engineers and strategists who run the engagements, not a ticket
              queue.
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
              <Eyebrow>How we work</Eyebrow>
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
    </>
  );
}
