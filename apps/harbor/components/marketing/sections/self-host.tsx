import { ArrowRight } from 'lucide-react';
import { CtaButton } from '@/components/marketing/cta-button';
import { Eyebrow, SectionLead, SectionTitle } from './_shared';
import { cn } from '@/lib/utils';

const META = [
  { label: 'Audit', value: 'Week 1 · 2' },
  { label: 'Pilot', value: 'Week 3 · 6' },
  { label: 'Production', value: 'Week 7 · 12' },
];

const CODE = `# Week 1 · 2  ▸  AI Workflow Audit
  · Map operations, systems, and data
  · Score workflows by ROI + feasibility
  · Deliver a prioritized roadmap

# Week 3 · 6  ▸  Pilot build
  · Design the highest-ROI workflow first
  · Integrate with your existing systems
  · Train the team that will own it

# Week 7 · 12 ▸  Production + scale
  · Launch with monitored adoption
  · Measure hours saved + accuracy
  · Plan the next two automations`;

export function SelfHost() {
  return (
    <section id="engagement" className="bg-white">
      <div className="mx-auto max-w-[1280px] px-6 py-24 md:px-10 md:py-32">
        <div className="grid grid-cols-1 gap-14 md:grid-cols-12 md:gap-12">
          <div className="md:col-span-5">
            <Eyebrow tone="primary">Engagement model</Eyebrow>
            <div className="mt-6">
              <SectionTitle lead="From audit" />
              <h2 className="mt-1 font-display text-[38px] font-semibold leading-[1.02] tracking-[-0.035em] text-stone-400 md:text-[56px]">
                to production in 90 days.
              </h2>
            </div>
            <SectionLead>
              Every engagement starts with a focused audit of your operations, then narrows to a
              single high-ROI workflow we ship to production. Once one automation is paying back,
              we plan the next. No multi-year programs, no slide-deck strategies.
            </SectionLead>
            <div className="mt-10 flex flex-wrap gap-3">
              <CtaButton
                href="/contact"
                variant="primary-light"
                icon={ArrowRight}
              >
                Book a discovery call
              </CtaButton>
              <CtaButton
                href="#how-it-works"
                variant="secondary-light"
              >
                See our approach
              </CtaButton>
            </div>
          </div>
          <div className="md:col-span-7">
            <div className="relative">
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-4 -z-10 rounded-[32px] bg-gradient-to-br from-primary/[0.1] via-stone-100/40 to-transparent blur-2xl"
              />
              <div className="overflow-hidden rounded-2xl bg-neutral-950 ring-1 ring-neutral-800 shadow-[0_30px_80px_-30px_rgba(12,10,9,0.4)]">
                <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-neutral-700" />
                    <span className="size-2.5 rounded-full bg-neutral-700" />
                    <span className="size-2.5 rounded-full bg-neutral-700" />
                  </div>
                  <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                    ~ engagement
                  </span>
                </div>
                <pre className="overflow-x-auto p-6 font-mono text-[12.5px] leading-relaxed text-neutral-200">
                  {CODE}
                </pre>
              </div>
              <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-2xl bg-stone-100/60 ring-1 ring-stone-200/80 text-[13px]">
                {META.map((t, i) => (
                  <div
                    key={t.label}
                    className={cn(
                      'p-5 transition-colors hover:bg-white',
                      i < META.length - 1 && 'border-r border-stone-200',
                    )}
                  >
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-stone-500">
                      {t.label}
                    </div>
                    <div className="mt-1.5 font-medium tracking-[-0.01em] text-stone-900">
                      {t.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
