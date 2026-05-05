'use client';

import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Static UI mockups used in marketing feature sections. These approximate
 * real Harbor Intelligence operational surfaces — not interactive, always
 * dark-themed so they read as "product shots" on light marketing backgrounds.
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

// ─── Workflow runs (vendor invoice automation) ─────────────────────────

export function WorkflowRunsMockup() {
  const runs = [
    { vendor: 'Acme Corp', ref: 'INV-4827', amount: '$4,290', status: 'posted' as const, time: '0.4s' },
    { vendor: 'Bayside Logistics', ref: 'INV-1109', amount: '$890', status: 'posted' as const, time: '0.3s' },
    { vendor: 'Ridge Mfg', ref: 'INV-9201', amount: '—', status: 'review' as const, time: '1.2s' },
    { vendor: 'Quanto AG', ref: 'INV-8821', amount: '$12,400', status: 'posted' as const, time: '0.5s' },
    { vendor: 'Northbridge', ref: 'INV-2330', amount: '$2,180', status: 'posted' as const, time: '0.4s' },
    { vendor: 'Lyra Studio', ref: 'INV-7716', amount: '$640', status: 'posted' as const, time: '0.3s' },
  ];
  const kpis = [
    { l: 'Runs today', v: '142' },
    { l: 'Hours saved', v: '38.4' },
    { l: 'Auto-resolved', v: '94%' },
  ];
  return (
    <MockupChrome title="workflow.runs · vendor invoices" subtitle="last 60 minutes">
      <div className="grid grid-cols-3 border-b border-neutral-800">
        {kpis.map((m, i) => (
          <div
            key={m.l}
            className={cn('p-4', i > 0 && 'border-l border-neutral-800')}
          >
            <div className="harbor-label text-neutral-500">{m.l}</div>
            <div className="mt-1 text-[20px] font-medium tabular text-white">{m.v}</div>
          </div>
        ))}
      </div>
      <ul className="divide-y divide-neutral-800 font-mono text-[12.5px]">
        {runs.map((r, i) => (
          <li
            key={i}
            className="grid grid-cols-12 items-center gap-3 px-4 py-2.5"
          >
            <div className="col-span-1 flex items-center">
              {r.status === 'posted' ? (
                <Check className="size-3.5 text-[oklch(0.73_0.14_152)]" />
              ) : (
                <span
                  aria-hidden
                  className="size-2 rounded-full bg-[oklch(0.78_0.16_75)] shadow-[0_0_0_3px_oklch(0.78_0.16_75_/_0.18)]"
                />
              )}
            </div>
            <div className="col-span-4 truncate text-neutral-300">{r.vendor}</div>
            <div className="col-span-3 truncate text-neutral-500">{r.ref}</div>
            <div className="col-span-2 truncate text-right tabular text-neutral-300">{r.amount}</div>
            <div className="col-span-2 truncate text-right tabular text-neutral-500">{r.time}</div>
          </li>
        ))}
      </ul>
      <div className="border-t border-neutral-800 px-4 py-2 text-center font-mono text-[11px] text-neutral-500">
        → posted to NetSuite · 5 of 6 fully automated
      </div>
    </MockupChrome>
  );
}

// ─── Outcomes dashboard ─────────────────────────────────────────────────

export function OutcomesDashboardMockup() {
  const flows = [
    { name: 'Invoice intake', hours: 142, pct: 0.92 },
    { name: 'Support triage', hours: 88, pct: 0.71 },
    { name: 'Lead enrichment', hours: 41, pct: 0.45 },
    { name: 'Contract review', hours: 36, pct: 0.39 },
    { name: 'Reconciliations', hours: 28, pct: 0.30 },
  ];
  const kpis = [
    { l: 'Hours saved', v: '487', d: '+12% vs prev', tone: 'up' as const },
    { l: 'Items processed', v: '3,214', d: 'across 5 flows', tone: 'neutral' as const },
    { l: 'AI accuracy', v: '98.2%', d: 'vs 96.4% human', tone: 'up' as const },
  ];
  return (
    <MockupChrome title="outcomes.dashboard" subtitle="last 30 days · acme">
      <div className="space-y-5 p-5">
        <div className="grid grid-cols-3 gap-3">
          {kpis.map((k) => (
            <div
              key={k.l}
              className="rounded-md border border-neutral-800 bg-[oklch(0.128_0.011_235)] p-3"
            >
              <div className="harbor-label text-neutral-500">{k.l}</div>
              <div className="mt-1.5 text-[22px] font-semibold tabular text-white">
                {k.v}
              </div>
              <div
                className={cn(
                  'mt-0.5 text-[11px]',
                  k.tone === 'up' ? 'text-[oklch(0.73_0.14_152)]' : 'text-neutral-500',
                )}
              >
                {k.d}
              </div>
            </div>
          ))}
        </div>
        <div>
          <div className="harbor-label mb-3 text-neutral-500">
            Per workflow · hours saved
          </div>
          <div className="space-y-2.5">
            {flows.map((f) => (
              <div key={f.name} className="flex items-center gap-3 text-[12.5px]">
                <span className="w-32 shrink-0 truncate text-neutral-300">{f.name}</span>
                <div className="relative h-2 flex-1 overflow-hidden rounded-sm bg-neutral-800">
                  <div
                    className="absolute inset-y-0 left-0 rounded-sm bg-[oklch(0.66_0.21_265)]"
                    style={{ width: `${f.pct * 100}%` }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right font-mono text-[12px] tabular text-neutral-300">
                  {f.hours}h
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MockupChrome>
  );
}

// ─── Intelligence query (Q&A over internal data) ───────────────────────

export function IntelligenceQueryMockup() {
  const reasons = [
    { rank: '01', label: 'Pricing concerns', pct: '38%', detail: 'surveys + sales calls' },
    { rank: '02', label: 'Missing integrations', pct: '24%', detail: '12 tickets, 9 calls' },
    { rank: '03', label: 'Support response time', pct: '19%', detail: 'NPS comments' },
  ];
  const sources = ['surveys.csv', 'gong/Q3-calls', 'zendesk', 'salesforce.nps'];
  return (
    <MockupChrome title="ask.harbor · ops space" subtitle="acme">
      <div className="space-y-4 p-5 text-[13px]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-neutral-800 font-mono text-[10px] text-neutral-300">
            JM
          </span>
          <div className="flex-1 leading-relaxed text-neutral-300">
            What were our top 3 churn reasons in Q3?
          </div>
        </div>
        <div className="ml-9 space-y-3">
          <div className="leading-relaxed text-neutral-400">
            Synthesised from{' '}
            <span className="text-white">218 exit surveys</span>,{' '}
            <span className="text-white">47 cancellation calls</span>, and{' '}
            <span className="text-white">NPS data from 1,402 accounts</span>:
          </div>
          <ol className="space-y-2">
            {reasons.map((r) => (
              <li
                key={r.rank}
                className="flex items-center justify-between rounded-md border border-neutral-800 bg-[oklch(0.128_0.011_235)] px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] tabular text-neutral-500">
                    {r.rank}
                  </span>
                  <span className="text-white">{r.label}</span>
                </div>
                <div className="flex items-center gap-3 text-[12px]">
                  <span className="hidden text-neutral-500 md:inline">{r.detail}</span>
                  <span className="rounded bg-[oklch(0.66_0.21_265)]/15 px-2 py-0.5 font-mono text-[11px] tabular text-[oklch(0.78_0.10_260)]">
                    {r.pct}
                  </span>
                </div>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-1.5 pt-1 font-mono text-[11px] text-neutral-500">
            <span>sources:</span>
            {sources.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 rounded border border-neutral-800 bg-neutral-900 px-1.5 py-0.5 text-neutral-300"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </MockupChrome>
  );
}

// ─── Copilot in Slack ───────────────────────────────────────────────────

export function CopilotInSlackMockup() {
  const lineItems = [
    { label: 'Annual platform license', value: '$96,000' },
    { label: 'Onboarding · 6 weeks', value: '$28,000' },
    { label: 'Support · 12 months', value: '$24,000' },
  ];
  const actions = [
    { label: 'Open in Docs', primary: true },
    { label: 'Send to Acme', primary: false },
    { label: 'Edit', primary: false },
  ];
  return (
    <MockupChrome title="#sales-team · slack" subtitle="acme.com">
      <div className="space-y-4 p-5 text-[13px]">
        <div className="flex items-start gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded bg-[oklch(0.55_0.18_55)] font-mono text-[11px] font-medium text-white">
            SM
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-white">Sarah Mendez</span>
              <span className="text-[11px] text-neutral-500">10:42 AM</span>
            </div>
            <p className="mt-1 text-neutral-300">
              Just got off the call with Acme Corp — they&apos;re sold on the platform tier. Can you draft a proposal?
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded bg-[oklch(0.45_0.16_260)] font-mono text-[14px] font-semibold text-white">
            ⌁
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-semibold text-white">Harbor copilot</span>
              <span className="rounded bg-[oklch(0.66_0.21_265)]/20 px-1.5 py-px text-[10px] font-medium text-[oklch(0.78_0.10_260)]">
                APP
              </span>
              <span className="text-[11px] text-neutral-500">10:42 AM</span>
            </div>
            <p className="mt-1 text-neutral-300">
              Drafted from your call notes plus Acme&apos;s CRM history (4 prior touches, mid-market segment).
            </p>
            <div className="mt-3 overflow-hidden rounded-md border border-neutral-800 bg-[oklch(0.128_0.011_235)]">
              <div className="border-b border-neutral-800 px-3 py-2">
                <div className="harbor-label text-neutral-500">Proposal draft</div>
                <div className="mt-0.5 font-medium text-white">
                  Acme Corp · Platform license
                </div>
              </div>
              <div className="space-y-1.5 px-3 py-2.5 font-mono text-[11.5px] text-neutral-400">
                {lineItems.map((it) => (
                  <div key={it.label} className="flex justify-between">
                    <span>{it.label}</span>
                    <span className="tabular text-neutral-300">{it.value}</span>
                  </div>
                ))}
                <div className="mt-1.5 flex justify-between border-t border-neutral-800 pt-1.5 text-white">
                  <span>Total</span>
                  <span className="tabular">$148,000</span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {actions.map((b) => (
                <button
                  type="button"
                  key={b.label}
                  className={cn(
                    'rounded border px-2.5 py-1 text-[11.5px] font-medium',
                    b.primary
                      ? 'border-[oklch(0.66_0.21_265)]/40 bg-[oklch(0.66_0.21_265)]/15 text-[oklch(0.78_0.10_260)]'
                      : 'border-neutral-700 bg-neutral-900 text-neutral-300',
                  )}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MockupChrome>
  );
}

// ─── Gateway flow diagram ──────────────────────────────────────────────

const GW_CLIENTS = [
  { id: 'email', abbr: '@', name: 'Customer email' },
  { id: 'ticket', abbr: '#', name: 'Support ticket' },
  { id: 'invoice', abbr: '$', name: 'Vendor invoice' },
  { id: 'lead', abbr: '+', name: 'Inbound lead' },
] as const;
type GwClientId = (typeof GW_CLIENTS)[number]['id'];

const GW_REGS = [
  { id: 'helpdesk', name: 'Helpdesk' },
  { id: 'crm', name: 'CRM' },
  { id: 'slack', name: 'Slack' },
  { id: 'erp', name: 'Finance · ERP' },
] as const;
type GwRegId = (typeof GW_REGS)[number]['id'];

type GwStep = 'ingest' | 'analyze' | 'draft' | 'route';
type StepState = 'idle' | 'lit' | 'blocked';
type Scenario = { client: GwClientId; reg: GwRegId; kind: 'ok' | 'block' | 'cache' };

const GW_SCENARIOS: Scenario[] = [
  { client: 'email', reg: 'helpdesk', kind: 'ok' },
  { client: 'ticket', reg: 'crm', kind: 'ok' },
  { client: 'invoice', reg: 'erp', kind: 'ok' },
  { client: 'lead', reg: 'crm', kind: 'ok' },
  { client: 'email', reg: 'slack', kind: 'cache' },
  { client: 'ticket', reg: 'slack', kind: 'block' },
  { client: 'invoice', reg: 'erp', kind: 'ok' },
  { client: 'lead', reg: 'slack', kind: 'block' },
  { client: 'email', reg: 'crm', kind: 'ok' },
  { client: 'ticket', reg: 'helpdesk', kind: 'cache' },
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
  return {
    email: 'Customer email',
    ticket: 'Support ticket',
    invoice: 'Vendor invoice',
    lead: 'Inbound lead',
  }[id];
}
function gwRegName(id: GwRegId) {
  return { helpdesk: 'Helpdesk', crm: 'CRM', slack: 'Slack', erp: 'ERP' }[id];
}

export function GatewayFlowMockup() {
  const stageRef = useRef<HTMLDivElement>(null);
  const gatewayRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<SVGSVGElement>(null);
  const packetRef = useRef<HTMLDivElement>(null);
  const clientRefs = useRef<Record<GwClientId, HTMLDivElement | null>>({
    email: null,
    ticket: null,
    invoice: null,
    lead: null,
  });
  const regRefs = useRef<Record<GwRegId, HTMLDivElement | null>>({
    helpdesk: null,
    crm: null,
    slack: null,
    erp: null,
  });

  const [activeClient, setActiveClient] = useState<GwClientId | null>(null);
  const [activeReg, setActiveReg] = useState<GwRegId | null>(null);
  const [steps, setSteps] = useState<Record<GwStep, StepState>>({
    ingest: 'idle',
    analyze: 'idle',
    draft: 'idle',
    route: 'idle',
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
      setSteps({ ingest: 'idle', analyze: 'idle', draft: 'idle', route: 'idle' });
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
          scenario.kind === 'block' ? 'flagged for review' : 'received'
        }`,
        kind: scenario.kind === 'block' ? 'blocked' : 'ok',
      });

      const startX = c.right + 18;
      const startY = c.y;
      const enterX = g.left - 12;

      setPacket('NEW', 'req');
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

      setSteps((s) => ({ ...s, ingest: 'lit' }));
      await wait(PIPE / 4);
      if (cancelled) return;

      if (scenario.kind === 'block') {
        setSteps((s) => ({ ...s, analyze: 'blocked' }));
        setPacket('REVIEW', 'blocked');
        await wait(PIPE / 3);
        if (cancelled) return;
        setSteps((s) => ({ ...s, route: 'lit' }));
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

      setSteps((s) => ({ ...s, analyze: 'lit' }));
      await wait(PIPE / 4);
      if (cancelled) return;
      setSteps((s) => ({ ...s, draft: 'lit' }));
      await wait(PIPE / 4);
      if (cancelled) return;

      if (scenario.kind === 'cache') {
        setSteps((s) => ({ ...s, route: 'lit' }));
        setPacket('KNOWN', 'req');
        setCaption({
          text: `${gwClientName(scenario.client)} ← matched playbook`,
          kind: 'ok',
        });
        await wait(PIPE / 3);
        if (cancelled) return;
        setPacket('DONE', 'response');
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

      setSteps((s) => ({ ...s, route: 'lit' }));
      await wait(PIPE / 4);
      if (cancelled) return;

      setCaption({ text: `delivering to ${gwRegName(scenario.reg)}`, kind: 'ok' });
      await moveTo(g.right + 12, g.y - 10, 180);
      await moveTo(r.left - 18, r.y, T2);
      if (cancelled) return;
      setActiveReg(scenario.reg);
      await wait(320);
      if (cancelled) return;

      setPacket('DONE', 'response');
      setCaption({
        text: `${gwClientName(scenario.client)} → ${gwRegName(scenario.reg)} · done`,
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
    <MockupChrome title="flow · ai workflow" subtitle="ingest · analyze · route">
      {/* Mobile: static stacked fallback */}
      <div className="space-y-4 p-4 md:hidden">
        <div>
          <div className="harbor-label text-neutral-500">sources</div>
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
          <div className="harbor-label text-[oklch(0.66_0.21_265)]">Harbor</div>
          <div className="mt-1 text-[15px] font-medium">AI Workflow</div>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-left text-[11px] text-neutral-400">
            <li className="flex items-center gap-1.5">
              <Check className="size-3 shrink-0 text-[oklch(0.73_0.14_152)]" /> ingest
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="size-3 shrink-0 text-[oklch(0.73_0.14_152)]" /> analyze
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="size-3 shrink-0 text-[oklch(0.73_0.14_152)]" /> draft
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="size-3 shrink-0 text-[oklch(0.73_0.14_152)]" /> route
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
          <div className="harbor-label text-neutral-500">destinations</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {GW_REGS.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 rounded-md bg-neutral-800 px-2 py-1.5 text-[12px]"
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
          <span className="harbor-label text-neutral-500">sources</span>
          <span className="harbor-label text-neutral-500">destinations</span>
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
              <div className="harbor-label text-center text-[oklch(0.78_0.10_260)]">Harbor</div>
              <div className="mt-1 mb-4 text-center text-[22px] font-semibold leading-tight tracking-tight text-white">
                AI Workflow
              </div>
              <div className="flex flex-col gap-2.5">
                {(['ingest', 'analyze', 'draft', 'route'] as const).map((step) => {
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
                      : 'border-neutral-800 bg-[oklch(0.164_0.011_230)] text-neutral-300',
                  )}
                >
                  <span
                    className={cn(
                      'size-1.5 shrink-0 rounded-full transition-all duration-300',
                      isActive
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
          NEW
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

// ─── Review queue (AI decisions awaiting human sign-off) ───────────────

export function ReviewQueueMockup() {
  const items = [
    {
      kind: 'Refund',
      who: 'Mae Whitlock',
      detail: 'Order #4827 · shipping damage',
      ai: 'Recommend full refund',
      amount: '$1,820',
      conf: 88,
      pending: true,
    },
    {
      kind: 'Contract',
      who: 'Bayside Logistics',
      detail: 'MSA renewal · 4 standard / 1 redline',
      ai: 'Redline indemnification, send back',
      amount: null,
      conf: 91,
      pending: true,
    },
    {
      kind: 'Discount',
      who: 'Quanto AG',
      detail: 'Quote · 12% above guidelines',
      ai: 'Within deal-desk threshold',
      amount: null,
      conf: 96,
      pending: false,
    },
  ];
  return (
    <MockupChrome title="review.queue" subtitle="2 awaiting decision">
      <div className="border-b border-neutral-800 bg-[oklch(0.128_0.011_235)] px-4 py-2 font-mono text-[11px] text-neutral-500">
        thresholds: amount &gt; $5,000 · confidence &lt; 95%
      </div>
      <ul className="divide-y divide-neutral-800">
        {items.map((i, idx) => (
          <li key={idx} className="space-y-2 p-4 text-[13px]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-wider text-neutral-300">
                    {i.kind}
                  </span>
                  <span className="font-medium text-white">{i.who}</span>
                  {i.amount ? (
                    <span className="font-mono tabular text-neutral-300">{i.amount}</span>
                  ) : null}
                </div>
                <div className="mt-1 text-[12px] text-neutral-500">{i.detail}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
                  <span
                    aria-hidden
                    className="inline-block size-1.5 shrink-0 rounded-full bg-[oklch(0.73_0.14_152)] shadow-[0_0_0_3px_oklch(0.73_0.14_152_/_0.18)]"
                  />
                  <span className="text-neutral-300">AI: {i.ai}</span>
                  <span className="rounded bg-[oklch(0.66_0.21_265)]/15 px-1.5 py-0.5 font-mono text-[10.5px] tabular text-[oklch(0.78_0.10_260)]">
                    {i.conf}% conf
                  </span>
                </div>
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
                    className="rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-[11px] font-medium text-neutral-300"
                  >
                    Modify
                  </button>
                </div>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[oklch(0.73_0.14_152)]/20 px-2 py-0.5 text-[11px] text-[oklch(0.73_0.14_152)]">
                  <Check className="size-3" /> auto-resolved
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </MockupChrome>
  );
}
