import {
  ApprovalsMockup,
  AuditLogMockup,
  PolicyEditorMockup,
  SkillDetailMockup,
  TerminalMockup,
} from '@/components/marketing/mockups';
import { cn } from '@/lib/utils';

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
    eyebrow: '01 · Policy enforcement',
    title: 'Rules that ship to production,',
    emph: 'not PowerPoint.',
    body: 'Allowlists, blocklists, version pins, and approval gates are all first-class. Policies evaluate at the gateway before an install completes; errors surface to the CLI with the policy name and rationale.',
    bullets: [
      'Pure-function engine · 95% unit test coverage',
      'Scope at org or workspace level',
      'Preview a rule against sample installs before rollout',
    ],
    visual: <PolicyEditorMockup />,
  },
  {
    eyebrow: '02 · Immutable audit',
    title: 'Every governed change is',
    emph: 'an append-only row.',
    body: 'Ship SIEM-ready webhooks, export CSV, correlate commits to installs. Retention defaults configurable per org; deletion is not a supported verb.',
    bullets: [
      'Signed webhook delivery',
      'Splunk + Datadog adapters',
      'Actor identity preserved (user · token · system)',
    ],
    visual: <AuditLogMockup />,
    reverse: true,
  },
  {
    eyebrow: '03 · Internal registry',
    title: "Publish your org's skills once.",
    emph: 'Reach every agent.',
    body: "Platform teams write the skill that teaches agents to use your internal Kafka wrapper. Cavalry serves it to every developer's Claude Code, Cursor, and Codex through the same gateway endpoint.",
    bullets: [
      'Content-addressed artifacts (sha256)',
      'Immutable versions, semver-validated',
      'Usage analytics per skill + per team',
    ],
    visual: <SkillDetailMockup />,
  },
  {
    eyebrow: '04 · CLI · proxy',
    title: 'A single command for',
    emph: 'every skill boundary.',
    body: 'cavalry publish, install, login, whoami. Your engineers never pull from a public registry directly — every fetch goes through your gateway, and every install record lands in Postgres with actor and project metadata.',
    bullets: [
      'Tessl · GitHub · HTTP upstream adapters',
      'Streaming sha256 verification on install',
      'Ecosystem-compatible (Claude Code, Cursor, Codex, Aider, Windsurf)',
    ],
    visual: <TerminalMockup />,
    reverse: true,
  },
  {
    eyebrow: '05 · Approvals',
    title: 'Human-in-the-loop,',
    emph: 'async.',
    body: 'When a policy fires, the install stalls with a structured error and an approval ticket is created. Slack delivers it; admins approve or deny. Your developers keep working; the install resolves on retry.',
    bullets: [
      'Slack OAuth · Approve/deny from the thread',
      'Auto-expire after configurable window',
      'Full audit of requester, approver, reason, timestamp',
    ],
    visual: <ApprovalsMockup />,
  },
];

export function Features() {
  return (
    <section id="features" className="bg-white">
      {FEATURES.map((f, i) => (
        <FeatureBlock key={f.eyebrow} data={f} index={i} />
      ))}
    </section>
  );
}

function FeatureBlock({ data, index }: { data: FeatureRow; index: number }) {
  const alt = index % 2 === 1;
  return (
    <div
      className={cn(
        'relative',
        alt ? 'bg-stone-50' : 'bg-white',
      )}
    >
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
