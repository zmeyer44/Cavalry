'use client';

import { useEffect, useRef, useState } from 'react';

type Agent = { name: string; logo: string };

const POOL: Agent[] = [
  { name: 'Claude Code', logo: '/assets/company-logos/claude-code.svg' },
  { name: 'Cursor', logo: '/assets/company-logos/cursor.svg' },
  { name: 'Codex', logo: '/assets/company-logos/codex.svg' },
  { name: 'Windsurf', logo: '/assets/company-logos/windsurf.svg' },
  { name: 'Cline', logo: '/assets/company-logos/cline.svg' },
  { name: 'Continue', logo: '/assets/company-logos/continue.png' },
  { name: 'Aider', logo: '/assets/company-logos/aider.svg' },
  { name: 'Roo Code', logo: '/assets/company-logos/roo-code.svg' },
  { name: 'Zed', logo: '/assets/company-logos/zed.svg' },
  { name: 'Bolt', logo: '/assets/company-logos/bolt.svg' },
];

// Render 8 slots. Mobile hides the last two via CSS so it reads as a
// 3x2 grid there, and as 2x4 from md up.
const VISIBLE = 8;
const VISIBLE_MOBILE = 6;
const SWAP_INTERVAL_MS = 2600;
const FIRST_SWAP_DELAY_MS = 2000;
const OUT_DURATION_MS = 380;

type Slot = {
  current: Agent;
  leavingFrom: Agent | null;
  nonce: number;
};

export function TrustBar() {
  const [slots, setSlots] = useState<Slot[]>(() =>
    POOL.slice(0, VISIBLE).map((a) => ({ current: a, leavingFrom: null, nonce: 0 })),
  );
  const queueRef = useRef<Agent[]>(POOL.slice(VISIBLE));
  const lastSlotRef = useRef<number>(-1);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const pendingTimers = new Set<ReturnType<typeof setTimeout>>();
    const mobileMql = window.matchMedia('(max-width: 767px)');

    const swap = () => {
      const bound = mobileMql.matches ? VISIBLE_MOBILE : VISIBLE;
      let slotIdx = Math.floor(Math.random() * bound);
      if (slotIdx === lastSlotRef.current && bound > 1) slotIdx = (slotIdx + 1) % bound;
      lastSlotRef.current = slotIdx;

      const incoming = queueRef.current.shift();
      if (!incoming) return;

      setSlots((prev) => {
        const target = prev[slotIdx];
        if (!target) return prev;
        // Guard: don't swap in a logo already visible in another slot.
        if (prev.some((s, i) => i !== slotIdx && s.current.name === incoming.name)) {
          queueRef.current.push(incoming);
          return prev;
        }
        queueRef.current.push(target.current);
        const next = prev.slice();
        next[slotIdx] = {
          current: incoming,
          leavingFrom: target.current,
          nonce: target.nonce + 1,
        };
        return next;
      });

      // After the outgoing animation finishes, clear leavingFrom so the
      // incoming logo mounts and plays its own fade-in with no overlap.
      const t = setTimeout(() => {
        pendingTimers.delete(t);
        setSlots((prev) => {
          const target = prev[slotIdx];
          if (!target || !target.leavingFrom) return prev;
          const next = prev.slice();
          next[slotIdx] = { ...target, leavingFrom: null };
          return next;
        });
      }, OUT_DURATION_MS);
      pendingTimers.add(t);
    };

    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      swap();
      timer = setTimeout(tick, SWAP_INTERVAL_MS);
    };
    timer = setTimeout(tick, FIRST_SWAP_DELAY_MS);

    return () => {
      clearTimeout(timer);
      for (const t of pendingTimers) clearTimeout(t);
    };
  }, []);

  return (
    <section className="bg-white pb-16 pt-6 md:pb-24 md:pt-10">
      <div className="mx-auto max-w-[1120px] px-6 md:px-10">
        <p className="mb-10 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500">
          Works with the coding agents your team already uses
        </p>
        <ul
          role="list"
          className="mx-auto grid max-w-[960px] grid-cols-2 gap-2.5 md:grid-cols-4"
        >
          {slots.map((slot, i) => (
            <li
              key={i}
              className={
                'group relative flex h-16 items-center justify-center overflow-hidden rounded-2xl border border-stone-200/70 bg-stone-50/60 px-4 transition-colors duration-200 hover:border-stone-300 hover:bg-white' +
                (i >= VISIBLE_MOBILE ? ' hidden md:flex' : '')
              }
            >
              {slot.leavingFrom ? (
                <LogoLayer
                  key={`out-${slot.nonce}`}
                  agent={slot.leavingFrom}
                  phase="out"
                  ariaHidden
                />
              ) : (
                <LogoLayer
                  key={`in-${slot.nonce}`}
                  agent={slot.current}
                  phase={slot.nonce === 0 ? 'static' : 'in'}
                />
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function LogoLayer({
  agent,
  phase,
  ariaHidden,
}: {
  agent: Agent;
  phase: 'in' | 'out' | 'static';
  ariaHidden?: boolean;
}) {
  const animationClass =
    phase === 'in' ? 'cav-slot-in' : phase === 'out' ? 'cav-slot-out' : '';
  return (
    <span className={`absolute inset-0 grid place-items-center ${animationClass}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={agent.logo}
        alt={ariaHidden ? '' : agent.name}
        aria-hidden={ariaHidden || undefined}
        title={ariaHidden ? undefined : agent.name}
        loading="lazy"
        decoding="async"
        className="h-7 w-auto max-w-[120px] object-contain opacity-70 grayscale transition duration-200 group-hover:opacity-100 group-hover:grayscale-0"
      />
    </span>
  );
}
