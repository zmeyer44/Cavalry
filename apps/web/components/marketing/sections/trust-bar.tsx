import { cn } from '@/lib/utils';

const AGENTS = [
  'Claude Code',
  'Cursor',
  'Codex',
  'Windsurf',
  'Cline',
  'Continue',
  'Aider',
  'Roo Code',
  'Zed',
  'Bolt',
];

export function TrustBar() {
  return (
    <section className="bg-white pb-14 pt-4 md:pb-20">
      <div className="mx-auto max-w-[1120px] px-6 md:px-10">
        <p className="mb-8 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500">
          Works with the coding agents your team already uses
        </p>
        <div className="mx-auto max-w-[960px]">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3">
            {AGENTS.map((name, i) => (
              <span key={name} className="flex items-center">
                <span
                  className={cn(
                    'rounded-full border border-stone-200/80 bg-stone-50 px-4 py-2 font-mono text-[12px] tracking-[0.02em] text-stone-700 transition-colors',
                    'hover:border-stone-300 hover:bg-white hover:text-stone-950',
                  )}
                >
                  {name}
                </span>
                {i < AGENTS.length - 1 && (
                  <span aria-hidden className="mx-1 h-1 w-1 rounded-full bg-stone-300" />
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
