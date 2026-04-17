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
    <div
      className={cn(
        'sticky top-0 z-50 transition-colors duration-200',
        scrolled ? 'bg-white/80 backdrop-blur-md' : 'bg-white',
      )}
    >
      <div className="mx-auto w-full max-w-[1280px] px-4 md:px-10">
        <header className="flex h-16 items-center justify-between gap-4">
          <Link
            href="/"
            aria-label="Cavalry home"
            className="flex items-center gap-2 text-stone-950 transition-colors hover:text-primary"
          >
            <Logo className="size-6" />
            <span className="text-[20px] font-semibold font-display tracking-[-0.015em]">
              Cavalry
            </span>
          </Link>

          <nav aria-label="Main" className="hidden flex-1 items-center justify-end gap-1 lg:flex">
            <ul className="flex items-center gap-1">
              {navItems.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    className="inline-flex h-8 items-center rounded-full px-3.5 text-[14.5px] font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-950"
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="ml-3 flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex h-8 items-center rounded-full px-3.5 text-[14.5px] font-medium text-stone-600 transition-colors hover:text-stone-950"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="relative inline-flex h-8 min-w-8 flex-none cursor-pointer items-center justify-center gap-2 rounded-3xl bg-primary px-3 font-display text-[15px] font-semibold text-white transition-all duration-200 hover:rounded-none hover:bg-black hover:text-white"
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
          'pointer-events-none h-px transition-colors duration-200',
          scrolled ? 'bg-stone-200' : 'bg-transparent',
        )}
      />
    </div>
  );
}
