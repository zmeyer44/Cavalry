import { Eyebrow, SectionTitle } from './_shared';

const ITEMS = [
  {
    role: 'Platform engineering',
    title: 'Deploy, operate, integrate.',
    body: 'docker-compose or Helm. OIDC against Okta or Entra. Terraform provider for policy-as-code (M+). Good docs, clean APIs, no "another SaaS console" energy.',
  },
  {
    role: 'CISO · AppSec',
    title: 'Close the governance gap.',
    body: 'Audit every install. SIEM deliveries in 5s. SOC2-ready retention defaults. Pair with Snyk, Wiz, or equivalent — Cavalry closes the context-level blind spot.',
  },
  {
    role: 'Software engineers',
    title: 'Never notice Cavalry exists.',
    body: 'Run cursor or claude as always. Skills that pass policy install instantly. Skills that need approval surface a structured error with an actionable link.',
  },
  {
    role: 'Internal library teams',
    title: 'Write skills your agents actually use.',
    body: 'Publish with cavalry publish. Watch adoption curves per team. Iterate weekly. Ship your internal SDK conventions to every IDE your company uses.',
  },
];

export function Personas() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1280px] px-6 py-20 md:px-10 md:py-32">
        <div className="max-w-3xl">
          <Eyebrow>Built for four roles</Eyebrow>
          <div className="mt-6">
            <SectionTitle
              lead="Governance that lands"
              emph="at every altitude."
            />
          </div>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
          {ITEMS.map((p, i) => (
            <article
              key={p.role}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-stone-50 to-white p-10 ring-1 ring-stone-200/70 transition-all duration-300 hover:ring-stone-300 hover:shadow-[0_20px_50px_-20px_rgba(12,10,9,0.15)]"
            >
              <div className="flex items-start gap-4">
                <div
                  aria-hidden
                  className="font-mono text-[28px] font-semibold leading-none tabular text-primary/30"
                >
                  0{i + 1}
                </div>
                <div className="flex-1">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
                    {p.role}
                  </p>
                  <h3 className="mt-3 font-display text-[24px] font-semibold tracking-[-0.02em] text-stone-950">
                    {p.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-stone-600">{p.body}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
