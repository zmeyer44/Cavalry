import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CtaButtonVariant =
  | 'primary-light'
  | 'secondary-light'
  | 'primary-dark'
  | 'secondary-dark';

type CtaButtonProps = {
  href: string;
  children: React.ReactNode;
  variant?: CtaButtonVariant;
  size?: 'sm' | 'md';
  icon?: LucideIcon | null;
  className?: string;
  external?: boolean;
};

const SIZE_CLASSES: Record<'sm' | 'md', string> = {
  sm: 'gap-2 px-3 py-2 text-[11px] leading-[18px] md:px-4 md:text-[12px]',
  md: 'gap-3 px-4 py-3 text-[13px] leading-[1.125rem]',
};

const VARIANT_CLASSES: Record<
  CtaButtonVariant,
  { base: string; slide: string }
> = {
  'primary-light': {
    base: 'bg-neutral-950 text-white outline-neutral-950 hover:text-neutral-950 hover:outline-primary',
    slide: 'bg-primary',
  },
  'secondary-light': {
    base: 'bg-white text-neutral-950 outline-neutral-300 hover:outline-neutral-950',
    slide: 'bg-neutral-100',
  },
  'primary-dark': {
    base: 'bg-white text-neutral-950 outline-white hover:text-white hover:outline-primary',
    slide: 'bg-primary',
  },
  'secondary-dark': {
    base: 'bg-neutral-900 text-white outline-neutral-700 hover:outline-white',
    slide: 'bg-neutral-800',
  },
};

export function CtaButton({
  href,
  children,
  variant = 'primary-light',
  size = 'md',
  icon: Icon = ChevronRight,
  className,
  external,
}: CtaButtonProps) {
  const v = VARIANT_CLASSES[variant];
  const linkProps = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};

  return (
    <Link
      href={href}
      {...linkProps}
      className={cn(
        'group/btn relative block cursor-pointer overflow-hidden outline outline-1 transition-[outline,color] duration-200',
        v.base,
        className,
      )}
    >
      <span
        className={cn(
          'relative flex items-center font-mono uppercase tracking-[0.02em]',
          SIZE_CLASSES[size],
        )}
      >
        <span
          aria-hidden
          className={cn(
            'absolute inset-0 block translate-y-[-100%] transition-transform duration-200 ease-out group-hover/btn:translate-y-0',
            v.slide,
          )}
        />
        <span className="relative z-10">{children}</span>
        {Icon ? (
          <Icon
            aria-hidden
            className={cn(
              'relative z-10 stroke-[2.5]',
              size === 'sm' ? 'size-3' : 'size-3.5',
            )}
          />
        ) : null}
      </span>
    </Link>
  );
}
