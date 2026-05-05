import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { Eyebrow, SectionLead, SectionTitle } from '@/components/marketing/sections/_shared';

export const metadata: Metadata = {
  title: 'Privacy · Harbor Intelligence',
  description:
    'What Harbor Intelligence collects from prospects and clients, what it does not, and how it handles your data during an engagement.',
};

const UPDATED = '2026-04-18';

const COLLECT = [
  'Marketing traffic · GA4 with IP anonymization, no cross-site identifiers',
  'Contact form submissions · name, email, message, retained for 24 months',
  'Engagement metadata · scope, billing contact, project artifacts under NDA',
  'Error telemetry from systems we operate · 90-day retention',
];

const NO_COLLECT = [
  'Client data outside the scope of an active engagement',
  'Customer records, employee records, or business data between sessions',
  'Source code, prompts, or content beyond what is required to deliver the work',
  'Anything you have not authorized in a signed SOW or DPA',
];

const SECTIONS: { eyebrow: string; title: string; body: string }[] = [
  {
    eyebrow: 'How we use data',
    title: 'Engagement delivery, billing, support.',
    body: 'Marketing analytics are aggregated before any human sees them. Contact form messages are routed to the person best positioned to reply. Client engagement data is used only to deliver the work scoped in your SOW, and only by named team members listed in your DPA.',
  },
  {
    eyebrow: 'Retention',
    title: 'Short logs, long invoices.',
    body: 'Error telemetry is retained for 90 days, then purged. Analytics events age out after 14 months per GA4 defaults. Invoices and tax records are retained for 7 years as required by law. Engagement artifacts are retained per your contract — typically deleted on request within 30 days of close-out.',
  },
  {
    eyebrow: 'Subprocessors',
    title: 'A short list, published.',
    body: "We rely on a small set of named subprocessors: cloud hosting, transactional email, error telemetry, and payments. The current list, with subprocessors' privacy pages, is provided alongside every DPA and updated before new processors are engaged.",
  },
  {
    eyebrow: 'Your rights',
    title: 'Access, correction, deletion, portability.',
    body: 'GDPR and CCPA rights are honored regardless of where you live. Email privacy@harborintelligence.com with your request; identity verification takes up to five business days, fulfillment up to thirty. We do not sell personal data and we do not train public models on client data.',
  },
  {
    eyebrow: 'Changes',
    title: 'Material changes are announced.',
    body: 'We post revisions to this page with a dated changelog. Material changes affecting existing clients are announced by email at least thirty days in advance.',
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
              This policy covers the marketing site at harborintelligence.com and the
              engagements we run with clients. Anything we touch inside your environment is
              governed by the SOW and DPA you sign — not this page.
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
                Harbor Intelligence, Inc. · Delaware. Mail the privacy team at{' '}
                <span className="font-mono text-stone-950">privacy@harborintelligence.com</span>.
              </p>
            </div>
            <Link
              href="mailto:privacy@harborintelligence.com"
              className="relative inline-flex h-10 cursor-pointer items-center justify-center gap-2 self-start rounded-3xl bg-primary px-4 font-display text-[15px] font-medium text-white transition-all duration-200 hover:rounded-none"
            >
              privacy@harborintelligence.com
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
