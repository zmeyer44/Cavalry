import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  ShieldAlert,
  Boxes,
  FileSearch,
  Clock,
  ScrollText,
  Check,
} from 'lucide-react';
import { CellGrid } from '@/components/cell-grid';
import { CtaButton } from '@/components/marketing/cta-button';
import { Logo } from '@/assets/logo';
import { cn } from '@/lib/utils';
import {
  PolicyEditorMockup,
  AuditLogMockup,
  SkillDetailMockup,
  TerminalMockup,
  GatewayFlowMockup,
  ApprovalsMockup,
} from './mockups';

// ─── Shared dashed-line constants & frame helper ───────────────────────

const DASH_H =
  'repeating-linear-gradient(to right, oklch(0 0 0 / 0.22) 0 4px, transparent 4px 8px)';
const DASH_V =
  'repeating-linear-gradient(to bottom, oklch(0 0 0 / 0.22) 0 4px, transparent 4px 8px)';
const DASH_H_DARK =
  'repeating-linear-gradient(to right, oklch(1 0 0 / 0.22) 0 4px, transparent 4px 8px)';
const DASH_V_DARK =
  'repeating-linear-gradient(to bottom, oklch(1 0 0 / 0.22) 0 4px, transparent 4px 8px)';

/**
 * Renders the four hero-style dashed lines — horizontals span viewport,
 * verticals hug the container. Must be placed inside a `relative` parent.
 */
function DashFrame({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const h = tone === 'dark' ? DASH_H_DARK : DASH_H;
  const v = tone === 'dark' ? DASH_V_DARK : DASH_V;
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-[calc(50%-50vw)] right-[calc(50%-50vw)] h-px"
        style={{ backgroundImage: h }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-[calc(50%-50vw)] right-[calc(50%-50vw)] h-px"
        style={{ backgroundImage: h }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-px"
        style={{ backgroundImage: v }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-px"
        style={{ backgroundImage: v }}
      />
    </>
  );
}

// ─── Trust bar ─────────────────────────────────────────────────────────

export function TrustBar() {
  const agents = [
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
  return (
    <section className="pb-10 pt-0">
      <div className="mx-auto max-w-[1120px] px-6 text-center md:px-10">
        <h2 className="mb-6 text-[14px] text-neutral-500">
          Works with the coding agents your team already uses
        </h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          {agents.map((name) => (
            <div
              key={name}
              className="flex h-16 w-full items-center justify-center rounded-lg border border-neutral-200/80 bg-neutral-100/80 px-4 sm:h-18 md:h-20"
            >
              <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-neutral-700 md:text-[13px]">
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Grid separator strip ─────────────────────────────────────────────

export function GridSeparator() {
  return (
    <div className="mx-auto h-[60px] max-w-[1280px] px-6 md:h-[80px] md:px-10">
      <CellGrid rows={2} cellsPerRow={[3, 7]} baseFill={0.18} seed={42} />
    </div>
  );
}

// ─── Stats strip ────────────────────────────────────────────────────────

export function Stats() {
  const stats = [
    {
      value: '84%',
      heading: 'Developer adoption',
      desc: 'of developers use or plan to use AI coding agents in their daily workflow.',
    },
    {
      value: '51%',
      heading: 'AI-assisted code',
      desc: "of GitHub's committed code is AI-assisted — and the share keeps climbing each quarter.",
    },
    {
      value: '0',
      heading: 'Skill visibility',
      desc: 'inventory of the skills your agents are reading today. No SBOM, no audit trail, no review.',
    },
  ];
  return (
    <section className="mx-auto max-w-[1280px] px-6 py-14 md:px-10 md:py-20">
      <p className="mb-8 font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-500">
        The governance vacuum
      </p>
      <div className="grid grid-cols-1 border border-neutral-200 bg-white md:grid-cols-3">
        {stats.map((s, i) => (
          <div
            key={i}
            className={cn(
              'group p-6 transition-colors hover:bg-primary/5 md:p-8',
              i < stats.length - 1 && 'border-b border-neutral-200 md:border-r md:border-b-0',
            )}
          >
            <div className="tabular text-[52px] font-semibold leading-none tracking-[-0.04em] text-neutral-950 transition-colors group-hover:text-primary md:text-[64px]">
              {s.value}
            </div>
            <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.01em] text-neutral-950">
              {s.heading}
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-neutral-600">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Problem / pain points ─────────────────────────────────────────────

export function Problem() {
  const pains = [
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
      body: 'Which skills are most used? Which teams adopt them fastest? Do they correlate with faster cycle times? Which should you deprecate? Platform leaders can\u2019t answer any of it.',
    },
  ];
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1280px] px-6 py-20 md:px-10 md:py-28">
        <div className="max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-500">
            Problem
          </p>
          <h2 className="mt-4 text-[36px] font-semibold leading-[1.02] tracking-[-0.03em] text-neutral-950 md:text-[52px]">
            Skills are a new dependency type.
            <br />
            <span className="text-neutral-400">Nobody is governing them.</span>
          </h2>
          <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-neutral-700 md:text-[17px]">
            Engineers copy .cursorrules files from gists, install MCP servers from random repos, and
            pull skills from public registries with no review. Platform teams have no inventory,
            security has no scanning, and compliance has no audit trail.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 border border-neutral-200 bg-white md:grid-cols-2 lg:grid-cols-3">
          {pains.map((p, i) => {
            const col = i % 3;
            const row = Math.floor(i / 3);
            const totalRowsLg = Math.ceil(pains.length / 3);
            return (
              <div
                key={i}
                className={cn(
                  'group relative p-6 transition-colors hover:bg-primary/[0.04] md:p-8',
                  // mobile: bottom border except last
                  i < pains.length - 1 && 'border-b border-neutral-200',
                  // md (2 cols): override — bottom border only on non-last row
                  'md:border-b-0',
                  row === 0 && pains.length > 2 && 'md:border-b md:border-neutral-200',
                  // md col divider
                  i % 2 === 0 && 'md:border-r md:border-neutral-200',
                  // lg (3 cols): reset col divider pattern
                  'lg:border-r-0',
                  col < 2 && 'lg:border-r lg:border-neutral-200',
                  // lg row divider
                  row < totalRowsLg - 1 && 'lg:border-b lg:border-neutral-200',
                )}
              >
                <div className="flex size-9 items-center justify-center border border-primary/30 bg-primary/[0.06] text-primary transition-colors group-hover:border-primary/60">
                  <p.icon className="size-[18px]" />
                </div>
                <h3 className="mt-5 text-[17px] font-semibold tracking-[-0.01em] text-neutral-950">
                  {p.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-neutral-600">{p.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── How it works (flow diagram in dark section) ───────────────────────

export function HowItWorks() {
  return (
    <section className="bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-[1280px] px-6 py-20 md:px-10 md:py-28">
        <div className="max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-400">
            How it works
          </p>
          <h2 className="mt-4 text-[36px] font-semibold leading-[1.02] tracking-[-0.03em] md:text-[52px]">
            One gateway between your engineers
            <br />
            <span className="text-neutral-500">and the skill ecosystem.</span>
          </h2>
          <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-neutral-400 md:text-[17px]">
            Every install flows through Cavalry. Policies evaluate, caches fill, audit rows append.
            Upstream sources — Tessl, GitHub, HTTP — are proxied; internal skills live inside.
          </p>
        </div>
        <div className="relative mt-12 md:mt-16">
          <DashFrame tone="dark" />
          <div className="px-6 py-10 md:px-10 md:py-14">
            <GatewayFlowMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Feature section: alternating row with UI + copy ───────────────────

export function Features() {
  const features: FeatureRowData[] = [
    {
      eyebrow: '01 · Policy enforcement',
      title: 'Rules that ship to production, not PowerPoint.',
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
      title: 'Every governed change is an append-only row.',
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
      title: 'Publish your org&rsquo;s skills once. Reach every agent.',
      body: 'Platform teams write the skill that teaches agents to use your internal Kafka wrapper. Cavalry serves it to every developer&rsquo;s Claude Code, Cursor, and Codex through the same gateway endpoint.',
      bullets: [
        'Content-addressed artifacts (sha256)',
        'Immutable versions, semver-validated',
        'Usage analytics per skill + per team',
      ],
      visual: <SkillDetailMockup />,
    },
    {
      eyebrow: '04 · CLI · proxy',
      title: 'A single command for every skill boundary.',
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
      title: 'Human-in-the-loop, async.',
      body: 'When a policy fires, the install stalls with a structured error and an approval ticket is created. Slack delivers it; admins approve or deny. Your developers keep working; the install resolves on retry.',
      bullets: [
        'Slack OAuth · Approve/deny from the thread',
        'Auto-expire after configurable window',
        'Full audit of requester, approver, reason, timestamp',
      ],
      visual: <ApprovalsMockup />,
    },
  ];
  return (
    <section id="features" className="bg-white">
      {features.map((f, i) => (
        <FeatureRow key={f.eyebrow} data={f} isLast={i === features.length - 1} />
      ))}
    </section>
  );
}

type FeatureRowData = {
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  visual: React.ReactNode;
  reverse?: boolean;
};

function FeatureRow({ data, isLast }: { data: FeatureRowData; isLast: boolean }) {
  const { eyebrow, title, body, bullets, visual, reverse } = data;
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-[calc(50%-50vw)] right-[calc(50%-50vw)] h-px"
        style={{ backgroundImage: DASH_H }}
      />
      {isLast ? (
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-[calc(50%-50vw)] right-[calc(50%-50vw)] h-px"
          style={{ backgroundImage: DASH_H }}
        />
      ) : null}
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-12 px-6 py-20 md:grid-cols-12 md:gap-10 md:px-10 md:py-28">
        <div
          className={cn(
            'md:col-span-5 md:pt-4',
            reverse && 'md:order-2 md:col-start-8 md:col-end-13',
          )}
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
          <h3 className="mt-5 text-[30px] font-semibold leading-[1.05] tracking-[-0.025em] text-neutral-950 md:text-[40px]">
            <span dangerouslySetInnerHTML={{ __html: title }} />
          </h3>
          <p className="mt-5 text-[15.5px] leading-[1.55] text-neutral-600 md:text-[16.5px]">
            {body}
          </p>
          <ul className="mt-6 space-y-2.5">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-3 text-[14px]">
                <span aria-hidden className="mt-[7px] size-1.5 shrink-0 bg-primary" />
                <span className="text-neutral-600">{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={cn('md:col-span-7', reverse && 'md:order-1 md:col-start-1 md:col-end-8')}>
          {visual}
        </div>
      </div>
    </div>
  );
}

// ─── Personas ──────────────────────────────────────────────────────────

export function Personas() {
  const items = [
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
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1280px] px-6 py-20 md:px-10 md:py-28">
        <div className="max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-500">
            Built for four roles
          </p>
          <h2 className="mt-4 text-[36px] font-semibold leading-[1.02] tracking-[-0.03em] text-neutral-950 md:text-[52px]">
            Governance that lands at every altitude.
          </h2>
        </div>
        <div className="mt-12 grid grid-cols-1 border border-neutral-200 bg-white md:grid-cols-2">
          {items.map((p, i) => (
            <div
              key={p.role}
              className={cn(
                'group relative p-7 transition-colors hover:bg-primary/[0.04] md:p-10',
                // right divider on even-index (desktop 2-col)
                i % 2 === 0 && 'md:border-r md:border-neutral-200',
                // bottom divider on all but last (mobile) / all but last row (desktop)
                i < items.length - 1 && 'border-b border-neutral-200',
                i < items.length - 2 ? 'md:border-b md:border-neutral-200' : 'md:border-b-0',
              )}
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
                {p.role}
              </p>
              <h3 className="mt-4 text-[22px] font-semibold tracking-[-0.02em] text-neutral-950">
                {p.title}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Comparison ────────────────────────────────────────────────────────

export function Comparison() {
  const rows: Array<{
    feature: string;
    cavalry: boolean | string;
    tessl: boolean | string;
    spec: boolean | string;
    kiro: boolean | string;
    jfrog: boolean | string;
  }> = [
    { feature: 'Self-hostable', cavalry: true, tessl: false, spec: true, kiro: false, jfrog: true },
    {
      feature: 'Policy engine (allow / block / pin / approve)',
      cavalry: true,
      tessl: 'partial',
      spec: false,
      kiro: false,
      jfrog: false,
    },
    {
      feature: 'Immutable audit log',
      cavalry: true,
      tessl: 'partial',
      spec: false,
      kiro: false,
      jfrog: true,
    },
    {
      feature: 'Understands skills as a type',
      cavalry: true,
      tessl: true,
      spec: 'partial',
      kiro: 'partial',
      jfrog: false,
    },
    {
      feature: 'Proxies public registries',
      cavalry: true,
      tessl: false,
      spec: false,
      kiro: false,
      jfrog: false,
    },
    {
      feature: 'SIEM + webhook integrations',
      cavalry: true,
      tessl: false,
      spec: false,
      kiro: false,
      jfrog: 'partial',
    },
    {
      feature: 'OIDC · SAML · SCIM',
      cavalry: true,
      tessl: 'partial',
      spec: false,
      kiro: 'partial',
      jfrog: true,
    },
  ];
  const cols: Array<{ key: keyof (typeof rows)[number]; label: string; highlight?: boolean }> = [
    { key: 'cavalry', label: 'Cavalry', highlight: true },
    { key: 'tessl', label: 'Tessl' },
    { key: 'spec', label: 'GitHub Spec Kit' },
    { key: 'kiro', label: 'AWS Kiro' },
    { key: 'jfrog', label: 'Artifactory' },
  ];
  function Cell({ v }: { v: boolean | string }) {
    if (v === true) return <Check aria-hidden className="mx-auto size-4 text-primary" />;
    if (v === 'partial')
      return (
        <span className="mx-auto inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-neutral-500">
          <span aria-hidden className="size-1.5 bg-neutral-400" />
          partial
        </span>
      );
    return <span aria-hidden className="mx-auto block h-px w-5 bg-neutral-400" />;
  }
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1280px] px-6 py-20 md:px-10 md:py-28">
        <div className="max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-500">
            Comparison
          </p>
          <h2 className="mt-4 text-[36px] font-semibold leading-[1.02] tracking-[-0.03em] text-neutral-950 md:text-[52px]">
            Artifactory for AI agent context.
          </h2>
          <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-neutral-700">
            Public registries will consolidate around Tessl and platform-native offerings. The
            governance layer — the thing that sits inside your walls — is a separate, uncaptured
            category.
          </p>
        </div>
        <div className="mt-10 border border-neutral-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px]">
              <thead className="bg-primary/[0.04]">
                <tr>
                  <th className="px-5 py-4 text-left font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                    Capability
                  </th>
                  {cols.map((c) => (
                    <th
                      key={c.label}
                      className={cn(
                        'px-5 py-4 text-center font-mono text-[11px] uppercase tracking-[0.12em]',
                        c.highlight ? 'text-primary' : 'text-neutral-700',
                      )}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-neutral-200">
                    <td className="px-5 py-4 text-neutral-900">{r.feature}</td>
                    {cols.map((c) => (
                      <td
                        key={c.label}
                        className={cn('px-5 py-4 text-center', c.highlight && 'bg-primary/[0.04]')}
                      >
                        <Cell v={r[c.key] as boolean | string} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Self-host / open source ───────────────────────────────────────────

export function SelfHost() {
  const meta = [
    { label: 'License', value: 'BSL 1.1 → Apache 2.0' },
    { label: 'Footprint', value: 'Postgres + S3-compatible' },
    { label: 'Deploy', value: 'docker-compose · Helm' },
  ];
  return (
    <section id="self-host" className="bg-white">
      <div className="relative mx-auto max-w-[1280px] px-6 md:px-10">
        <div className="relative">
          <DashFrame />
          <div className="grid grid-cols-1 gap-12 py-20 md:grid-cols-12 md:py-28">
            <div className="md:col-span-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
                Self-host
              </p>
              <h2 className="mt-5 text-[36px] font-semibold leading-[1.02] tracking-[-0.03em] text-neutral-950 md:text-[52px]">
                Open-core.
                <br />
                <span className="text-neutral-400">Inside your walls.</span>
              </h2>
              <p className="mt-6 max-w-lg text-[16px] leading-relaxed text-neutral-700 md:text-[17px]">
                Cavalry is licensed under the Business Source License 1.1, with a three-year
                conversion to Apache 2.0. Self-host freely; a hosted competitive service is the only
                restriction. Enterprise features land in the commercial tier.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <CtaButton href="/docs" variant="primary-light" icon={ArrowRight}>
                  Deployment guide
                </CtaButton>
                <CtaButton
                  href="https://github.com"
                  variant="secondary-light"
                  icon={ArrowUpRight}
                  external
                >
                  View on GitHub
                </CtaButton>
              </div>
            </div>
            <div className="md:col-span-6">
              <div className="border border-neutral-800 bg-neutral-950 text-neutral-100">
                <div className="border-b border-neutral-800 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-500">
                  ~ quickstart
                </div>
                <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed">
                  {`# 1. Bring up Postgres + MinIO
docker compose up -d

# 2. Apply migrations
pnpm db:migrate

# 3. Launch web + gateway
pnpm dev

# 4. Mint a token, point your CLI at it
cavalry login --url http://localhost:3001 --token cav_…

# 5. Publish an internal skill
cavalry publish ./path/to/your/skill`}
                </pre>
              </div>
              <div className="mt-4 grid grid-cols-3 border border-neutral-200 bg-white text-[12.5px]">
                {meta.map((t, i) => (
                  <div
                    key={t.label}
                    className={cn('p-4', i < meta.length - 1 && 'border-r border-neutral-200')}
                  >
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                      {t.label}
                    </div>
                    <div className="mt-1.5 text-neutral-900">{t.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Integrations (tool strip) ─────────────────────────────────────────

export function Integrations() {
  const tools = ['Claude Code', 'Cursor', 'Codex', 'Aider', 'Windsurf', 'Tessl', 'GitHub', 'MCP'];
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1280px] px-6 pt-16 pb-10 md:px-10 md:pt-20 md:pb-14">
        <p className="mb-8 font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
          Integrates with your agent stack
        </p>
        <div className="relative">
          <DashFrame />
          {/* Internal column dividers — 3 at 25/50/75% for 4 cols, 7 at 12.5%s for 8 cols */}
          {[12.5, 25, 37.5, 50, 62.5, 75, 87.5].map((left) => (
            <div
              key={left}
              aria-hidden
              className="pointer-events-none absolute inset-y-0 hidden w-px md:block"
              style={{ backgroundImage: DASH_V, left: `${left}%` }}
            />
          ))}
          {/* sm: 4-col dividers */}
          {[25, 50, 75].map((left) => (
            <div
              key={left}
              aria-hidden
              className="pointer-events-none absolute inset-y-0 hidden w-px sm:block md:hidden"
              style={{ backgroundImage: DASH_V, left: `${left}%` }}
            />
          ))}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8">
            {tools.map((t, i) => (
              <div
                key={t}
                className={cn(
                  'flex h-20 items-center justify-center md:h-24',
                  // mobile dashed dividers fallback
                  i % 2 === 0 && 'sm:border-0 border-r border-dashed border-neutral-300',
                  i < tools.length - 2 && 'sm:border-b-0 border-b border-dashed border-neutral-300',
                )}
              >
                <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-neutral-800 md:text-[13px]">
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

// ─── CTA banner ────────────────────────────────────────────────────────

export function CTA() {
  return (
    <section className="relative overflow-hidden bg-neutral-950 text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-30">
        <CellGrid
          rows={4}
          cellsPerRow={[3, 7]}
          baseFill={0.08}
          seed={11}
          background="#0a0a0a"
          palette={['#0a0a0a', 'oklch(0.35 0.05 260)', 'oklch(0.5786 0.2259 260.56)']}
          paletteWeights={[0.55, 0.3, 0.15]}
        />
      </div>
      <div className="relative mx-auto max-w-[1280px] px-6 md:px-10">
        <div className="relative">
          <DashFrame tone="dark" />
          <div className="flex flex-col items-start gap-8 py-20 md:flex-row md:items-center md:justify-between md:py-28">
            <div className="max-w-2xl">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
                Ready when you are
              </p>
              <h2 className="mt-5 text-[36px] font-semibold leading-[1.02] tracking-[-0.03em] md:text-[56px]">
                Start governing your agent context today.
              </h2>
              <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-neutral-400 md:text-[17px]">
                Clone the repo, bring up docker-compose, and run your first policy eval in under
                five minutes.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <CtaButton href="/signup" variant="primary-dark" icon={ArrowRight}>
                Get started
              </CtaButton>
              <CtaButton href="/docs" variant="secondary-dark">
                Read the docs
              </CtaButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ────────────────────────────────────────────────────────────

export function Footer() {
  const cols = [
    {
      title: 'Product',
      items: [
        { label: 'Features', href: '#features' },
        { label: 'Self-host', href: '#self-host' },
        { label: 'Roadmap', href: '/docs/PRD' },
        { label: 'Changelog', href: '/docs/changelog' },
      ],
    },
    {
      title: 'Resources',
      items: [
        { label: 'Docs', href: '/docs' },
        { label: 'CLI', href: '/docs/cli' },
        { label: 'Architecture', href: '/docs/architecture' },
        { label: 'ADRs', href: '/docs/decisions' },
      ],
    },
    {
      title: 'Company',
      items: [
        { label: 'Contact', href: '/contact' },
        { label: 'Security', href: '/security' },
        { label: 'Privacy', href: '/privacy' },
        { label: 'License', href: '/license' },
      ],
    },
  ];
  return (
    <footer className="relative bg-white">
      <div className="mx-auto max-w-[1280px] px-6 md:px-10">
        {/* Dashed top separator spanning viewport */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 left-[calc(50%-50vw)] right-[calc(50%-50vw)] h-px"
          style={{ backgroundImage: DASH_H }}
        />
        <div className="grid grid-cols-2 gap-10 py-16 md:grid-cols-5 md:py-20">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 text-primary">
              <Logo className="size-7" />
              <span className="text-[22px] font-semibold tracking-[-0.01em]">Cavalry</span>
            </Link>
            <p className="mt-4 max-w-sm text-[13.5px] leading-relaxed text-neutral-600">
              Governance, observability, and control for AI agent context at enterprise scale.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
                {c.title}
              </p>
              <ul className="mt-5 space-y-2.5 text-[14px]">
                {c.items.map((i) => (
                  <li key={i.label}>
                    <Link
                      href={i.href}
                      className="text-neutral-800 transition-colors hover:text-primary"
                    >
                      {i.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {/* Dashed bottom separator */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-[calc(50%-50vw)] right-[calc(50%-50vw)] h-px"
          style={{ backgroundImage: DASH_H, top: 'auto', bottom: '52px' }}
        />
        <div className="flex flex-col justify-between gap-3 py-6 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500 md:flex-row">
          <span>© 2026 Cavalry · BSL 1.1 → Apache 2.0 (2029)</span>
          <span>cavalry.sh</span>
        </div>
      </div>
    </footer>
  );
}
