import { cn } from '@/lib/utils';
import { Eyebrow } from './_shared';

const TOOLS = [
  'Claude Code',
  'Cursor',
  'Codex',
  'Aider',
  'Windsurf',
  'Tessl',
  'GitHub',
  'MCP',
];

export function Integrations() {
  return (
    <section className="bg-stone-50">
      <div className="mx-auto max-w-[1280px] px-6 py-20 md:px-10 md:py-24">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <Eyebrow tone="primary">Integrates with your agent stack</Eyebrow>
          <p className="max-w-sm text-[14.5px] leading-relaxed text-stone-500">
            Drop Cavalry in without asking developers to change their tools. Every major coding
            agent and upstream registry speaks our gateway.
          </p>
        </div>
        <div className="mt-10 overflow-hidden rounded-3xl bg-white ring-1 ring-stone-200/80 shadow-[0_20px_50px_-30px_rgba(12,10,9,0.1)]">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8">
            {TOOLS.map((t, i) => (
              <div
                key={t}
                className={cn(
                  'group relative flex h-24 items-center justify-center transition-colors hover:bg-stone-50/70 md:h-28',
                  // verticals (col dividers) — skip first of each row
                  i % 2 !== 0 && 'border-l border-stone-100 sm:border-l-0',
                  i % 4 !== 0 && 'sm:border-l sm:border-stone-100 md:border-l-0',
                  i % 8 !== 0 && 'md:border-l md:border-stone-100',
                  // horizontals — second row on mobile (2 cols), sm (4 cols)
                  i >= 2 && 'border-t border-stone-100 sm:border-t-0',
                  i >= 4 && 'sm:border-t sm:border-stone-100 md:border-t-0',
                )}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />
                <span className="font-mono text-[12.5px] tracking-[0.02em] text-stone-700 transition-colors group-hover:text-stone-950 md:text-[13px]">
                  {t}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
