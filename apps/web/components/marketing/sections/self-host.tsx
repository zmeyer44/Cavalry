import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { CtaButton } from '@/components/marketing/cta-button';
import { Eyebrow, SectionLead, SectionTitle } from './_shared';
import { cn } from '@/lib/utils';

const META = [
  { label: 'License', value: 'Apache 2.0' },
  { label: 'Footprint', value: 'Postgres + S3' },
  { label: 'Deploy', value: 'docker-compose · Helm' },
];

const CODE = `# 1. Bring up Postgres + MinIO
docker compose up -d

# 2. Apply migrations
pnpm db:migrate

# 3. Launch web + gateway
pnpm dev

# 4. Mint a token, point your CLI at it
cavalry login --url http://localhost:3001 --token cav_…

# 5. Publish an internal skill
cavalry publish ./path/to/your/skill`;

export function SelfHost() {
  return (
    <section id="self-host" className="bg-white">
      <div className="mx-auto max-w-[1280px] px-6 py-24 md:px-10 md:py-32">
        <div className="grid grid-cols-1 gap-14 md:grid-cols-12 md:gap-12">
          <div className="md:col-span-5">
            <Eyebrow tone="primary">Self-host</Eyebrow>
            <div className="mt-6">
              <SectionTitle lead="Open-core." />
              <h2 className="mt-1 font-display text-[38px] font-semibold leading-[1.02] tracking-[-0.035em] text-stone-400 md:text-[56px]">
                Inside your walls.
              </h2>
            </div>
            <SectionLead>
              Cavalry is licensed under the Apache License 2.0. Self-host freely, including for
              commercial use. Enterprise features land in the commercial tier.
            </SectionLead>
            <div className="mt-10 flex flex-wrap gap-3">
              <CtaButton href="/docs" variant="primary-light" icon={ArrowRight}>
                Deployment guide
              </CtaButton>
              <CtaButton
                href="https://github.com"
                variant="secondary-light"
                icon={ArrowUpRight}
                external
              >
                View on GitHub
              </CtaButton>
            </div>
          </div>
          <div className="md:col-span-7">
            <div className="relative">
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-4 -z-10 rounded-[32px] bg-gradient-to-br from-primary/[0.1] via-stone-100/40 to-transparent blur-2xl"
              />
              <div className="overflow-hidden rounded-2xl bg-neutral-950 ring-1 ring-neutral-800 shadow-[0_30px_80px_-30px_rgba(12,10,9,0.4)]">
                <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-neutral-700" />
                    <span className="size-2.5 rounded-full bg-neutral-700" />
                    <span className="size-2.5 rounded-full bg-neutral-700" />
                  </div>
                  <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                    ~ quickstart
                  </span>
                </div>
                <pre className="overflow-x-auto p-6 font-mono text-[12.5px] leading-relaxed text-neutral-200">
                  {CODE}
                </pre>
              </div>
              <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-2xl bg-stone-100/60 ring-1 ring-stone-200/80 text-[13px]">
                {META.map((t, i) => (
                  <div
                    key={t.label}
                    className={cn(
                      'p-5 transition-colors hover:bg-white',
                      i < META.length - 1 && 'border-r border-stone-200',
                    )}
                  >
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-stone-500">
                      {t.label}
                    </div>
                    <div className="mt-1.5 font-medium tracking-[-0.01em] text-stone-900">
                      {t.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
