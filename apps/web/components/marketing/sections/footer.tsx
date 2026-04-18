import Link from 'next/link';
import { Logo } from '@/assets/logo';

const DOCS_URL = process.env.NEXT_PUBLIC_CAVALRY_DOCS_URL as string;

const COLS: { title: string; items: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: 'Product',
    items: [
      { label: 'Features', href: '#features' },
      { label: 'Self-host', href: '#self-host' },
      { label: 'Quickstart', href: `${DOCS_URL}/quickstart`, external: true },
      { label: 'Policies', href: `${DOCS_URL}/policies`, external: true },
    ],
  },
  {
    title: 'Resources',
    items: [
      { label: 'Docs', href: DOCS_URL, external: true },
      { label: 'CLI', href: `${DOCS_URL}/cli`, external: true },
      { label: 'Architecture', href: `${DOCS_URL}/architecture`, external: true },
      { label: 'MCP', href: `${DOCS_URL}/mcp`, external: true },
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
                Cavalry
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-[14px] leading-relaxed text-stone-600">
              Governance, observability, and control for AI agent context at enterprise scale.
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
          <span>© 2026 Cavalry · Apache 2.0</span>
          <span>cavalry.sh</span>
        </div>
      </div>
    </footer>
  );
}
