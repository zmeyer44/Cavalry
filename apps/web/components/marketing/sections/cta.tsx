import { ArrowRight } from 'lucide-react';
import { CellGrid } from '@/components/cell-grid';
import { CtaButton } from '@/components/marketing/cta-button';
import { Eyebrow } from './_shared';

const DOCS_URL = process.env.NEXT_PUBLIC_CAVALRY_DOCS_URL as string;

export function CTA() {
  return (
    <section className="relative overflow-hidden bg-neutral-950 text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-25">
        <CellGrid
          rows={4}
          cellsPerRow={[3, 7]}
          baseFill={0.08}
          seed={11}
          background="#0a0a0a"
          palette={['#0a0a0a', 'oklch(0.35 0.05 260)', 'oklch(0.5786 0.2259 260.56)']}
          paletteWeights={[0.55, 0.3, 0.15]}
        />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 80% at 50% 100%, oklch(0.35 0.18 260 / 0.45) 0%, transparent 60%)',
        }}
      />
      <div className="relative mx-auto max-w-[1280px] px-6 py-24 md:px-10 md:py-32">
        <div className="max-w-2xl">
          <Eyebrow tone="invert">Ready when you are</Eyebrow>
        </div>
        <div className="mt-8 flex flex-col items-start gap-10 md:flex-row md:items-end md:justify-between">
          <h2 className="max-w-[720px] font-display text-[40px] font-semibold leading-[1.02] tracking-[-0.035em] text-white md:text-[68px]">
            Start governing your
            <br />
            agent context <span className="text-primary">today.</span>
          </h2>
          <div className="flex flex-col gap-4 md:items-end">
            <p className="max-w-sm text-[15px] leading-relaxed text-stone-400">
              Clone the repo, bring up docker-compose, and run your first policy eval in under five
              minutes.
            </p>
            <div className="flex flex-wrap gap-3">
              <CtaButton href="/signup" variant="primary-dark" icon={ArrowRight}>
                Get started
              </CtaButton>
              <CtaButton href={DOCS_URL} variant="secondary-dark" external>
                Read the docs
              </CtaButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
