import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { Eyebrow, SectionLead, SectionTitle } from '@/components/marketing/sections/_shared';

export const metadata: Metadata = {
  title: 'Privacy · Cavalry',
  description:
    'What Cavalry collects, what it does not, and how long it keeps what it collects. Self-hosted by default; managed tier covered here.',
};

const UPDATED = '2026-04-18';

const COLLECT = [
  'Marketing traffic · GA4 with IP anonymization, no cross-site identifiers',
  'Contact form submissions · name, email, message, retained for 24 months',
  'Managed-tier org metadata · org name, billing contact, usage counters',
  'Error telemetry · stack traces, redacted request path, 90-day retention',
];

const NO_COLLECT = [
  'Skill source code, prompts, or engineer queries',
  'Request bodies or response bodies between agents and upstreams',
  'Git commit contents, workspace files, or secrets resolved at runtime',
  'Anything from your self-hosted deploy — Cavalry never phones home',
];

const SECTIONS: { eyebrow: string; title: string; body: string }[] = [
  {
    eyebrow: 'How we use data',
    title: 'Product improvement, billing, support.',
    body: 'Marketing analytics are aggregated before any human sees them. Contact form messages are routed to the inbox of the person best positioned to reply. Managed-tier usage counters drive billing and capacity planning, nothing more.',
  },
  {
    eyebrow: 'Retention',
    title: 'Short logs, long invoices.',
    body: 'Error telemetry is retained for 90 days, then purged. Analytics events age out after 14 months per GA4 defaults. Invoices and tax records are retained for 7 years as required by law. Audit rows created inside your self-hosted deploy live under your retention policy, not ours.',
  },
  {
    eyebrow: 'Subprocessors',
    title: 'A short list, published.',
    body: "The managed tier relies on a small set of named subprocessors: a cloud hosting provider, a transactional email vendor, an error telemetry vendor, and a payments processor. The current list, with sub-processors' privacy pages, lives at cavalry.sh/trust and is updated before new processors are engaged.",
  },
  {
    eyebrow: 'Your rights',
    title: 'Access, correction, deletion, portability.',
    body: 'GDPR and CCPA rights are honored regardless of where you live. Email privacy@cavalry.sh with your request; identity verification takes up to five business days, fulfillment up to thirty. We do not sell personal data.',
  },
  {
    eyebrow: 'Changes',
    title: 'Material changes are announced.',
    body: 'We post revisions to this page with a dated changelog. Material changes affecting existing customers are announced by email at least thirty days in advance.',
  },
];

export default function PrivacyPage() {
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
            <Eyebrow tone="primary">Privacy · updated {UPDATED}</Eyebrow>
            <div className="mt-6">
              <SectionTitle lead="What we collect," emph="and what we don't." />
            </div>
            <SectionLead>
              Cavalry is self-hosted by default — your organization's gateway, your
              Postgres, your object store. This policy covers the marketing site at
              cavalry.sh and the optional managed tier.
            </SectionLead>
          </div>
        </div>
      </section>

      <section className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-[1280px] px-6 py-16 md:px-10 md:py-24">
          <div className="grid gap-px overflow-hidden rounded-xl bg-stone-200 md:grid-cols-2">
            <div className="bg-white p-8 md:p-10">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
                <Check className="size-3" strokeWidth={2.5} /> We collect
              </span>
              <ul className="mt-6 space-y-4">
                {COLLECT.map((c) => (
                  <li key={c} className="flex items-start gap-3 text-[14.5px] leading-[1.55] text-stone-800">
                    <span
                      aria-hidden
                      className="mt-[9px] size-1.5 shrink-0 rounded-full bg-primary"
                    />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white p-8 md:p-10">
              <span className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500">
                <X className="size-3" strokeWidth={2.5} /> We don't collect
              </span>
              <ul className="mt-6 space-y-4">
                {NO_COLLECT.map((c) => (
                  <li key={c} className="flex items-start gap-3 text-[14.5px] leading-[1.55] text-stone-500">
                    <span
                      aria-hidden
                      className="mt-[9px] size-1.5 shrink-0 rounded-full bg-stone-300"
                    />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-stone-50">
        <div className="mx-auto max-w-[1280px] px-6 py-16 md:px-10 md:py-24">
          <div className="space-y-12 md:space-y-16">
            {SECTIONS.map((s) => (
              <article
                key={s.eyebrow}
                className="grid gap-6 border-t border-stone-200 pt-10 md:grid-cols-[1fr_1.8fr] md:gap-16 md:pt-12"
              >
                <div>
                  <Eyebrow>{s.eyebrow}</Eyebrow>
                  <h3 className="mt-4 font-display text-[24px] font-semibold leading-[1.15] tracking-[-0.02em] text-stone-950 md:text-[28px]">
                    {s.title}
                  </h3>
                </div>
                <p className="text-[15px] leading-[1.7] text-stone-700 md:text-[16px]">
                  {s.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-[1280px] px-6 py-16 md:px-10 md:py-20">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <Eyebrow>Contact</Eyebrow>
              <h3 className="mt-4 max-w-xl font-display text-[24px] font-semibold leading-[1.15] tracking-[-0.02em] text-stone-950">
                Questions, requests, or a rights inquiry?
              </h3>
              <p className="mt-3 max-w-md text-[14.5px] leading-[1.6] text-stone-600">
                Cavalry, Inc. · Delaware. Mail the privacy team at{' '}
                <span className="font-mono text-stone-950">privacy@cavalry.sh</span>.
              </p>
            </div>
            <Link
              href="mailto:privacy@cavalry.sh"
              className="relative inline-flex h-10 cursor-pointer items-center justify-center gap-2 self-start rounded-3xl bg-primary px-4 font-display text-[15px] font-medium text-white transition-all duration-200 hover:rounded-none"
            >
              privacy@cavalry.sh
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
