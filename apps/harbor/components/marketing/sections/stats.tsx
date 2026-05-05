import { Eyebrow } from './_shared';
import { cn } from '@/lib/utils';

const STATS = [
  {
    value: '78',
    suffix: '%',
    heading: 'AI adoption pressure',
    desc: 'of mid-market leaders say AI is a top-three strategic priority — and most have no roadmap to act on it.',
  },
  {
    value: '40',
    suffix: '%',
    heading: 'Hours reclaimable',
    desc: 'of operational work in finance, support, and admin teams is repeatable, rules-based, and ready for automation.',
  },
  {
    value: '24',
    suffix: ' hrs',
    heading: 'Agents that never clock out',
    desc: 'AI works through the night, the weekend, and the queue your team would not get to until Monday. Throughput without burnout.',
  },
];

export function Stats() {
  return (
    <section className="relative bg-stone-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent"
      />
      <div className="mx-auto max-w-[1280px] px-6 py-20 md:px-10 md:py-28">
        <Eyebrow>The mid-market AI gap</Eyebrow>
        <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-3xl bg-stone-200/70 shadow-[0_1px_0_rgba(0,0,0,0.04),0_24px_60px_-24px_rgba(12,10,9,0.08)] md:grid-cols-3">
          {STATS.map((s, i) => (
            <div
              key={i}
              className={cn(
                'group relative overflow-hidden bg-white p-8 transition-colors md:p-12',
                'hover:bg-[color:oklch(0.99_0.01_85)]',
              )}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-6 -top-10 size-40 rounded-full bg-primary/[0.05] blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
              <div className="relative tabular flex items-start text-[84px] font-semibold font-display leading-[0.9] tracking-[-0.055em] text-stone-950 md:text-[104px]">
                <span>{s.value}</span>
                {s.suffix ? <span className="text-primary">{s.suffix}</span> : null}
              </div>
              <h3 className="relative mt-8 font-display text-[17px] font-semibold tracking-[-0.01em] text-stone-950">
                {s.heading}
              </h3>
              <p className="relative mt-2 text-[14.5px] leading-relaxed text-stone-600">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
