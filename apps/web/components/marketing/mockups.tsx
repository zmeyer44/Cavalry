import { Boxes, Check, KeyRound, ScrollText, ShieldCheck, Terminal, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Static UI mockups used in marketing feature sections. These approximate
 * real Cavalry screens — not interactive, always dark-themed so they read
 * as "product shots" on light marketing backgrounds.
 */

function MockupChrome({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-800 bg-[oklch(0.164_0.011_230)] text-[oklch(0.955_0.006_85)] shadow-2xl">
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-neutral-700" />
            <span className="size-2.5 rounded-full bg-neutral-700" />
            <span className="size-2.5 rounded-full bg-neutral-700" />
          </div>
          <span className="ml-2 font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-500">
            {title}
          </span>
        </div>
        {subtitle ? (
          <span className="font-mono text-[11px] text-neutral-500">{subtitle}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

// ─── Policy editor ──────────────────────────────────────────────────────

export function PolicyEditorMockup() {
  return (
    <MockupChrome title="policies.edit" subtitle="acme / platform">
      <div className="grid gap-0 md:grid-cols-[220px_1fr]">
        <aside className="border-b border-neutral-800 bg-[oklch(0.128_0.011_235)] p-2 md:border-b-0 md:border-r">
          {[
            { name: 'tessl blocklist', type: 'blocklist', active: false },
            { name: 'version pin: react', type: 'version_pin', active: false },
            { name: 'approval: security', type: 'require_approval', active: true },
            { name: 'internal allow', type: 'allowlist', active: false },
          ].map((p) => (
            <div
              key={p.name}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] transition-colors',
                p.active ? 'bg-neutral-800 text-white' : 'text-neutral-400',
              )}
            >
              <ShieldCheck className="size-3.5" />
              <span className="truncate">{p.name}</span>
            </div>
          ))}
        </aside>
        <div className="space-y-3 p-5 text-[13px]">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-neutral-500">
                Policy
              </div>
              <div className="mt-0.5 text-[15px] font-medium">approval: security</div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[oklch(0.66_0.21_265)]/40 bg-[oklch(0.66_0.21_265)]/10 px-2 py-0.5 text-[11px] font-medium text-[oklch(0.66_0.21_265)]">
              enabled
            </span>
          </div>
          <div className="h-px bg-neutral-800" />
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-neutral-500">
              Type
            </div>
            <div className="mt-1 inline-flex items-center gap-2 rounded-md border border-neutral-800 bg-[oklch(0.128_0.011_235)] px-2.5 py-1.5 font-mono text-[12px]">
              require_approval
            </div>
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-neutral-500">
              Matching patterns
            </div>
            <div className="mt-1 space-y-1">
              {['tessl:*', 'github:*/security-*', 'http:*'].map((p) => (
                <div
                  key={p}
                  className="flex items-center justify-between rounded-md border border-neutral-800 bg-[oklch(0.128_0.011_235)] px-2.5 py-1.5 font-mono text-[12px]"
                >
                  <span>{p}</span>
                  <X className="size-3 text-neutral-600" />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 pt-2">
            <button
              type="button"
              className="rounded-md bg-[oklch(0.66_0.21_265)] px-3 py-1.5 text-[12px] font-medium text-white shadow-sm"
            >
              Save policy
            </button>
            <button
              type="button"
              className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-[12px] font-medium text-neutral-300"
            >
              Preview impact
            </button>
          </div>
        </div>
      </div>
    </MockupChrome>
  );
}

// ─── Audit log ──────────────────────────────────────────────────────────

export function AuditLogMockup() {
  const events = [
    { t: '2s', action: 'skill.install_blocked', resource: 'skill_ref/tessl:badactor/', actor: 'alice@acme.com', tone: 'red' as const },
    { t: '14s', action: 'skill.installed', resource: 'skill_version/kv_c2b6e469', actor: '<token:cav_jpuO>', tone: 'green' as const },
    { t: '3m', action: 'approval.decided', resource: 'approval/ap_9fd4a', actor: 'sec@acme.com', tone: 'green' as const },
    { t: '11m', action: 'skill.published', resource: 'skill_version/kv_48ab3e', actor: 'platform@acme.com', tone: 'blue' as const },
    { t: '42m', action: 'policy.updated', resource: 'policy/blocklist_t', actor: 'sec@acme.com', tone: 'blue' as const },
    { t: '1h', action: 'token.created', resource: 'api_token/ci_release', actor: 'platform@acme.com', tone: 'blue' as const },
    { t: '3h', action: 'member.joined', resource: 'user/authored_dev', actor: 'newhire@acme.com', tone: 'green' as const },
  ];
  const tone = {
    red: 'bg-[oklch(0.68_0.22_22)] shadow-[0_0_0_3px_oklch(0.68_0.22_22_/_0.18)]',
    green:
      'bg-[oklch(0.73_0.14_152)] shadow-[0_0_0_3px_oklch(0.73_0.14_152_/_0.16)]',
    blue: 'bg-[oklch(0.66_0.21_265)] shadow-[0_0_0_3px_oklch(0.66_0.21_265_/_0.2)]',
  };

  return (
    <MockupChrome title="log.cavalry.audit" subtitle="7 events">
      <ul className="divide-y divide-neutral-800 font-mono text-[12.5px]">
        {events.map((e, i) => (
          <li
            key={i}
            className="grid grid-cols-12 items-center gap-3 px-4 py-2.5"
          >
            <div className="col-span-2 flex items-center gap-2 text-neutral-500">
              <span className={cn('size-1.5 rounded-full', tone[e.tone])} />
              <span className="tabular">{e.t}</span>
            </div>
            <div className="col-span-4 truncate">{e.action}</div>
            <div className="col-span-3 truncate text-neutral-500">{e.resource}</div>
            <div className="col-span-3 truncate text-right text-neutral-500">
              {e.actor}
            </div>
          </li>
        ))}
      </ul>
      <div className="border-t border-neutral-800 px-4 py-2 text-center font-mono text-[11px] text-neutral-500">
        — end of log —
      </div>
    </MockupChrome>
  );
}

// ─── Skill detail ───────────────────────────────────────────────────────

export function SkillDetailMockup() {
  const versions = [
    { v: '1.2.0', at: '2 days ago', latest: true },
    { v: '1.1.3', at: '3 weeks ago' },
    { v: '1.1.2', at: '1 month ago' },
    { v: '1.0.0', at: '2 months ago' },
  ];
  return (
    <MockupChrome title="skills.detail">
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="cav-label text-neutral-500">Internal · Private</div>
            <div className="mt-1 font-mono text-[17px]">
              <span className="text-neutral-500">acme-platform</span>
              <span className="text-neutral-500">/</span>
              <span>kafka-wrapper</span>
            </div>
            <p className="mt-2 max-w-sm text-[13px] text-neutral-400">
              Teaches agents to use Acme&apos;s internal Kafka wrapper SDK. Redirects
              imports and adds retry conventions.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[11px] font-mono">
            private
          </span>
        </div>

        <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-800/40">
          {[
            { label: 'Installs · 30d', value: '412' },
            { label: 'Versions', value: '4' },
            { label: 'Latest', value: 'v1.2.0' },
          ].map((k) => (
            <div key={k.label} className="border-l border-neutral-800 p-3 first:border-l-0">
              <div className="cav-label text-neutral-500">{k.label}</div>
              <div className="mt-1 text-xl font-medium tabular">{k.value}</div>
            </div>
          ))}
        </div>

        <div className="relative border-l border-neutral-800 pl-5">
          {versions.map((v) => (
            <div key={v.v} className="relative pb-3 last:pb-0">
              <span className="absolute -left-[26px] top-1.5 inline-flex size-2 rounded-full border border-[oklch(0.66_0.21_265)] bg-neutral-900" />
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[13px] tabular">v{v.v}</span>
                {v.latest && (
                  <span className="rounded bg-[oklch(0.66_0.21_265)] px-1.5 py-0.5 text-[10px] font-medium text-white">
                    LATEST
                  </span>
                )}
                <span className="text-[11px] text-neutral-500">{v.at}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MockupChrome>
  );
}

// ─── CLI terminal ───────────────────────────────────────────────────────

export function TerminalMockup() {
  return (
    <MockupChrome title="~ engineer@acme" subtitle="zsh">
      <div className="p-5 font-mono text-[12.5px] leading-relaxed">
        <div>
          <span className="text-neutral-500">$</span> cavalry install tessl:stripe/stripe
        </div>
        <div className="pl-3 text-neutral-500">resolving via allowlist · acme-platform</div>
        <div className="pl-3 text-[oklch(0.68_0.22_22)]">
          ✗ blocked by policy &quot;require_approval · security&quot;
        </div>
        <div className="pl-3 text-neutral-500">
          approval_id: ap_9fd4a · sent to #skill-governance
        </div>
        <div className="mt-3">
          <span className="text-neutral-500">$</span> cavalry install
          acme-platform/kafka-wrapper
        </div>
        <div className="pl-3 text-neutral-500">
          fetching acme-platform/kafka-wrapper@1.2.0 → ./.cavalry/skills/…
        </div>
        <div className="pl-3 text-[oklch(0.73_0.14_152)]">
          ✓ Installed acme-platform/kafka-wrapper@1.2.0 (23.4 KB)
        </div>
        <div className="mt-3">
          <span className="text-neutral-500">$</span> cavalry publish ./my-skill
        </div>
        <div className="pl-3 text-neutral-500">packing ./my-skill · 0.5 KB</div>
        <div className="pl-3 text-[oklch(0.73_0.14_152)]">
          ✓ Published acme/my-skill@1.0.0 · c2b6e469…
        </div>
        <div className="mt-3">
          <span className="text-neutral-500">$</span>{' '}
          <span className="cav-caret">&nbsp;</span>
        </div>
      </div>
    </MockupChrome>
  );
}

// ─── Gateway flow diagram ──────────────────────────────────────────────

export function GatewayFlowMockup() {
  const clients = [
    { name: 'Claude Code', abbr: 'CC' },
    { name: 'Cursor', abbr: 'Cu' },
    { name: 'Codex', abbr: 'Co' },
    { name: 'cavalry CLI', abbr: '$' },
  ];
  const sources = [
    { name: 'Tessl', tone: 'bg-neutral-800' },
    { name: 'GitHub', tone: 'bg-neutral-800' },
    { name: 'HTTP', tone: 'bg-neutral-800' },
    { name: 'Internal', tone: 'bg-[oklch(0.66_0.21_265)]/30 border border-[oklch(0.66_0.21_265)]/60' },
  ];

  return (
    <MockupChrome title="flow · gateway.proxy" subtitle="policy · cache · audit">
      <div className="grid grid-cols-1 items-stretch gap-5 p-4 text-[12.5px] sm:p-5 md:grid-cols-5 md:gap-0">
        {/* clients */}
        <div className="md:col-span-1">
          <div className="cav-label text-neutral-500">clients</div>
          <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-1">
            {clients.map((c) => (
              <div
                key={c.name}
                className="flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1.5"
              >
                <span className="flex size-5 shrink-0 items-center justify-center rounded bg-neutral-800 font-mono text-[10px]">
                  {c.abbr}
                </span>
                <span className="truncate text-[12px]">{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* mobile arrow · clients → gateway */}
        <div className="flex justify-center text-neutral-600 md:hidden">
          <svg viewBox="0 0 14 36" className="h-9 w-[14px]">
            <line
              x1={7}
              y1={0}
              x2={7}
              y2={28}
              strokeDasharray="3 3"
              stroke="currentColor"
              strokeWidth={1.5}
            />
            <path d="M3 28 L7 36 L11 28 Z" fill="currentColor" />
          </svg>
        </div>

        {/* desktop arrows · clients → gateway */}
        <div className="hidden flex-col items-center justify-center gap-1 text-neutral-600 md:col-span-1 md:flex">
          {clients.map((_, i) => (
            <svg key={i} viewBox="0 0 60 14" className="h-[14px] w-full">
              <line
                x1={0}
                y1={7}
                x2={54}
                y2={7}
                strokeDasharray="3 3"
                stroke="currentColor"
                strokeWidth={1.5}
              />
              <path d="M54 3 L60 7 L54 11 Z" fill="currentColor" />
            </svg>
          ))}
        </div>

        {/* gateway */}
        <div className="flex flex-col justify-center md:col-span-1">
          <div className="rounded-xl border border-[oklch(0.66_0.21_265)] bg-[oklch(0.66_0.21_265)]/10 p-4 text-center shadow-[0_0_40px_oklch(0.66_0.21_265_/_0.25)]">
            <div className="cav-label text-[oklch(0.66_0.21_265)]">Cavalry</div>
            <div className="mt-1 text-[15px] font-medium">Gateway</div>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-left text-[11px] text-neutral-400 md:grid-cols-1 md:gap-1">
              <li className="flex items-center gap-1.5">
                <Check className="size-3 shrink-0 text-[oklch(0.73_0.14_152)]" /> authn · tokens
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="size-3 shrink-0 text-[oklch(0.73_0.14_152)]" /> policy eval
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="size-3 shrink-0 text-[oklch(0.73_0.14_152)]" /> cache
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="size-3 shrink-0 text-[oklch(0.73_0.14_152)]" /> audit emit
              </li>
            </ul>
          </div>
        </div>

        {/* desktop arrows · gateway → sources */}
        <div className="hidden flex-col items-center justify-center gap-1 text-neutral-600 md:col-span-1 md:flex">
          {sources.map((_, i) => (
            <svg key={i} viewBox="0 0 60 14" className="h-[14px] w-full">
              <line
                x1={6}
                y1={7}
                x2={60}
                y2={7}
                strokeDasharray="3 3"
                stroke="currentColor"
                strokeWidth={1.5}
              />
              <path d="M60 3 L66 7 L60 11 Z" fill="currentColor" />
            </svg>
          ))}
        </div>

        {/* mobile arrow · gateway → sources */}
        <div className="flex justify-center text-neutral-600 md:hidden">
          <svg viewBox="0 0 14 36" className="h-9 w-[14px]">
            <line
              x1={7}
              y1={0}
              x2={7}
              y2={28}
              strokeDasharray="3 3"
              stroke="currentColor"
              strokeWidth={1.5}
            />
            <path d="M3 28 L7 36 L11 28 Z" fill="currentColor" />
          </svg>
        </div>

        {/* sources */}
        <div className="md:col-span-1">
          <div className="cav-label text-neutral-500 md:text-right">registries</div>
          <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-1">
            {sources.map((s) => (
              <div
                key={s.name}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px]',
                  s.tone,
                )}
              >
                <span className="size-1.5 shrink-0 rounded-full bg-[oklch(0.66_0.21_265)]" />
                <span className="truncate">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MockupChrome>
  );
}

// ─── Approvals inbox ────────────────────────────────────────────────────

export function ApprovalsMockup() {
  const items = [
    {
      who: 'alice@acme.com',
      skill: 'tessl:stripe/stripe@^12.0.0',
      reason: 'Policy: require_approval',
      pending: true,
    },
    {
      who: 'bob@acme.com',
      skill: 'github:acme/perf-rules@1.3.0',
      reason: 'Policy: require_approval',
      pending: true,
    },
    {
      who: 'charlie@acme.com',
      skill: 'tessl:openai/openai@^4.0.0',
      reason: 'Approved by sec@acme.com',
      pending: false,
    },
  ];
  return (
    <MockupChrome title="approvals.inbox" subtitle="2 pending">
      <ul className="divide-y divide-neutral-800">
        {items.map((i, idx) => (
          <li key={idx} className="flex items-start gap-4 p-4 text-[13px]">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-800 font-mono text-[11px]">
              {i.who[0]?.toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="truncate font-medium">{i.who}</span>
                <span className="text-[12px] text-neutral-500">wants to install</span>
              </div>
              <div className="mt-1 font-mono text-[12px] text-neutral-300">
                {i.skill}
              </div>
              <div className="mt-1 text-[11px] text-neutral-500">{i.reason}</div>
            </div>
            {i.pending ? (
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  className="rounded-md bg-[oklch(0.73_0.14_152)] px-2.5 py-1 text-[11px] font-medium text-black"
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-[11px] font-medium"
                >
                  Deny
                </button>
              </div>
            ) : (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[oklch(0.73_0.14_152)]/20 px-2 py-0.5 text-[11px] text-[oklch(0.73_0.14_152)]">
                <Check className="size-3" /> approved
              </span>
            )}
          </li>
        ))}
      </ul>
    </MockupChrome>
  );
}

// ─── Helpers used in cards ─────────────────────────────────────────────

export const primitiveIcons = {
  skill: Boxes,
  registry: ScrollText,
  policy: ShieldCheck,
  token: KeyRound,
  terminal: Terminal,
};
