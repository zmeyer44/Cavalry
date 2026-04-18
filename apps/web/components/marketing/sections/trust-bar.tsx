type Agent = { name: string; logo: string; tweak?: string };

const AGENTS: Agent[] = [
  { name: 'Claude Code', logo: '/assets/company-logos/claude-code.svg' },
  { name: 'Cursor', logo: '/assets/company-logos/cursor.svg' },
  { name: 'Codex', logo: '/assets/company-logos/codex.svg' },
  { name: 'Windsurf', logo: '/assets/company-logos/windsurf.svg' },
  { name: 'Cline', logo: '/assets/company-logos/cline.svg' },
  { name: 'Continue', logo: '/assets/company-logos/continue.png' },
  { name: 'Aider', logo: '/assets/company-logos/aider.svg' },
  { name: 'Roo Code', logo: '/assets/company-logos/roo-code.svg' },
  { name: 'Zed', logo: '/assets/company-logos/zed.svg' },
  { name: 'Bolt', logo: '/assets/company-logos/bolt.svg' },
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
          {AGENTS.map((a) => (
            <li
              key={a.name}
              className="group flex h-16 items-center justify-center rounded-2xl border border-stone-200/70 bg-stone-50/60 px-4 transition-colors duration-200 hover:border-stone-300 hover:bg-white"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.logo}
                alt={a.name}
                title={a.name}
                loading="lazy"
                decoding="async"
                className="h-7 w-auto max-w-[120px] object-contain opacity-70 grayscale transition duration-200 group-hover:opacity-100 group-hover:grayscale-0"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
