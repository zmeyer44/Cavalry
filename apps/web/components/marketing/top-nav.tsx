'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { Logo } from '@/assets/logo';
import { cn } from '@/lib/utils';

const DOCS_URL = process.env.NEXT_PUBLIC_CAVALRY_DOCS_URL as string;

const navItems = [
  { href: DOCS_URL, label: 'Docs', external: true },
  { href: '#features', label: 'Features' },
  { href: '#self-host', label: 'Self-host' },
  { href: '#roadmap', label: 'Roadmap' },
  { href: '/contact', label: 'Contact' },
];

export function TopNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const closeMenu = () => {
    document.body.style.overflow = '';
    setOpen(false);
  };

  return (
    <>
      <div
        className={cn(
          'sticky top-0 z-50 transition-colors duration-200',
          scrolled || open ? 'bg-white/85 backdrop-blur-md' : 'bg-white',
        )}
      >
        <div className="mx-auto w-full max-w-[1280px] px-4 md:px-10">
          <header className="flex h-16 items-center justify-between gap-4">
            <Link
              href="/"
              aria-label="Cavalry home"
              onClick={open ? closeMenu : undefined}
              className="relative z-10 flex items-center gap-2 text-stone-950 transition-colors hover:text-primary"
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
                      {...(n.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
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

            <button
              type="button"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen((o) => !o)}
              className="group/burger relative z-10 -mr-2 flex size-10 shrink-0 items-center justify-center lg:hidden"
            >
              <span
                aria-hidden
                className="relative block h-[14px] w-[22px]"
              >
                <span
                  className={cn(
                    'absolute left-0 block h-[1.5px] w-full rounded-full bg-stone-950 transition-transform duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
                    open ? 'top-1/2 -translate-y-1/2 rotate-45' : 'top-0',
                  )}
                />
                <span
                  className={cn(
                    'absolute left-0 block h-[1.5px] w-full rounded-full bg-stone-950 transition-transform duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
                    open ? 'top-1/2 -translate-y-1/2 -rotate-45' : 'bottom-0',
                  )}
                />
              </span>
            </button>
          </header>
        </div>
        <div
          aria-hidden
          className={cn(
            'pointer-events-none h-px transition-colors duration-200',
            scrolled || open ? 'bg-stone-200' : 'bg-transparent',
          )}
        />
      </div>

      <div
        id="mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-label="Mobile navigation"
        className={cn(
          'fixed inset-x-0 bottom-0 top-16 z-40 lg:hidden',
          'transition-[opacity,transform,visibility] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
          open
            ? 'visible translate-y-0 opacity-100'
            : 'invisible -translate-y-3 opacity-0',
        )}
      >
        <div aria-hidden className="absolute inset-0 bg-white" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(80% 60% at 90% 0%, oklch(0.94 0.05 260 / 0.4) 0%, transparent 60%), radial-gradient(70% 80% at 0% 100%, oklch(0.96 0.02 85 / 0.75) 0%, transparent 55%)',
          }}
        />

        <div className="relative flex h-full flex-col overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-6 pb-10 pt-7">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-stone-500">
                Menu
              </span>
              <span aria-hidden className="h-px flex-1 bg-stone-200" />
            </div>

            <ul className="mt-3">
              {navItems.map((n, idx) => (
                <li
                  key={n.href}
                  style={{ transitionDelay: open ? `${90 + idx * 55}ms` : '0ms' }}
                  className={cn(
                    'border-b border-stone-200/80 transition-[opacity,transform] duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
                    open ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
                  )}
                >
                  <Link
                    href={n.href}
                    {...(n.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    onClick={closeMenu}
                    className="group/nav relative flex items-center justify-between py-5"
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -left-6 top-1/2 block h-[54%] w-[3px] origin-top -translate-y-1/2 scale-y-0 bg-primary transition-transform duration-300 ease-out group-hover/nav:scale-y-100 group-focus-visible/nav:scale-y-100"
                    />
                    <span className="font-display text-[32px] font-semibold tracking-[-0.03em] text-stone-950 transition-colors group-hover/nav:text-primary">
                      {n.label}
                    </span>
                    {n.external ? (
                      <ArrowUpRight
                        aria-hidden
                        className="size-5 shrink-0 text-stone-400 transition-[transform,color] duration-300 group-hover/nav:-translate-y-0.5 group-hover/nav:translate-x-0.5 group-hover/nav:text-primary"
                      />
                    ) : (
                      <ChevronRight
                        aria-hidden
                        className="size-5 shrink-0 text-stone-400 transition-[transform,color] duration-300 group-hover/nav:translate-x-1 group-hover/nav:text-primary"
                      />
                    )}
                  </Link>
                </li>
              ))}
            </ul>

            <div
              style={{
                transitionDelay: open ? `${90 + navItems.length * 55}ms` : '0ms',
              }}
              className={cn(
                'mt-10 transition-[opacity,transform] duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
                open ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
              )}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-stone-500">
                  Account
                </span>
                <span aria-hidden className="h-px flex-1 bg-stone-200" />
              </div>
              <div className="mt-5 flex flex-col gap-3">
                <Link
                  href="/signup"
                  onClick={closeMenu}
                  className="relative inline-flex h-12 items-center justify-center rounded-3xl bg-primary px-5 font-display text-[16px] font-semibold text-white transition-all duration-200 hover:rounded-none hover:bg-black"
                >
                  Start self-hosting
                </Link>
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="inline-flex h-12 items-center justify-center rounded-3xl border border-stone-300 bg-transparent px-5 font-display text-[16px] font-medium text-stone-800 transition-all duration-200 hover:rounded-none hover:border-stone-900 hover:text-stone-950"
                >
                  Sign in
                </Link>
              </div>
            </div>

            <div
              style={{
                transitionDelay: open ? `${140 + navItems.length * 55}ms` : '0ms',
              }}
              className={cn(
                'mt-auto pt-12 transition-[opacity] duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
                open ? 'opacity-100' : 'opacity-0',
              )}
            >
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500">
                <span>cavalry.sh</span>
                <span>Apache 2.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
