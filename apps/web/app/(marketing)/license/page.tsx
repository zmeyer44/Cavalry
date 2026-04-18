import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Check, X } from 'lucide-react';
import { Eyebrow, SectionLead, SectionTitle } from '@/components/marketing/sections/_shared';

const GITHUB_URL = process.env.NEXT_PUBLIC_CAVALRY_GITHUB_URL as string;

export const metadata: Metadata = {
  title: 'License · Cavalry',
  description:
    'Cavalry is Apache 2.0. Run it, fork it, modify it, commercialize it. No contributor license agreement, no phone-home key file.',
};

const MAY = [
  'Run Cavalry in production, on any scale, in any environment',
  'Modify the source, rebrand internal forks, merge upstream at your cadence',
  'Sell hosted Cavalry, managed services, or support contracts on top',
  'Keep your modifications private — copyleft does not apply here',
];

const MUST = [
  'Preserve the LICENSE and NOTICE files with attribution',
  'Keep the Apache 2.0 header on modified source files',
  'Mark files you changed so downstream consumers know',
  'Honor the trademark rules below if you redistribute',
];

const TRADEMARK = [
  {
    k: 'The name "Cavalry"',
    v: 'Use it to refer to the upstream project. Do not use it in a product name, domain, or marketing headline that suggests your fork is the official Cavalry.',
  },
  {
    k: 'The horse mark',
    v: 'Use it in articles and talks that reference Cavalry. Do not reuse it as your own product mark, nor in ways that imply endorsement.',
  },
  {
    k: 'Official-sounding phrasing',
    v: "Phrases like \"certified\" or \"official Cavalry distribution\" require a written agreement. Everything else is fair game.",
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
            <Eyebrow tone="primary">License</Eyebrow>
            <div className="mt-6">
              <SectionTitle lead="Apache 2.0." emph="Full stop." />
            </div>
            <SectionLead>
              Cavalry is free software. Run it, fork it, modify it, commercialize it. No
              contributor license agreement. No phone-home key file. No license servers.
            </SectionLead>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={`${GITHUB_URL}/blob/main/LICENSE`}
                target="_blank"
                rel="noopener noreferrer"
                className="relative inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-3xl bg-primary px-4 font-display text-[15px] font-medium text-white transition-all duration-200 hover:rounded-none"
              >
                Read LICENSE on GitHub
                <ArrowUpRight className="size-4" />
              </Link>
              <Link
                href={`${GITHUB_URL}/blob/main/NOTICE`}
                target="_blank"
                rel="noopener noreferrer"
                className="group/link inline-flex items-center gap-1.5 font-mono text-[12.5px] uppercase tracking-[0.12em] text-stone-700 transition-colors hover:text-primary"
              >
                NOTICE
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
                Apache 2.0 covers code. Trademarks are handled separately so that a fork
                cannot masquerade as the upstream project.
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
            <Eyebrow tone="primary">Third-party</Eyebrow>
            <h3 className="mt-4 font-display text-[26px] font-semibold leading-[1.12] tracking-[-0.02em] text-stone-950">
              Built on many shoulders.
            </h3>
            <p className="mt-4 max-w-md text-[14.5px] leading-[1.6] text-stone-600">
              Cavalry bundles dozens of open-source dependencies. The full list of licenses
              and versions ships with the release artifact as{' '}
              <span className="font-mono text-stone-950">THIRD_PARTY_NOTICES.txt</span>.
            </p>
            <Link
              href={`${GITHUB_URL}/blob/main/THIRD_PARTY_NOTICES.txt`}
              target="_blank"
              rel="noopener noreferrer"
              className="group/link mt-6 inline-flex items-center gap-1.5 font-mono text-[12.5px] uppercase tracking-[0.12em] text-stone-700 transition-colors hover:text-primary"
            >
              Browse the list
              <ArrowUpRight className="size-3.5 transition-transform group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" />
            </Link>
          </div>
          <div>
            <Eyebrow>Contributing</Eyebrow>
            <h3 className="mt-4 font-display text-[26px] font-semibold leading-[1.12] tracking-[-0.02em] text-stone-950">
              No CLA. Signed commits.
            </h3>
            <p className="mt-4 max-w-md text-[14.5px] leading-[1.6] text-stone-600">
              Contributions are accepted under the same Apache 2.0 terms. Sign your commits,
              include a test for the path you changed, and open a PR. The maintainers
              respond within a business day.
            </p>
            <Link
              href={`${GITHUB_URL}/blob/main/CONTRIBUTING.md`}
              target="_blank"
              rel="noopener noreferrer"
              className="group/link mt-6 inline-flex items-center gap-1.5 font-mono text-[12.5px] uppercase tracking-[0.12em] text-stone-700 transition-colors hover:text-primary"
            >
              CONTRIBUTING.md
              <ArrowUpRight className="size-3.5 transition-transform group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
