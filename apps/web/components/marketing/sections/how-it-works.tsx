import { GatewayFlowMockup } from '@/components/marketing/mockups';
import { Eyebrow, SectionLead, SectionTitle } from './_shared';

export function HowItWorks() {
  return (
    <section className="relative overflow-hidden bg-neutral-950 text-stone-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(80% 60% at 20% 0%, oklch(0.32 0.14 260 / 0.45) 0%, transparent 60%), radial-gradient(60% 50% at 90% 100%, oklch(0.28 0.1 260 / 0.35) 0%, transparent 55%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />
      <div className="relative mx-auto max-w-[1280px] px-6 py-24 md:px-10 md:py-32">
        <div className="max-w-3xl">
          <Eyebrow tone="invert">How it works</Eyebrow>
          <div className="mt-6">
            <SectionTitle
              lead="One gateway between your engineers"
              emph="and the skill ecosystem."
              tone="dark"
            />
          </div>
          <SectionLead tone="dark">
            Every install flows through Cavalry. Policies evaluate, caches fill, audit rows append.
            Upstream sources — Tessl, GitHub, HTTP — are proxied; internal skills live inside.
          </SectionLead>
        </div>
        <div className="mt-16 rounded-3xl bg-white/[0.02] p-4 ring-1 ring-white/10 backdrop-blur-sm md:mt-20 md:p-8">
          <GatewayFlowMockup />
        </div>
      </div>
    </section>
  );
}
