'use client';

import { Boxes, Check, KeyRound, ScrollText, ShieldCheck, Terminal, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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

const GW_CLIENTS = [
  { id: 'cc', abbr: 'cc', name: 'Claude Code' },
  { id: 'cu', abbr: 'cu', name: 'Cursor' },
  { id: 'co', abbr: 'co', name: 'Codex' },
  { id: 'cli', abbr: '$', name: 'cavalry CLI' },
] as const;
type GwClientId = (typeof GW_CLIENTS)[number]['id'];

const GW_REGS = [
  { id: 'tessl', name: 'Tessl' },
  { id: 'github', name: 'GitHub' },
  { id: 'http', name: 'HTTP' },
  { id: 'internal', name: 'Internal' },
] as const;
type GwRegId = (typeof GW_REGS)[number]['id'];

type GwStep = 'authn' | 'policy' | 'cache' | 'audit';
type StepState = 'idle' | 'lit' | 'blocked';
type Scenario = { client: GwClientId; reg: GwRegId; kind: 'ok' | 'block' | 'cache' };

const GW_SCENARIOS: Scenario[] = [
  { client: 'cc', reg: 'tessl', kind: 'ok' },
  { client: 'cu', reg: 'github', kind: 'ok' },
  { client: 'co', reg: 'internal', kind: 'ok' },
  { client: 'cli', reg: 'tessl', kind: 'ok' },
  { client: 'cc', reg: 'internal', kind: 'cache' },
  { client: 'cu', reg: 'http', kind: 'block' },
  { client: 'co', reg: 'tessl', kind: 'ok' },
  { client: 'cli', reg: 'github', kind: 'block' },
  { client: 'cc', reg: 'http', kind: 'ok' },
  { client: 'cu', reg: 'tessl', kind: 'cache' },
];

const PKT_VARIANTS = {
  req: {
    background: 'oklch(0.66 0.21 265)',
    boxShadow:
      'inset 0 0 0 1px oklch(1 0 0 / 0.18), 0 0 18px oklch(0.66 0.21 265 / 0.45)',
  },
  response: {
    background: 'oklch(0.52 0.14 152)',
    boxShadow:
      'inset 0 0 0 1px oklch(1 0 0 / 0.18), 0 0 18px oklch(0.55 0.14 152 / 0.45)',
  },
  blocked: {
    background: 'oklch(0.55 0.22 22)',
    boxShadow:
      'inset 0 0 0 1px oklch(1 0 0 / 0.18), 0 0 18px oklch(0.60 0.22 22 / 0.45)',
  },
} as const;

function gwClientName(id: GwClientId) {
  return { cc: 'Claude Code', cu: 'Cursor', co: 'Codex', cli: 'cavalry CLI' }[id];
}
function gwRegName(id: GwRegId) {
  return { tessl: 'Tessl', github: 'GitHub', http: 'HTTP', internal: 'Internal' }[id];
}

export function GatewayFlowMockup() {
  const stageRef = useRef<HTMLDivElement>(null);
  const gatewayRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<SVGSVGElement>(null);
  const packetRef = useRef<HTMLDivElement>(null);
  const clientRefs = useRef<Record<GwClientId, HTMLDivElement | null>>({
    cc: null,
    cu: null,
    co: null,
    cli: null,
  });
  const regRefs = useRef<Record<GwRegId, HTMLDivElement | null>>({
    tessl: null,
    github: null,
    http: null,
    internal: null,
  });

  const [activeClient, setActiveClient] = useState<GwClientId | null>(null);
  const [activeReg, setActiveReg] = useState<GwRegId | null>(null);
  const [steps, setSteps] = useState<Record<GwStep, StepState>>({
    authn: 'idle',
    policy: 'idle',
    cache: 'idle',
    audit: 'idle',
  });
  const [caption, setCaption] = useState<{ text: string; kind?: 'ok' | 'blocked' }>({
    text: 'idle',
  });

  useEffect(() => {
    const stage = stageRef.current;
    const gw = gatewayRef.current;
    const fx = fxRef.current;
    const pkt = packetRef.current;
    if (!stage || !gw || !fx || !pkt) return;

    const desktop = window.matchMedia('(min-width: 768px)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!desktop.matches || reducedMotion.matches) return;

    let cancelled = false;
    let scenarioIdx = -1;
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = setTimeout(() => {
          timers.delete(t);
          resolve();
        }, ms);
        timers.add(t);
      });

    function rectOf(el: Element) {
      const s = stage!.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return {
        x: r.left - s.left + r.width / 2,
        y: r.top - s.top + r.height / 2,
        left: r.left - s.left,
        right: r.right - s.left,
      };
    }

    function drawRail(x1: number, y1: number, x2: number, y2: number) {
      const ns = 'http://www.w3.org/2000/svg';
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', String(x1));
      line.setAttribute('y1', String(y1));
      line.setAttribute('x2', String(x2 - 7));
      line.setAttribute('y2', String(y2));
      line.setAttribute('stroke', 'oklch(1 0 0 / 0.1)');
      line.setAttribute('stroke-width', '1');
      line.setAttribute('stroke-dasharray', '3 4');
      line.setAttribute('fill', 'none');
      fx!.appendChild(line);
      const arrow = document.createElementNS(ns, 'path');
      arrow.setAttribute(
        'd',
        `M ${x2} ${y2} L ${x2 - 6} ${y2 - 3} L ${x2 - 6} ${y2 + 3} Z`,
      );
      arrow.setAttribute('fill', 'oklch(0.40 0.012 220)');
      fx!.appendChild(arrow);
    }

    function drawRails() {
      const s = stage!.getBoundingClientRect();
      fx!.setAttribute('viewBox', `0 0 ${s.width} ${s.height}`);
      fx!.setAttribute('width', String(s.width));
      fx!.setAttribute('height', String(s.height));
      fx!.innerHTML = '';
      const g = rectOf(gw!);
      for (const c of GW_CLIENTS) {
        const el = clientRefs.current[c.id];
        if (!el) continue;
        const r = rectOf(el);
        drawRail(r.right + 10, r.y, g.left - 10, r.y);
      }
      for (const rg of GW_REGS) {
        const el = regRefs.current[rg.id];
        if (!el) continue;
        const r = rectOf(el);
        drawRail(g.right + 10, r.y, r.left - 10, r.y);
      }
    }

    drawRails();
    const ro = new ResizeObserver(drawRails);
    ro.observe(stage);

    function moveTo(x: number, y: number, ms: number, ease = 'cubic-bezier(0.4,0,0.2,1)') {
      return new Promise<void>((resolve) => {
        pkt!.style.transition = `transform ${ms}ms ${ease}, opacity ${ms}ms ${ease}`;
        pkt!.style.transform = `translate(${x}px, ${y}px)`;
        const t = setTimeout(() => {
          timers.delete(t);
          resolve();
        }, ms);
        timers.add(t);
      });
    }

    function fade(to: number, ms: number) {
      return new Promise<void>((resolve) => {
        pkt!.style.transition = `opacity ${ms}ms ease`;
        pkt!.style.opacity = String(to);
        const t = setTimeout(() => {
          timers.delete(t);
          resolve();
        }, ms);
        timers.add(t);
      });
    }

    function setPacket(label: string, variant: keyof typeof PKT_VARIANTS) {
      pkt!.textContent = label;
      pkt!.style.background = PKT_VARIANTS[variant].background;
      pkt!.style.boxShadow = PKT_VARIANTS[variant].boxShadow;
    }

    function resetSteps() {
      setSteps({ authn: 'idle', policy: 'idle', cache: 'idle', audit: 'idle' });
    }

    async function runOnce() {
      scenarioIdx = (scenarioIdx + 1) % GW_SCENARIOS.length;
      const scenario = GW_SCENARIOS[scenarioIdx]!;
      const clientEl = clientRefs.current[scenario.client];
      const regEl = regRefs.current[scenario.reg];
      if (!clientEl || !regEl) return;

      const c = rectOf(clientEl);
      const r = rectOf(regEl);
      const g = rectOf(gw!);
      const T1 = 1100;
      const T2 = 1100;
      const PIPE = 900;

      resetSteps();
      setActiveClient(scenario.client);
      setCaption({
        text: `${gwClientName(scenario.client)} → ${
          scenario.kind === 'block' ? 'denied' : 'request'
        }`,
        kind: scenario.kind === 'block' ? 'blocked' : 'ok',
      });

      const startX = c.right + 18;
      const startY = c.y;
      const enterX = g.left - 12;

      setPacket('REQ', 'req');
      pkt!.style.transition = 'none';
      pkt!.style.transform = `translate(${startX}px, ${startY}px)`;
      pkt!.style.opacity = '0';
      await wait(20);
      if (cancelled) return;
      pkt!.style.transition = 'opacity 200ms';
      pkt!.style.opacity = '1';

      await moveTo(enterX, startY, T1);
      if (cancelled) return;
      setActiveClient(null);

      await moveTo(g.x, g.y - 10, 220);
      if (cancelled) return;

      setSteps((s) => ({ ...s, authn: 'lit' }));
      await wait(PIPE / 4);
      if (cancelled) return;

      if (scenario.kind === 'block') {
        setSteps((s) => ({ ...s, policy: 'blocked' }));
        setPacket('DENY', 'blocked');
        await wait(PIPE / 3);
        if (cancelled) return;
        setSteps((s) => ({ ...s, audit: 'lit' }));
        await wait(PIPE / 4);
        if (cancelled) return;

        await moveTo(enterX, startY, 220);
        await moveTo(startX, startY, T1, 'cubic-bezier(0.5,0,0.2,1)');
        await fade(0, 200);
        if (cancelled) return;
        await wait(400);
        resetSteps();
        setCaption({ text: 'idle' });
        return;
      }

      setSteps((s) => ({ ...s, policy: 'lit' }));
      await wait(PIPE / 4);
      if (cancelled) return;
      setSteps((s) => ({ ...s, cache: 'lit' }));
      await wait(PIPE / 4);
      if (cancelled) return;

      if (scenario.kind === 'cache') {
        setSteps((s) => ({ ...s, audit: 'lit' }));
        setPacket('CACHE HIT', 'req');
        setCaption({
          text: `${gwClientName(scenario.client)} ← served from cache`,
          kind: 'ok',
        });
        await wait(PIPE / 3);
        if (cancelled) return;
        setPacket('200', 'response');
        await moveTo(enterX, startY, 220);
        await moveTo(startX, startY, T1);
        if (cancelled) return;
        setActiveClient(scenario.client);
        await fade(0, 200);
        await wait(200);
        if (cancelled) return;
        setActiveClient(null);
        await wait(300);
        resetSteps();
        setCaption({ text: 'idle' });
        return;
      }

      setSteps((s) => ({ ...s, audit: 'lit' }));
      await wait(PIPE / 4);
      if (cancelled) return;

      setCaption({ text: `fetch ${gwRegName(scenario.reg)}`, kind: 'ok' });
      await moveTo(g.right + 12, g.y - 10, 180);
      await moveTo(r.left - 18, r.y, T2);
      if (cancelled) return;
      setActiveReg(scenario.reg);
      await wait(320);
      if (cancelled) return;

      setPacket('200', 'response');
      setCaption({
        text: `${gwClientName(scenario.client)} ← ${gwRegName(scenario.reg)}`,
        kind: 'ok',
      });
      await moveTo(g.right + 12, r.y, T2);
      if (cancelled) return;
      setActiveReg(null);

      await moveTo(enterX, startY, 220);
      setActiveClient(scenario.client);
      await moveTo(startX, startY, 900);
      await fade(0, 200);
      if (cancelled) return;
      await wait(200);
      setActiveClient(null);
      await wait(350);
      resetSteps();
      setCaption({ text: 'idle' });
    }

    (async () => {
      while (!cancelled) {
        await runOnce();
        if (cancelled) return;
        await wait(700);
      }
    })();

    return () => {
      cancelled = true;
      ro.disconnect();
      for (const t of timers) clearTimeout(t);
      timers.clear();
    };
  }, []);

  return (
    <MockupChrome title="flow · gateway.proxy" subtitle="policy · cache · audit">
      {/* Mobile: static stacked fallback */}
      <div className="space-y-4 p-4 md:hidden">
        <div>
          <div className="cav-label text-neutral-500">clients</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {GW_CLIENTS.map((c) => (
              <div
                key={c.id}
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
        <div className="flex justify-center text-neutral-600">
          <svg viewBox="0 0 14 36" className="h-9 w-[14px]">
            <line x1={7} y1={0} x2={7} y2={28} strokeDasharray="3 3" stroke="currentColor" strokeWidth={1.5} />
            <path d="M3 28 L7 36 L11 28 Z" fill="currentColor" />
          </svg>
        </div>
        <div className="rounded-xl border border-[oklch(0.66_0.21_265)] bg-[oklch(0.66_0.21_265)]/10 p-4 text-center shadow-[0_0_40px_oklch(0.66_0.21_265_/_0.25)]">
          <div className="cav-label text-[oklch(0.66_0.21_265)]">Cavalry</div>
          <div className="mt-1 text-[15px] font-medium">Gateway</div>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-left text-[11px] text-neutral-400">
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
        <div className="flex justify-center text-neutral-600">
          <svg viewBox="0 0 14 36" className="h-9 w-[14px]">
            <line x1={7} y1={0} x2={7} y2={28} strokeDasharray="3 3" stroke="currentColor" strokeWidth={1.5} />
            <path d="M3 28 L7 36 L11 28 Z" fill="currentColor" />
          </svg>
        </div>
        <div>
          <div className="cav-label text-neutral-500">registries</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {GW_REGS.map((s) => (
              <div
                key={s.id}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px]',
                  s.id === 'internal'
                    ? 'border border-[oklch(0.66_0.21_265)]/60 bg-[oklch(0.66_0.21_265)]/30'
                    : 'bg-neutral-800',
                )}
              >
                <span className="size-1.5 shrink-0 rounded-full bg-[oklch(0.66_0.21_265)]" />
                <span className="truncate">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop: animated flow */}
      <div
        ref={stageRef}
        className="relative hidden min-h-[440px] overflow-hidden px-8 pb-12 pt-10 md:block"
      >
        <div className="mb-5 flex items-center justify-between">
          <span className="cav-label text-neutral-500">clients</span>
          <span className="cav-label text-neutral-500">registries</span>
        </div>

        <div className="grid grid-cols-[1fr_1.2fr_1fr] items-center gap-0">
          <div className="flex flex-col gap-3">
            {GW_CLIENTS.map((c) => {
              const active = activeClient === c.id;
              return (
                <div
                  key={c.id}
                  ref={(el) => {
                    clientRefs.current[c.id] = el;
                  }}
                  className={cn(
                    'flex h-11 items-center gap-3 rounded-md border px-3.5 text-[13.5px] transition-colors duration-300',
                    active
                      ? 'border-[oklch(0.66_0.21_265)]/50 bg-[oklch(0.20_0.06_260)] text-white'
                      : 'border-neutral-800 bg-[oklch(0.164_0.011_230)] text-neutral-300',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded font-mono text-[10.5px] transition-colors duration-300',
                      active
                        ? 'bg-[oklch(0.66_0.21_265)] text-white'
                        : 'bg-neutral-800 text-neutral-300',
                    )}
                  >
                    {c.abbr}
                  </span>
                  <span className="flex-1 truncate">{c.name}</span>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center">
            <div
              ref={gatewayRef}
              className="w-[260px] rounded-xl border border-[oklch(0.66_0.21_265)]/50 bg-[oklch(0.17_0.05_260)] px-5 py-[18px] shadow-[0_0_0_4px_oklch(0.66_0.21_265_/_0.06),0_20px_40px_-20px_oklch(0.35_0.2_260_/_0.5)]"
            >
              <div className="cav-label text-center text-[oklch(0.78_0.10_260)]">Cavalry</div>
              <div className="mt-1 mb-4 text-center text-[22px] font-semibold leading-tight tracking-tight text-white">
                Gateway
              </div>
              <div className="flex flex-col gap-2.5">
                {(['authn', 'policy', 'cache', 'audit'] as const).map((step) => {
                  const state = steps[step];
                  return (
                    <div
                      key={step}
                      className={cn(
                        'flex items-center gap-2.5 text-[13px] transition-colors duration-300',
                        state === 'idle' ? 'text-neutral-500' : 'text-white',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-[13px] shrink-0 items-center justify-center rounded-[3px] border transition-all duration-300',
                          state === 'lit'
                            ? 'border-[oklch(0.58_0.14_150)] bg-[oklch(0.42_0.14_150)]'
                            : state === 'blocked'
                              ? 'border-[oklch(0.55_0.22_22)] bg-[oklch(0.38_0.20_22)]'
                              : 'border-[oklch(0.66_0.21_265)]/30 bg-[oklch(0.24_0.04_260)]',
                        )}
                      >
                        <svg viewBox="0 0 10 10" className="size-2">
                          <path
                            d="M1.5 5.5 L4 8 L8.5 2"
                            fill="none"
                            stroke={state === 'idle' ? 'oklch(0.66 0.21 265)' : '#fff'}
                            strokeOpacity={state === 'idle' ? 0.55 : 1}
                            strokeWidth={2.5}
                          />
                        </svg>
                      </span>
                      {step}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {GW_REGS.map((rg) => {
              const isActive = activeReg === rg.id;
              const isInternal = rg.id === 'internal';
              return (
                <div
                  key={rg.id}
                  ref={(el) => {
                    regRefs.current[rg.id] = el;
                  }}
                  className={cn(
                    'flex h-11 items-center gap-3 rounded-md border px-3.5 text-[13.5px] transition-colors duration-300',
                    isActive
                      ? 'border-[oklch(0.66_0.21_265)]/60 bg-[oklch(0.22_0.07_260)] text-white'
                      : isInternal
                        ? 'border-[oklch(0.66_0.21_265)]/50 bg-[oklch(0.22_0.07_260)] text-white'
                        : 'border-neutral-800 bg-[oklch(0.164_0.011_230)] text-neutral-300',
                  )}
                >
                  <span
                    className={cn(
                      'size-1.5 shrink-0 rounded-full transition-all duration-300',
                      isActive || isInternal
                        ? 'bg-[oklch(0.66_0.21_265)] shadow-[0_0_0_3px_oklch(0.66_0.21_265_/_0.18)]'
                        : 'bg-neutral-600',
                    )}
                  />
                  <span className="flex-1 truncate">{rg.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        <svg
          ref={fxRef}
          className="pointer-events-none absolute inset-0 overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        />

        <div
          ref={packetRef}
          className="pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded-[4px] px-2 py-[3px] font-mono text-[9.5px] font-medium tracking-wider text-white opacity-0"
          style={{
            transform: 'translate(-9999px, -9999px)',
            willChange: 'transform, opacity',
            background: PKT_VARIANTS.req.background,
            boxShadow: PKT_VARIANTS.req.boxShadow,
          }}
          aria-hidden
        >
          REQ
        </div>

        <div
          className={cn(
            'absolute inset-x-0 bottom-4 flex items-center justify-center gap-2.5 font-mono text-[10.5px] uppercase tracking-[0.18em] transition-colors duration-300',
            caption.kind === 'ok'
              ? 'text-neutral-300'
              : caption.kind === 'blocked'
                ? 'text-[oklch(0.80_0.12_22)]'
                : 'text-neutral-500',
          )}
        >
          <span
            className={cn(
              'size-1.5 rounded-full transition-all duration-300',
              caption.kind === 'ok'
                ? 'bg-[oklch(0.73_0.14_152)] shadow-[0_0_0_3px_oklch(0.73_0.14_152_/_0.18)]'
                : caption.kind === 'blocked'
                  ? 'bg-[oklch(0.70_0.21_22)] shadow-[0_0_0_3px_oklch(0.70_0.21_22_/_0.18)]'
                  : 'bg-neutral-700',
            )}
          />
          {caption.text}
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
