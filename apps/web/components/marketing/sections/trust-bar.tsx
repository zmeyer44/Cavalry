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
    <section className="bg-white pb-16 pt-6 md:pb-24 md:pt-10">
      <div className="mx-auto max-w-[1120px] px-6 md:px-10">
        <p className="mb-10 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500">
          Works with the coding agents your team already uses
        </p>
        <ul
          role="list"
          className="mx-auto grid max-w-[960px] grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5"
        >
          {AGENTS.map((name) => (
            <li
              key={name}
              className="group flex h-11 items-center justify-center rounded-full border border-stone-200/80 bg-stone-50 px-4 font-mono text-[12.5px] tracking-[0.02em] text-stone-700 transition-colors hover:border-stone-300 hover:bg-white hover:text-stone-950"
            >
              {name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
