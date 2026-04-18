'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowRight,
  Check,
  CircleDashed,
  Network,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/shared';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type StepState = 'pending' | 'active' | 'done' | 'skipped';

interface Step {
  key: 'policy' | 'registry' | 'invites';
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: Step[] = [
  {
    key: 'policy',
    title: 'Choose a default policy',
    description:
      'Start with an allowlist, blocklist, or approval gate. You can add more later.',
    icon: ShieldCheck,
  },
  {
    key: 'registry',
    title: 'Connect an upstream registry',
    description:
      'Tessl is the default public source. Skip if you only want internal skills.',
    icon: Network,
  },
  {
    key: 'invites',
    title: 'Invite teammates',
    description: 'Comma-separated emails. They can approve installs too.',
    icon: UserPlus,
  },
];

const POLICY_TEMPLATES: Array<{
  id: string;
  name: string;
  type: 'allowlist' | 'blocklist' | 'require_approval';
  config: Record<string, unknown>;
  description: string;
}> = [
  {
    id: 'approve-upstream',
    name: 'Approve upstream installs',
    type: 'require_approval',
    config: { patterns: ['tessl:*', 'github:*', 'http:*'], exceptions: ['internal:*'] },
    description: 'Requires human review for every non-internal install. Safe default.',
  },
  {
    id: 'block-github-public',
    name: 'Block public GitHub',
    type: 'blocklist',
    config: { patterns: ['github:*'] },
    description: 'Deny installs from the public github-proxy registry.',
  },
  {
    id: 'allowlist-internal-tessl',
    name: 'Allowlist internal + Tessl',
    type: 'allowlist',
    config: { patterns: ['internal:*', 'tessl:*'] },
    description: 'Restrict installs to your internal registry plus Tessl.',
  },
];

function StepRail({ steps }: { steps: Array<Step & { state: StepState }> }) {
  return (
    <ol className="mb-8 flex items-center gap-4">
      {steps.map((s, idx) => {
        const Icon = s.icon;
        return (
          <li
            key={s.key}
            className="flex items-center gap-2"
            data-testid={`onboarding-step-${s.key}`}
          >
            <span
              className={
                s.state === 'done'
                  ? 'flex size-7 items-center justify-center rounded-full bg-emerald-500 text-white'
                  : s.state === 'active'
                    ? 'flex size-7 items-center justify-center rounded-full border border-foreground bg-background text-foreground'
                    : s.state === 'skipped'
                      ? 'flex size-7 items-center justify-center rounded-full border border-dashed border-border bg-muted text-muted-foreground'
                      : 'flex size-7 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground'
              }
            >
              {s.state === 'done' ? (
                <Check className="size-3.5" />
              ) : (
                <Icon className="size-3.5" />
              )}
            </span>
            <span
              className={
                s.state === 'active'
                  ? 'text-sm font-medium'
                  : 'text-sm text-muted-foreground'
              }
            >
              {s.title}
            </span>
            {idx < steps.length - 1 ? (
              <span className="mx-1 h-px w-8 bg-border" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export default function OnboardingWizardPage() {
  const { org: orgSlug } = useParams<{ org: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const orgQuery = trpc.org.get.useQuery();
  const alreadyDone = Boolean(
    (orgQuery.data?.settings as { onboardingCompletedAt?: string } | undefined)
      ?.onboardingCompletedAt,
  );

  const [active, setActive] = useState<'policy' | 'registry' | 'invites'>('policy');
  const [status, setStatus] = useState<Record<Step['key'], StepState>>({
    policy: 'active',
    registry: 'pending',
    invites: 'pending',
  });

  const createPolicy = trpc.policy.create.useMutation();
  const createRegistry = trpc.registry.create.useMutation();
  const invite = trpc.org.inviteMember.useMutation();
  const finish = trpc.org.completeOnboarding.useMutation();

  const [policyChoice, setPolicyChoice] = useState<string>('approve-upstream');
  const [registryEnabled, setRegistryEnabled] = useState(true);
  const [tesslUrl, setTesslUrl] = useState('https://tessl.io/registry');
  const [inviteEmails, setInviteEmails] = useState('');

  const advance = (key: Step['key'], nextState: 'done' | 'skipped') => {
    setStatus((s) => ({ ...s, [key]: nextState }));
    if (key === 'policy') setActive('registry');
    else if (key === 'registry') setActive('invites');
    else if (key === 'invites') void complete();
  };

  const complete = async () => {
    await finish.mutateAsync();
    await utils.org.get.invalidate();
    toast.success('Setup complete');
    router.push(`/${orgSlug}`);
  };

  const runPolicy = async () => {
    const tpl = POLICY_TEMPLATES.find((t) => t.id === policyChoice);
    if (!tpl) return advance('policy', 'skipped');
    try {
      await createPolicy.mutateAsync({
        name: tpl.id,
        type: tpl.type,
        scopeType: 'org',
        scopeId: null,
        priority: 50,
        enabled: true,
        config: tpl.config,
      });
      advance('policy', 'done');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const runRegistry = async () => {
    if (!registryEnabled) return advance('registry', 'skipped');
    try {
      await createRegistry.mutateAsync({
        name: 'tessl',
        type: 'tessl',
        url: tesslUrl,
        enabled: true,
      });
      advance('registry', 'done');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const runInvites = async () => {
    const emails = inviteEmails
      .split(/[\s,;]+/)
      .map((e) => e.trim())
      .filter((e) => /@/.test(e));
    if (emails.length === 0) return advance('invites', 'skipped');
    try {
      for (const email of emails) {
        await invite.mutateAsync({ email, role: 'member' });
      }
      toast.success(`Invited ${emails.length} teammate${emails.length === 1 ? '' : 's'}`);
      advance('invites', 'done');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  if (orgQuery.isLoading) {
    return (
      <div className="p-10 text-sm text-muted-foreground">Loading…</div>
    );
  }

  if (alreadyDone) {
    return (
      <div className="p-6 md:p-10">
        <PageHeader
          eyebrow="Setup"
          title={<>Setup already complete</>}
          description="You can revisit any of these from the settings menu."
        />
        <Link href={`/${orgSlug}`}>
          <Button>Go to dashboard</Button>
        </Link>
      </div>
    );
  }

  const steps = STEPS.map((s) => ({ ...s, state: status[s.key] }));

  return (
    <div className="p-6 md:p-10">
      <PageHeader
        eyebrow="One-time setup"
        title={
          <>
            Welcome to <span className="cav-display italic">Cavalry</span>
          </>
        }
        description="Three quick steps to get your org production-ready. Each one is skippable — come back later from the settings pages."
      />

      <StepRail steps={steps} />

      {active === 'policy' ? (
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-medium">Pick a default policy</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            One policy starts enabled; the others are always one click away in
            /{orgSlug}/policies.
          </p>
          <div className="mt-4 space-y-2">
            {POLICY_TEMPLATES.map((t) => (
              <label
                key={t.id}
                className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3"
              >
                <input
                  type="radio"
                  name="policy"
                  className="mt-1 size-4"
                  value={t.id}
                  checked={policyChoice === t.id}
                  onChange={() => setPolicyChoice(t.id)}
                />
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => advance('policy', 'skipped')}
              data-testid="onboarding-skip-policy"
            >
              Skip
            </Button>
            <Button
              onClick={() => void runPolicy()}
              disabled={createPolicy.isPending}
              data-testid="onboarding-next-policy"
            >
              Continue <ArrowRight className="size-4" />
            </Button>
          </div>
        </section>
      ) : null}

      {active === 'registry' ? (
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-medium">Connect an upstream registry</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Proxying through Cavalry lets you audit and gate every install from
            Tessl. You can add GitHub, HTTP, or MCP registries later.
          </p>
          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={registryEnabled}
                onChange={(e) => setRegistryEnabled(e.target.checked)}
                className="size-4"
              />
              Enable Tessl registry
            </label>
            <div className="space-y-1">
              <Label className="text-[11px]">Registry URL</Label>
              <Input
                value={tesslUrl}
                onChange={(e) => setTesslUrl(e.target.value)}
                disabled={!registryEnabled}
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => advance('registry', 'skipped')}
              data-testid="onboarding-skip-registry"
            >
              Skip
            </Button>
            <Button
              onClick={() => void runRegistry()}
              disabled={createRegistry.isPending}
              data-testid="onboarding-next-registry"
            >
              Continue <ArrowRight className="size-4" />
            </Button>
          </div>
        </section>
      ) : null}

      {active === 'invites' ? (
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-medium">Invite teammates</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Emails, comma- or newline-separated. Invitees get a 7-day link to join as
            a member. Promote them to admin later from /{orgSlug}/settings/members.
          </p>
          <textarea
            className="mt-3 min-h-[100px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="alice@acme.com, bob@acme.com"
            value={inviteEmails}
            onChange={(e) => setInviteEmails(e.target.value)}
          />
          <div className="mt-5 flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => advance('invites', 'skipped')}
              data-testid="onboarding-skip-invites"
            >
              Skip
            </Button>
            <Button
              onClick={() => void runInvites()}
              disabled={invite.isPending}
              data-testid="onboarding-finish"
            >
              Finish setup <ArrowRight className="size-4" />
            </Button>
          </div>
        </section>
      ) : null}

      {!orgQuery.isLoading && alreadyDone ? null : (
        <p className="mt-6 text-[11px] text-muted-foreground">
          <CircleDashed className="mr-1 inline size-3" />
          You can skip any step and come back — this wizard won't re-appear after
          it's dismissed.
        </p>
      )}
    </div>
  );
}
