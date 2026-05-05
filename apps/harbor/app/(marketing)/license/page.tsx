import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Check, X } from 'lucide-react';
import { Eyebrow, SectionLead, SectionTitle } from '@/components/marketing/sections/_shared';

export const metadata: Metadata = {
  title: 'Terms · Harbor Intelligence',
  description:
    'How Harbor Intelligence engagements work — scope, IP, confidentiality, and the trademark rules. Designed to be readable in one sitting.',
};

const MAY = [
  'Use everything we build for you, in production, for the life of your business',
  'Modify, extend, or fold the work into your own systems and codebases',
  "Keep the code we ship — it lives in your repos under your team's control",
  'Reuse the methodology, playbooks, and frameworks we develop together',
];

const MUST = [
  'Honor the confidentiality terms in your MSA before sharing engagement details',
  "Respect named team members' authorization scope in your DPA",
  'Coordinate with us before public case studies, references, or talks',
  'Follow the trademark rules below if you reference Harbor Intelligence',
];

const TRADEMARK = [
  {
    k: 'The name "Harbor Intelligence"',
    v: 'Use it to describe your engagement, reference our work, or attribute frameworks. Do not use it in your product name, domain, or marketing in a way that implies we endorse or operate your product.',
  },
  {
    k: 'The Harbor mark',
    v: 'Use it in articles, talks, or case studies that reference our work. Do not reuse it as your own product mark, nor in ways that imply endorsement.',
  },
  {
    k: 'Official-sounding phrasing',
    v: 'Phrases like "certified by Harbor Intelligence" or "official Harbor partner" require a written agreement. Everything else is fair game.',
  },
];

export default function LicensePage() {
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
            <Eyebrow tone="primary">Terms of engagement</Eyebrow>
            <div className="mt-6">
              <SectionTitle lead="Plain-English terms." emph="Readable in one sitting." />
            </div>
            <SectionLead>
              Engagements are governed by a master services agreement and per-project SOWs.
              The summary below describes how we approach IP, confidentiality, and use of our
              name. The signed contract controls.
            </SectionLead>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="mailto:legal@harborintelligence.com"
                className="relative inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-3xl bg-primary px-4 font-display text-[15px] font-medium text-white transition-all duration-200 hover:rounded-none"
              >
                Request our MSA + DPA
                <ArrowUpRight className="size-4" />
              </Link>
              <Link
                href="/contact"
                className="group/link inline-flex items-center gap-1.5 font-mono text-[12.5px] uppercase tracking-[0.12em] text-stone-700 transition-colors hover:text-primary"
              >
                Talk to us
                <ArrowUpRight className="size-3.5 transition-transform group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-[1280px] px-6 py-16 md:px-10 md:py-24">
          <div className="grid gap-px overflow-hidden rounded-xl bg-stone-200 md:grid-cols-2">
            <div className="bg-white p-8 md:p-10">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
                <Check className="size-3" strokeWidth={2.5} /> You may
              </span>
              <ul className="mt-6 space-y-4">
                {MAY.map((c) => (
                  <li key={c} className="flex items-start gap-3 text-[14.5px] leading-[1.55] text-stone-800">
                    <span aria-hidden className="mt-[9px] size-1.5 shrink-0 rounded-full bg-primary" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white p-8 md:p-10">
              <span className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500">
                <X className="size-3" strokeWidth={2.5} /> You must
              </span>
              <ul className="mt-6 space-y-4">
                {MUST.map((c) => (
                  <li key={c} className="flex items-start gap-3 text-[14.5px] leading-[1.55] text-stone-700">
                    <span aria-hidden className="mt-[9px] size-1.5 shrink-0 rounded-full bg-stone-400" />
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
          <div className="grid gap-10 md:grid-cols-[1fr_1.6fr] md:gap-16">
            <div>
              <Eyebrow>Trademark</Eyebrow>
              <h3 className="mt-4 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-stone-950">
                Use the name,<span className="text-stone-500"> not the endorsement.</span>
              </h3>
              <p className="mt-4 max-w-sm text-[14.5px] leading-[1.6] text-stone-600">
                Our name and mark are handled separately from the work product so a former
                client cannot present themselves as Harbor Intelligence.
              </p>
            </div>
            <dl className="grid gap-px overflow-hidden rounded-xl bg-stone-200">
              {TRADEMARK.map((t) => (
                <div key={t.k} className="grid gap-2 bg-white p-6 md:grid-cols-[220px_1fr] md:gap-8">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500">
                    {t.k}
                  </dt>
                  <dd className="text-[14.5px] leading-[1.6] text-stone-700">{t.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="border-t border-stone-200 bg-white">
        <div className="mx-auto grid max-w-[1280px] gap-10 px-6 py-16 md:grid-cols-2 md:gap-16 md:px-10 md:py-24">
          <div>
            <Eyebrow tone="primary">Work product</Eyebrow>
            <h3 className="mt-4 font-display text-[26px] font-semibold leading-[1.12] tracking-[-0.02em] text-stone-950">
              Code we ship is yours.
            </h3>
            <p className="mt-4 max-w-md text-[14.5px] leading-[1.6] text-stone-600">
              Custom systems, integrations, and prompts written for your engagement transfer to
              you on payment. We retain rights to general methodology, playbooks, and any
              tooling we use across multiple clients — listed explicitly in the SOW.
            </p>
          </div>
          <div>
            <Eyebrow>Subcontracting</Eyebrow>
            <h3 className="mt-4 font-display text-[26px] font-semibold leading-[1.12] tracking-[-0.02em] text-stone-950">
              Named team. No surprises.
            </h3>
            <p className="mt-4 max-w-md text-[14.5px] leading-[1.6] text-stone-600">
              Every engagement is staffed by named Harbor Intelligence team members listed in
              your SOW. We do not subcontract delivery to outside agencies, and we do not staff
              changes mid-engagement without your written approval.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
