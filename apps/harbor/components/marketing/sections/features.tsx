import {
  CopilotInSlackMockup,
  IntelligenceQueryMockup,
  OutcomesDashboardMockup,
  ReviewQueueMockup,
  WorkflowRunsMockup,
} from '@/components/marketing/mockups';
import { cn } from '@/lib/utils';
import { Eyebrow, SectionLead, SectionTitle } from './_shared';

type FeatureRow = {
  eyebrow: string;
  title: string;
  emph: string;
  body: string;
  bullets: string[];
  visual: React.ReactNode;
  reverse?: boolean;
};

const FEATURES: FeatureRow[] = [
  {
    eyebrow: '01 · Workflow automation',
    title: 'Custom AI systems that',
    emph: 'remove repetitive work.',
    body: 'We design automations around the way your team actually operates — not around a vendor template. Invoice intake, document review, reconciliations, ticket triage, back-office handoffs. The work disappears; the throughput stays.',
    bullets: [
      'Built into the tools you already run — not a separate dashboard',
      'Scoped to one high-ROI workflow before scaling to the next',
      'Hours-saved targets agreed up front, measured per release',
    ],
    visual: <WorkflowRunsMockup />,
  },
  {
    eyebrow: '02 · Operational visibility',
    title: 'Every automation is',
    emph: 'a measurable outcome.',
    body: 'You see what each AI system did, what it saved, and where it drew the line. Hours saved, accuracy spot checks, escalation rates — the same view your operators and your CFO can read together.',
    bullets: [
      'Hours saved + throughput, per workflow',
      'Audit trail behind every model decision',
      'Clear escalation path when AI declines or defers',
    ],
    visual: <OutcomesDashboardMockup />,
    reverse: true,
  },
  {
    eyebrow: '03 · Business intelligence',
    title: 'Turn messy data into',
    emph: 'usable answers.',
    body: 'Your insight is buried across PDFs, emails, CRM notes, spreadsheets, and knowledge bases. We build extraction and synthesis systems so your team gets the answer they need without scheduling another meeting.',
    bullets: [
      'Document and email extraction at scale',
      'CRM, ERP, and warehouse-aware queries',
      'Citations on every answer the AI returns',
    ],
    visual: <IntelligenceQueryMockup />,
  },
  {
    eyebrow: '04 · AI assistants',
    title: 'Internal copilots for',
    emph: 'the work your team owns.',
    body: 'A sales rep drafting a proposal, a support agent triaging a ticket, an ops lead reviewing a contract — each gets an assistant that knows your data, your tone, and your guardrails. Available where they already work.',
    bullets: [
      'Embedded in Slack, email, CRM, and helpdesk',
      'Grounded on your sources, not the public web',
      'Role-aware permissions and redaction',
    ],
    visual: <CopilotInSlackMockup />,
    reverse: true,
  },
  {
    eyebrow: '05 · Human-in-the-loop',
    title: 'AI that knows when to',
    emph: 'ask a person.',
    body: 'Some decisions need a human. We build review flows so the AI completes what it can, surfaces what it cannot, and routes the rest to the right reviewer — async, with full context, no extra meetings.',
    bullets: [
      'Configurable confidence and value thresholds',
      'Slack, email, or in-app review queues',
      'Full audit of requester, reviewer, and reasoning',
    ],
    visual: <ReviewQueueMockup />,
  },
];

export function Features() {
  return (
    <section id="features" className="bg-white">
      <div className="mx-auto max-w-[1280px] px-6 pt-24 md:px-10 md:pt-32">
        <div className="max-w-3xl">
          <Eyebrow>What we build</Eyebrow>
          <div className="mt-6">
            <SectionTitle
              lead="Practical AI for the work"
              emph="your team actually does."
            />
          </div>
          <SectionLead>
            Not generic chatbots. Not slide decks. Custom AI built around how your business
            already runs, integrated into the tools your team already uses, with the metrics
            to prove it landed.
          </SectionLead>
        </div>
      </div>
      {FEATURES.map((f, i) => (
        <FeatureBlock key={f.eyebrow} data={f} index={i} />
      ))}
    </section>
  );
}

function FeatureBlock({ data, index }: { data: FeatureRow; index: number }) {
  const alt = index % 2 === 1;
  return (
    <div className={cn('relative', alt ? 'bg-stone-50' : 'bg-white')}>
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-14 px-6 py-24 md:grid-cols-12 md:gap-12 md:px-10 md:py-32">
        <div
          className={cn(
            'md:col-span-5',
            data.reverse && 'md:order-2 md:col-start-8 md:col-end-13',
          )}
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
            <span aria-hidden className="mr-2 inline-block h-[1px] w-4 translate-y-[-3px] bg-current align-middle opacity-80" />
            {data.eyebrow}
          </p>
          <h3 className="mt-6 font-display text-[32px] font-semibold leading-[1.04] tracking-[-0.03em] text-stone-950 md:text-[44px]">
            {data.title}
            <br />
            <span className="text-stone-500">{data.emph}</span>
          </h3>
          <p className="mt-6 text-[15.5px] leading-[1.6] text-stone-600 md:text-[16.5px]">
            {data.body}
          </p>
          <ul className="mt-7 space-y-3">
            {data.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-3 text-[14.5px]">
                <span
                  aria-hidden
                  className="mt-[9px] size-1.5 shrink-0 rounded-full bg-primary"
                  style={{ boxShadow: '0 0 0 3px color-mix(in oklab, var(--primary) 18%, transparent)' }}
                />
                <span className="text-stone-700">{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <div
          className={cn(
            'md:col-span-7',
            data.reverse && 'md:order-1 md:col-start-1 md:col-end-8',
          )}
        >
          <div className="relative">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-6 -z-10 rounded-[32px] bg-gradient-to-br from-primary/[0.08] via-transparent to-transparent blur-2xl md:-inset-10"
            />
            <div className="overflow-hidden rounded-2xl ring-1 ring-stone-900/5 shadow-[0_30px_80px_-30px_rgba(12,10,9,0.35)]">
              {data.visual}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
