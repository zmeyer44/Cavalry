import { Eyebrow, SectionTitle } from './_shared';

const ITEMS = [
  {
    role: 'CEOs · COOs',
    title: 'Move from AI curiosity to AI capability.',
    body: 'Get a clear, prioritized roadmap of where AI creates the most value, what to avoid, and how to scale responsibly. Outcomes in 30, 60, 90 days — not a slide deck and a maybe.',
  },
  {
    role: 'Operations · finance',
    title: 'Take the manual work off your team.',
    body: "Reconciliations, document review, reporting, vendor onboarding, approvals — automated inside the systems you already run. Your team's capacity grows without growing headcount.",
  },
  {
    role: 'Customer · employee support',
    title: 'Answer faster without losing the human touch.',
    body: 'AI agents triage incoming requests, summarize history, draft responses, and escalate when they should. Your team handles more volume and gets to the work that actually needs them.',
  },
  {
    role: 'Sales · revenue ops',
    title: 'Pull pipeline forward, not paperwork.',
    body: 'Auto-drafted proposals, account research, CRM hygiene, quote-to-cash handoffs. Reps spend their day selling; the back-office work writes itself.',
  },
];

export function Personas() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1280px] px-6 py-20 md:px-10 md:py-32">
        <div className="max-w-3xl">
          <Eyebrow>Built for four teams</Eyebrow>
          <div className="mt-6">
            <SectionTitle lead="AI that pays back" emph="at every level of the org." />
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
