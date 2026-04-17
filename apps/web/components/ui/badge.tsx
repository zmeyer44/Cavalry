import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-muted text-foreground border-transparent',
        outline: 'border-border text-foreground',
        success:
          'bg-green-100 text-green-900 border-transparent dark:bg-green-900/40 dark:text-green-200',
        warning:
          'bg-yellow-100 text-yellow-900 border-transparent dark:bg-yellow-900/40 dark:text-yellow-100',
        destructive:
          'bg-red-100 text-red-900 border-transparent dark:bg-red-900/40 dark:text-red-100',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
