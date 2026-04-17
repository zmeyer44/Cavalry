import { Boxes, Clock, FileSearch, ScrollText, ShieldAlert } from 'lucide-react';
import { Eyebrow, SectionLead, SectionTitle } from './_shared';

const PAINS = [
  {
    icon: ShieldAlert,
    title: 'Supply chain risk',
    body: 'A malicious skill can inject prompt instructions that exfiltrate secrets, backdoor code, or bypass security review. No SBOM, no signing, no provenance.',
  },
  {
    icon: FileSearch,
    title: 'Shadow AI context',
    body: 'Security knows every package via Snyk or Dependabot. They have no idea which skills shaped the code your agents produced. A growing blind spot in SOC2 and ISO audits.',
  },
  {
    icon: Boxes,
    title: 'Fragmented knowledge',
    body: 'Every platform team writes their "how we do things" docs for AI agents. Scattered across repos, Confluence, and individual .claude directories — unversioned, undistributed, unmeasured.',
  },
  {
    icon: Clock,
    title: 'Skill drift',
    body: 'Skills reference specific library versions, internal endpoints, and API shapes. Without version management, they rot silently — and your agents generate confident, deprecated code.',
  },
  {
    icon: ScrollText,
    title: 'No visibility, no optimization',
    body: "Which skills are most used? Which teams adopt them fastest? Do they correlate with faster cycle times? Which should you deprecate? Platform leaders can't answer any of it.",
  },
];

export function Problem() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1280px] px-6 py-20 md:px-10 md:py-32">
        <div className="max-w-3xl">
          <Eyebrow>Problem</Eyebrow>
          <div className="mt-6">
            <SectionTitle lead="Skills are a new dependency type." />
            <h2 className="mt-2 font-display text-[38px] font-semibold leading-[1.02] tracking-[-0.035em] text-stone-400 md:text-[56px]">
              Nobody is governing them.
            </h2>
          </div>
          <SectionLead>
            Engineers copy .cursorrules files from gists, install MCP servers from random repos, and
            pull skills from public registries with no review. Platform teams have no inventory,
            security has no scanning, and compliance has no audit trail.
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
