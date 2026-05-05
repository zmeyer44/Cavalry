import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Eyebrow, SectionLead, SectionTitle } from './_shared';

type Cell = boolean | 'partial';

const ROWS: Array<{
  feature: string;
  harbor: Cell;
  bigCo: Cell;
  shelf: Cell;
  agency: Cell;
  diy: Cell;
}> = [
  { feature: 'Built around your existing systems', harbor: true, bigCo: 'partial', shelf: false, agency: 'partial', diy: 'partial' },
  { feature: 'Mid-market pricing and pace', harbor: true, bigCo: false, shelf: true, agency: 'partial', diy: 'partial' },
  { feature: 'Strategy + implementation in one team', harbor: true, bigCo: 'partial', shelf: false, agency: false, diy: false },
  { feature: 'Measurable ROI in under 90 days', harbor: true, bigCo: false, shelf: 'partial', agency: 'partial', diy: false },
  { feature: 'No replacing your current tech stack', harbor: true, bigCo: false, shelf: 'partial', agency: 'partial', diy: true },
  { feature: 'Security + compliance baked in', harbor: true, bigCo: true, shelf: 'partial', agency: 'partial', diy: false },
  { feature: 'Adoption support after launch', harbor: true, bigCo: 'partial', shelf: false, agency: false, diy: 'partial' },
];

const COLS: Array<{ key: keyof (typeof ROWS)[number]; label: string; highlight?: boolean }> = [
  { key: 'harbor', label: 'Harbor', highlight: true },
  { key: 'bigCo', label: 'Big-4 consulting' },
  { key: 'shelf', label: 'Off-the-shelf AI' },
  { key: 'agency', label: 'Generalist agency' },
  { key: 'diy', label: 'In-house DIY' },
];

function CellMark({ v, highlight }: { v: Cell; highlight?: boolean }) {
  if (v === true) {
    return (
      <span
        className={cn(
          'mx-auto inline-flex size-6 items-center justify-center rounded-full',
          highlight ? 'bg-primary text-white' : 'bg-stone-900 text-white',
        )}
      >
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (v === 'partial') {
    return (
      <span className="mx-auto inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-stone-500">
        <span aria-hidden className="size-1.5 rounded-full bg-stone-400" />
        partial
      </span>
    );
  }
  return <Minus aria-hidden className="mx-auto size-3.5 text-stone-300" strokeWidth={2.5} />;
}

export function Comparison() {
  return (
    <section className="bg-stone-50">
      <div className="mx-auto max-w-[1280px] px-6 py-20 md:px-10 md:py-32">
        <div className="max-w-3xl">
          <Eyebrow>Comparison</Eyebrow>
          <div className="mt-6">
            <SectionTitle lead="Strategic enough to advise." emph="Technical enough to build." />
          </div>
          <SectionLead>
            Enterprise consultants are too expensive, too slow, and too abstract. Off-the-shelf
            tools are too generic to solve real operational problems. Harbor Intelligence sits in
            the middle, built for mid-market companies that need outcomes, not innovation theater.
          </SectionLead>
        </div>

        <div className="mt-12 overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_-30px_rgba(12,10,9,0.15)] ring-1 ring-stone-900/5">
          <div className="overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="w-[34%] px-6 py-5 text-left font-mono text-[11px] uppercase tracking-[0.16em] text-stone-500">
                    Capability
                  </th>
                  {COLS.map((c) => (
                    <th
                      key={c.label}
                      className={cn(
                        'px-4 py-5 text-center text-[13px] font-semibold tracking-[-0.01em]',
                        c.highlight
                          ? 'bg-gradient-to-b from-primary/[0.06] to-transparent text-primary'
                          : 'text-stone-700',
                      )}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r, i) => (
                  <tr
                    key={i}
                    className={cn(
                      'transition-colors hover:bg-stone-50/60',
                      i < ROWS.length - 1 && 'border-b border-stone-100',
                    )}
                  >
                    <td className="px-6 py-4 text-stone-900">{r.feature}</td>
                    {COLS.map((c) => (
                      <td
                        key={c.label}
                        className={cn(
                          'px-4 py-4 text-center',
                          c.highlight && 'bg-primary/[0.03]',
                        )}
                      >
                        <CellMark v={r[c.key] as Cell} highlight={c.highlight} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
