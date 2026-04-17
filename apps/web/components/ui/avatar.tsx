import * as React from 'react';
import { cn } from '@/lib/utils';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-medium tracking-tight',
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
