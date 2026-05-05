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

export const metadata: Metadata = {
  title: 'Security · Harbor Intelligence',
  description:
    'How Harbor Intelligence handles client data, isolates AI systems we build, and reports vulnerabilities. Security as a practice, not a PDF.',
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
    eyebrow: '01 · Data handling',
    title: 'Your data stays in scope.',
    body: 'Engagement data is accessed only by named team members listed in your DPA, only for the work scoped in your SOW, and only inside the environments you authorize.',
    bullets: [
      'Named-team access controls',
      'Data residency you choose',
      'No training of public models on client data',
    ],
  },
  {
    icon: Fingerprint,
    eyebrow: '02 · Audit + identity',
    title: 'Every model decision is traceable.',
    body: 'The systems we build record actor, prompt, and decision context for every AI action. Reviewable inside your environment, in formats your security team can ingest.',
    bullets: [
      'Per-decision audit trails',
      'SSO + role-aware permissions',
      'Webhook + SIEM integrations on request',
    ],
  },
  {
    icon: ServerCog,
    eyebrow: '03 · Isolation',
    title: 'Deployed inside your environment.',
    body: 'Most engagements ship into your existing cloud, your existing identity provider, and your existing data stores. We do not require client data to leave your perimeter to make AI work.',
    bullets: [
      'Runs in your cloud · your VPC',
      'Bring your own model provider keys',
      'No vendor phone-home in delivered systems',
    ],
  },
  {
    icon: ShieldCheck,
    eyebrow: '04 · Posture',
    title: 'Compliance tracks the work, not the reverse.',
    body: 'We design AI systems with security and compliance scoped from day one. Where regulated workloads are involved, we map controls to your existing framework before writing the first prompt.',
    bullets: [
      'SOC 2 Type I · in progress · 2026 Q3',
      'HIPAA + GDPR · BAA / DPA on request',
      'Third-party security review welcome',
    ],
  },
];

const DATA_MODEL = [
  {
    k: 'Engagement data',
    v: 'Accessed under signed NDA + DPA. Stored in encrypted, access-controlled workspaces. Returned or destroyed within 30 days of close-out, per your contract.',
  },
  {
    k: 'AI systems we build',
    v: 'Deployed into your cloud and identity provider. Logs, audit trails, and model decisions live where you can monitor them — not in our infrastructure.',
  },
  {
    k: 'Model providers',
    v: "We default to enterprise tiers with no-training, zero-retention options. Configurable per workflow based on your data classification and compliance posture.",
  },
  {
    k: 'Secrets + credentials',
    v: 'Stored in the secret backend you configure. Rotated on engagement close-out. Never embedded in delivered code or prompts.',
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
              <SectionTitle lead="Security is a practice," emph="not a PDF." />
            </div>
            <SectionLead>
              Harbor Intelligence builds AI systems that handle real business data. Here is how
              we handle that responsibility — across engagements, the systems we deliver, and
              the disclosure process for issues you find.
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
                What we touch, and where it lives.
              </h3>
              <p className="mt-4 max-w-sm text-[14.5px] leading-[1.6] text-stone-600">
                Engagement data lives under signed contract, on encrypted, access-controlled
                infrastructure. The AI systems we build run inside your cloud — not ours.
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
              Report to <span className="font-mono text-stone-950">security@harborintelligence.com</span>{' '}
              with repro steps and impact. A human replies within one business day; a fix or
              mitigation plan follows within seven.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="mailto:security@harborintelligence.com"
                className="relative inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-3xl bg-primary px-4 font-display text-[15px] font-medium text-white transition-all duration-200 hover:rounded-none"
              >
                security@harborintelligence.com
              </Link>
              <Link
                href="mailto:security@harborintelligence.com?subject=PGP%20key%20request"
                className="group/link inline-flex items-center gap-1.5 font-mono text-[12.5px] uppercase tracking-[0.12em] text-stone-700 transition-colors hover:text-primary"
              >
                Request PGP key
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
