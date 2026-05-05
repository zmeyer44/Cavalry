import { cn } from '@/lib/utils';

export function Eyebrow({
  children,
  tone = 'muted',
  className,
}: {
  children: React.ReactNode;
  tone?: 'muted' | 'primary' | 'invert';
  className?: string;
}) {
  return (
    <p
      className={cn(
        'font-mono text-[11px] uppercase tracking-[0.18em]',
        tone === 'muted' && 'text-stone-500',
        tone === 'primary' && 'text-primary',
        tone === 'invert' && 'text-stone-400',
        className,
      )}
    >
      <span aria-hidden className="mr-2 inline-block h-[1px] w-4 translate-y-[-3px] bg-current align-middle opacity-60" />
      {children}
    </p>
  );
}

export function SectionTitle({
  lead,
  emph,
  className,
  tone = 'light',
}: {
  lead: React.ReactNode;
  emph?: React.ReactNode;
  className?: string;
  tone?: 'light' | 'dark';
}) {
  return (
    <h2
      className={cn(
        'font-display text-[38px] font-semibold leading-[1.02] tracking-[-0.035em] md:text-[56px]',
        tone === 'light' ? 'text-stone-950' : 'text-stone-50',
        className,
      )}
    >
      {lead}
      {emph ? (
        <>
          {' '}
          <span className="text-primary">{emph}</span>
        </>
      ) : null}
    </h2>
  );
}

export function SectionLead({
  children,
  tone = 'light',
  className,
}: {
  children: React.ReactNode;
  tone?: 'light' | 'dark';
  className?: string;
}) {
  return (
    <p
      className={cn(
        'mt-6 max-w-xl text-[16px] leading-[1.6] md:text-[17.5px]',
        tone === 'light' ? 'text-stone-600' : 'text-stone-400',
        className,
      )}
    >
      {children}
    </p>
  );
}
