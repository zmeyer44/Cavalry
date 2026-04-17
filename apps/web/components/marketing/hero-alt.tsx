import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { CellGrid } from '@/components/cell-grid';
import { CtaButton } from '@/components/marketing/cta-button';

export function Hero() {
  return (
    <section className="relative mx-auto max-w-[1280px] px-6 md:px-10">
      <div className="pt-10 md:pt-16">
        <Link
          href="/docs/PRD"
          className="group/badge inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[13px] leading-none text-emerald-900 transition-colors hover:border-emerald-300 hover:bg-emerald-100"
        >
          Announcing Cavalry Alpha
          <ArrowUpRight className="size-3.5 transition-transform group-hover/badge:translate-x-0.5 group-hover/badge:-translate-y-0.5" />
        </Link>
      </div>

      <h1 className="mt-7 max-w-[760px] text-[38px] font-semibold leading-[1.02] tracking-[-0.035em] text-neutral-950 sm:text-[48px] md:text-[56px] lg:text-[64px]">
        Govern AI context at scale
      </h1>

      <p className="mt-5 max-w-[460px] text-[15px] leading-[1.5] text-neutral-700 md:text-[16px]">
        Proxy public registries through a policy-enforcing gateway, host your internal skills, and
        audit every install your developers and agents make.
      </p>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <CtaButton href="/signup" variant="primary-light">
          Get started
        </CtaButton>
        <CtaButton href="/contact" variant="secondary-light">
          Talk to an engineer
        </CtaButton>
      </div>

      <div className="mt-12 h-[160px] md:mt-14 md:h-[200px]">
        <CellGrid
          rows={3}
          cellsPerRow={[22, 32]}
          weightRange={[1, 3]}
          baseFill={0.22}
          seed={19}
        />
      </div>
    </section>
  );
}
