import { Boxes, Clock, FileSearch, ScrollText, ShieldAlert } from 'lucide-react';
import { Eyebrow, SectionLead, SectionTitle } from './_shared';

const PAINS = [
  {
    icon: Clock,
    title: 'Repetitive admin drag',
    body: 'Operations, finance, and HR teams spend hours every week on data entry, reconciliations, document review, and routing. Headcount grows; throughput does not.',
  },
  {
    icon: FileSearch,
    title: 'Messy business data',
    body: 'Insight is buried in PDFs, email threads, spreadsheets, CRM notes, and knowledge bases. Pulling a clean answer takes a meeting, an analyst, and a week.',
  },
  {
    icon: Boxes,
    title: 'Disconnected systems',
    body: "Your CRM does not talk to your ERP, support, or finance tools. Context is copy-pasted between tabs and lost. Decisions get made on stale data.",
  },
  {
    icon: ScrollText,
    title: 'Support volume creeping up',
    body: 'Customer and employee questions keep climbing. The team triages, summarizes, and routes by hand. Response times slip; satisfaction scores follow.',
  },
  {
    icon: ShieldAlert,
    title: 'Generic AI tools fall short',
    body: "Off-the-shelf chatbots do not understand your workflows, your data, or your customers. The tools your team already adopted produce demos, not measurable outcomes.",
  },
];

export function Problem() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1280px] px-6 py-20 md:px-10 md:py-32">
        <div className="max-w-3xl">
          <Eyebrow>Problem</Eyebrow>
          <div className="mt-6">
            <SectionTitle lead="AI is a vague strategic priority." />
            <h2 className="mt-2 font-display text-[38px] font-semibold leading-[1.02] tracking-[-0.035em] text-stone-400 md:text-[56px]">
              The hard part is figuring out where to start.
            </h2>
          </div>
          <SectionLead>
            Most mid-market companies know AI is going to change how they operate. The hard part
            is identifying what is actually worth automating, and how to implement it without
            disrupting the business.
          </SectionLead>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {PAINS.map((p, i) => (
            <article
              key={i}
              className="group relative overflow-hidden rounded-2xl border border-stone-200/80 bg-stone-50/60 p-7 transition-all duration-300 hover:-translate-y-0.5 hover:border-stone-300 hover:bg-white hover:shadow-[0_24px_60px_-30px_rgba(12,10,9,0.2)]"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
              <div className="flex size-10 items-center justify-center rounded-xl bg-white ring-1 ring-stone-200/80 shadow-sm transition-all duration-300 group-hover:ring-primary/30">
                <p.icon className="size-[18px] text-primary" strokeWidth={1.75} />
              </div>
              <h3 className="mt-6 font-display text-[18px] font-semibold tracking-[-0.015em] text-stone-950">
                {p.title}
              </h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-stone-600">{p.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
