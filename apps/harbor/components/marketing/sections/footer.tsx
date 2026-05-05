import Link from 'next/link';
import { Logo } from '@/assets/logo';

const COLS: { title: string; items: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: 'Services',
    items: [
      { label: 'Workflow automation', href: '#features' },
      { label: 'AI assistants', href: '#features' },
      { label: 'Business intelligence', href: '#features' },
      { label: 'AI roadmaps', href: '#how-it-works' },
    ],
  },
  {
    title: 'Approach',
    items: [
      { label: 'How we work', href: '#how-it-works' },
      { label: 'Engagement model', href: '#engagement' },
      { label: 'Who we serve', href: '#features' },
      { label: 'Why Harbor', href: '#features' },
    ],
  },
  {
    title: 'Company',
    items: [
      { label: 'Contact', href: '/contact' },
      { label: 'Security', href: '/security' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/license' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-white">
      <div className="mx-auto max-w-[1280px] px-6 md:px-10">
        <div className="h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent" />
        <div className="grid grid-cols-2 gap-10 py-16 md:grid-cols-5 md:py-24">
          <div className="col-span-2 pr-6">
            <Link href="/" className="flex items-center gap-2 text-primary">
              <Logo className="size-7" />
              <span className="text-[22px] font-semibold tracking-[-0.015em] text-stone-950">
                Harbor Intelligence
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-[14px] leading-relaxed text-stone-600">
              AI implementation partner for mid-market companies. Practical automation,
              integrated into the systems your team already uses.
            </p>
          </div>
          {COLS.map((c) => (
            <div key={c.title}>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500">
                {c.title}
              </p>
              <ul className="mt-5 space-y-3 text-[14px]">
                {c.items.map((i) => (
                  <li key={i.label}>
                    <Link
                      href={i.href}
                      {...(i.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      className="text-stone-800 transition-colors hover:text-primary"
                    >
                      {i.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="h-px bg-stone-100" />
        <div className="flex flex-col justify-between gap-3 py-6 font-mono text-[11px] uppercase tracking-[0.14em] text-stone-500 md:flex-row">
          <span>© 2026 Harbor Intelligence, Inc.</span>
          <span>harborintelligence.com</span>
        </div>
      </div>
    </footer>
  );
}
