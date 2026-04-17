import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { CellGrid } from '@/components/cell-grid';
import { CtaButton } from '@/components/marketing/cta-button';
import { cn } from '@/lib/utils';

const dashH = 'repeating-linear-gradient(to right, oklch(0 0 0 / 0.22) 0 4px, transparent 4px 8px)';
const dashV =
  'repeating-linear-gradient(to bottom, oklch(0 0 0 / 0.22) 0 4px, transparent 4px 8px)';

const hLineFull = 'pointer-events-none absolute left-[calc(50%-50vw)] right-[calc(50%-50vw)] h-px';
const hLine = cn(hLineFull, 'lg:right-[-1.25rem]');

export function Hero() {
  return (
    <section className="relative mx-auto max-w-[1280px] px-6 md:px-10">
      <div className="relative w-full">
        <div className="pt-6 md:pt-6">
          <Link
            href="/docs/PRD"
            className="group/badge inline-flex items-center gap-2.5 border border-primary/25 bg-primary/[0.04] px-3 py-1.5 font-mono text-[11px] uppercase leading-none tracking-[0.1em] text-primary transition-colors hover:border-primary/50 hover:bg-primary/[0.07]"
          >
            <span className="relative flex size-1.5 items-center justify-center">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative size-1.5 rounded-full bg-primary" />
            </span>
            Alpha
            <span className="text-primary/40">·</span>
            Self-hostable
            <ArrowUpRight className="size-3 transition-transform group-hover/badge:translate-x-0.5 group-hover/badge:-translate-y-0.5" />
          </Link>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-px"
          style={{ backgroundImage: dashV }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-px"
          style={{ backgroundImage: dashV }}
        />
        <div className="relative mt-4 md:mt-4">
          <div className="grid gap-6 lg:grid-cols-12 lg:gap-10">
            <div className="relative flex flex-col gap-4 md:gap-8 lg:col-span-7">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 hidden w-px lg:right-[-1.25rem] lg:block"
                style={{ backgroundImage: dashV }}
              />
              <div className="relative py-2 md:py-0">
                <div
                  aria-hidden
                  className={cn(hLineFull, 'top-0')}
                  style={{ backgroundImage: dashH }}
                />
                <h1 className="text-[48px] font-semibold leading-[0.98] tracking-[-0.035em] text-neutral-950 sm:text-[64px] md:text-[80px] lg:text-[88px]">
                  Govern AI context at scale
                </h1>
                <div
                  aria-hidden
                  className={cn(hLine, 'bottom-0')}
                  style={{ backgroundImage: dashH }}
                />
              </div>

              <div className="relative">
                <div
                  aria-hidden
                  className={cn(hLine, 'top-0')}
                  style={{ backgroundImage: dashH }}
                />
                <p className="max-w-[720px] text-[18px] leading-[1.5] text-neutral-700 md:text-[20px]">
                  Proxy public registries through a policy-enforcing gateway, host your internal
                  skills, and audit every install your developers and agents make.
                </p>
                <div
                  aria-hidden
                  className={cn(hLine, 'bottom-0')}
                  style={{ backgroundImage: dashH }}
                />
              </div>

              <div className="relative p-px md:py-0.5">
                <div
                  aria-hidden
                  className={cn(hLine, 'top-0')}
                  style={{ backgroundImage: dashH }}
                />
                <div className="flex flex-wrap items-center gap-3 md:gap-4">
                  <CtaButton href="/signup" variant="primary-light">
                    Get started
                  </CtaButton>
                  <CtaButton href="/contact" variant="secondary-light">
                    Talk to an engineer
                  </CtaButton>
                </div>
                <div
                  aria-hidden
                  className={cn(hLineFull, 'bottom-0')}
                  style={{ backgroundImage: dashH }}
                />
              </div>
            </div>

            <div className="relative hidden lg:col-span-5 lg:block">
              <div className="absolute inset-y-0 right-0 left-[-1.25rem]">
                <CellGrid seed={7} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
