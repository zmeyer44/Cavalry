'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/assets/logo';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/docs', label: 'Docs' },
  { href: '#features', label: 'Features' },
  { href: '#self-host', label: 'Self-host' },
  { href: '#roadmap', label: 'Roadmap' },
  { href: '/contact', label: 'Contact' },
];

export function TopNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="sticky top-0 z-50 bg-white px-4 md:px-8">
      <div className="mx-auto w-full max-w-[1280px]">
        <header className="flex h-14 items-center justify-between gap-4">
          <Link
            href="/"
            aria-label="Cavalry home"
            className="flex items-center gap-2 text-neutral-950 transition-colors hover:text-primary"
          >
            <Logo className="size-6" />
            <span className="text-[20px] font-semibold tracking-[-0.01em]">Cavalry</span>
          </Link>

          <nav aria-label="Main" className="hidden flex-1 items-center justify-end gap-1 lg:flex">
            <ul className="flex items-center gap-1">
              {navItems.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    className="inline-flex h-8 items-center rounded-sm px-3 text-[15px] font-medium text-neutral-700 transition-opacity hover:opacity-60"
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="ml-2 flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex h-8 items-center rounded-sm px-3 text-[15px] font-medium text-neutral-700 transition-opacity hover:opacity-60"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-8 items-center rounded-3xl bg-primary px-4 text-[15px] font-semibold text-white transition-all duration-200 hover:rounded-none hover:bg-neutral-950"
              >
                Sign up
              </Link>
            </div>
          </nav>
        </header>
      </div>
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 h-px transition-colors duration-200',
          scrolled ? 'bg-neutral-200' : 'bg-transparent',
        )}
      />
    </div>
  );
}
