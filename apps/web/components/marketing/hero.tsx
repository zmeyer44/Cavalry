import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { CellGrid } from '@/components/cell-grid';

const GITHUB_URL = process.env.NEXT_PUBLIC_CAVALRY_GITHUB_URL as string;
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 80% at 85% 10%, oklch(0.94 0.05 260 / 0.35) 0%, transparent 60%), radial-gradient(60% 80% at 10% 70%, oklch(0.96 0.02 85 / 0.7) 0%, transparent 55%)',
        }}
      />
      <div className="relative mx-auto max-w-[1280px] px-6 md:px-10">
        <div className="pt-10 md:pt-16">
          <Link
            href={GITHUB_URL}
            target="_blank"
            className="group/badge relative overflow-hidden inline-flex items-center h-[20px] gap-1.5 rounded-r-[20px] hover:rounded-r-none font-display bg-primary/10 px-2.5 py-1 pl-3.5 text-[12.5px] leading-none text-foreground hover:text-white transition-all"
          >
            <div className="z-0 absolute inset-y-0 left-0 w-1 bg-primary transition-all group-hover/badge:w-full" />
            <span className="z-10">Cavalry Alpha · Now self-hostable</span>
            <ArrowUpRight className="size-3 opacity-70 transition-transform group-hover/badge:translate-x-1 group-hover/badge:rotate-45 group-hover/badge:opacity-100" />
          </Link>
        </div>

        <h1 className="mt-6 font-display text-[36px] font-semibold leading-[1.05] tracking-[-0.035em] text-stone-950 sm:text-[44px] md:text-[52px] lg:text-[58px]">
          Govern your AI <span className="text-primary">skill&nbsp;supply&nbsp;chain</span>
        </h1>

        <p className="mt-5 max-w-[460px] text-[14.5px] leading-[1.55] text-stone-600 md:text-[15.5px]">
          Proxy every skill install through policy, publish your internal conventions, and audit
          every fetch.
        </p>

        <div className="mt-7 flex flex-wrap gap-2">
          <Link
            href="/signup"
            className="relative inline-flex h-10 min-w-11 flex-none cursor-pointer items-center justify-center gap-2 rounded-3xl bg-primary px-4 font-display text-[15px] font-medium text-white transition-all duration-200 hover:rounded-none"
          >
            Start self-hosting
          </Link>
          <Link
            href="/contact"
            className="relative inline-flex h-10 min-w-11 flex-none cursor-pointer items-center justify-center gap-2 rounded-none border-0 bg-stone-200 px-4 font-display text-[15px] font-medium text-stone-700 transition-colors duration-200 hover:bg-stone-300 hover:text-stone-900"
          >
            Contact sales
          </Link>
        </div>

        <div className="mt-16 md:mt-24">
          <div className="relative h-[170px] overflow-hidden rounded-2xl md:h-[220px]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10"
              style={{
                background:
                  'linear-gradient(to bottom, transparent 0%, transparent 60%, #ffffff 100%), linear-gradient(to right, #ffffff 0%, transparent 8%, transparent 92%, #ffffff 100%)',
              }}
            />
            <CellGrid
              rows={3}
              cellsPerRow={[22, 32]}
              weightRange={[1, 3]}
              baseFill={0.18}
              seed={19}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
