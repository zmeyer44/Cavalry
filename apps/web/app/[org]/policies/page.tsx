'use client';

import { useState } from 'react';
import { Plus, ShieldCheck, Trash2, Play } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/shared';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

type PolicyType = 'allowlist' | 'blocklist' | 'version_pin' | 'require_approval';
type SkillSource = 'internal' | 'tessl' | 'github_public' | 'http';

const TYPE_LABELS: Record<PolicyType, string> = {
  allowlist: 'Allowlist',
  blocklist: 'Blocklist',
  version_pin: 'Version pin',
  require_approval: 'Require approval',
};

const DECISION_VARIANTS: Record<string, string> = {
  allow: 'cav-signal cav-signal-green',
  deny: 'cav-signal cav-signal-red',
  require_approval: 'cav-signal cav-signal-amber',
};

function buildConfig(type: PolicyType, text: string): unknown {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  switch (type) {
    case 'allowlist':
    case 'blocklist':
      return { patterns: lines };
    case 'require_approval': {
      // `pattern\n  !exception` — lines starting with `!` are exceptions.
      const patterns: string[] = [];
      const exceptions: string[] = [];
      for (const line of lines) {
        if (line.startsWith('!')) exceptions.push(line.slice(1).trim());
        else patterns.push(line);
      }
      return exceptions.length > 0
        ? { patterns, exceptions }
        : { patterns };
    }
    case 'version_pin': {
      const rules: Array<{ pattern: string; range: string }> = [];
      for (const line of lines) {
        const [pattern, ...rangeParts] = line.split(/\s+/);
        if (!pattern || rangeParts.length === 0) continue;
        rules.push({ pattern, range: rangeParts.join(' ') });
      }
      return { rules };
    }
  }
}

function CreatePolicyDialog({ onCreated }: { onCreated: () => void }) {
  const create = trpc.policy.create.useMutation({
    onSuccess: () => {
      toast.success('Policy created');
      onCreated();
      reset();
      setOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<PolicyType>('blocklist');
  const [priority, setPriority] = useState(0);
  const [configText, setConfigText] = useState('');

  function reset() {
    setName('');
    setType('blocklist');
    setPriority(0);
    setConfigText('');
  }

  const placeholder = {
    allowlist: 'tessl:stripe/*\ninternal:*',
    blocklist: 'tessl:badactor/*\ngithub:*/malicious-*',
    version_pin: 'tessl:react/*  ^18.0.0\ntessl:node/*  >=20 <22',
    require_approval: 'tessl:*\n!internal:*',
  }[type];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> New policy
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create policy</DialogTitle>
          <DialogDescription>
            Policies evaluate at the gateway before every install. Higher priority wins; ties
            resolve to the newer policy.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const config = buildConfig(type, configText);
            create.mutate({
              name,
              type,
              scopeType: 'org',
              scopeId: null,
              priority,
              enabled: true,
              config,
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="p-name">Name</Label>
            <Input
              id="p-name"
              placeholder="no-tessl-badactor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="p-type">Type</Label>
              <Select
                id="p-type"
                value={type}
                onChange={(e) => setType(e.target.value as PolicyType)}
              >
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-priority">Priority</Label>
              <Input
                id="p-priority"
                type="number"
                min={0}
                max={1000}
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-config">Rules</Label>
            <textarea
              id="p-config"
              className="w-full min-h-[120px] rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              placeholder={placeholder}
            />
            <p className="text-[11px] text-muted-foreground">
              {type === 'version_pin'
                ? 'One rule per line: `pattern  semver-range` (e.g. `tessl:react/*  ^18.0.0`).'
                : type === 'require_approval'
                  ? 'One pattern per line. Prefix with `!` for exceptions.'
                  : 'One pattern per line. Supports globs like `tessl:stripe/*` and `*:badactor/*`.'}
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={create.isPending || !name || !configText.trim()}
            >
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PreviewPane() {
  const [source, setSource] = useState<SkillSource>('tessl');
  const [namespace, setNamespace] = useState('stripe');
  const [name, setName] = useState('stripe');
  const [version, setVersion] = useState<string>('2.0.0');

  const preview = trpc.policy.preview.useQuery(
    {
      skill: {
        source,
        namespace,
        name,
        version: version.trim() ? version : null,
      },
    },
    { enabled: Boolean(namespace && name) },
  );

  const decision = preview.data?.decision;
  const decisionType = decision?.type ?? 'allow';

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <header className="mb-4">
        <h2 className="text-sm font-medium">Preview</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Simulate a skill install against the current policy set. The result is what the
          gateway would return for this ref right now.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-[11px]">Source</Label>
          <Select value={source} onChange={(e) => setSource(e.target.value as SkillSource)}>
            <option value="internal">internal</option>
            <option value="tessl">tessl</option>
            <option value="github_public">github</option>
            <option value="http">http</option>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Namespace</Label>
          <Input value={namespace} onChange={(e) => setNamespace(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Version</Label>
          <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="latest" />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3 text-sm">
        <span
          className={DECISION_VARIANTS[decisionType] ?? DECISION_VARIANTS.allow}
          data-testid={`policy-preview-signal-${decisionType}`}
        />
        <span className="font-medium" data-testid="policy-preview-decision">
          {decisionType.toUpperCase()}
        </span>
        {decision && decision.type !== 'allow' ? (
          <span className="text-xs text-muted-foreground">
            · {decision.policyName} — {decision.reason}
          </span>
        ) : null}
      </div>

      {preview.data && preview.data.evaluations.length > 0 ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-[11px] text-muted-foreground">
            evaluations ({preview.data.evaluations.length})
          </summary>
          <ul className="mt-2 space-y-1 font-mono text-[11px]">
            {preview.data.evaluations.map((e) => (
              <li key={e.policyId} className="flex items-center gap-2">
                <span className={DECISION_VARIANTS[e.result] ?? DECISION_VARIANTS.allow} />
                <span className="font-medium">{e.policyName}</span>
                <span className="text-muted-foreground">
                  {e.matched ? 'matched' : 'no match'} — {e.result}
                  {e.reason ? ` — ${e.reason}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

export default function PoliciesPage() {
  const utils = trpc.useUtils();
  const list = trpc.policy.list.useQuery();
  const deletePolicy = trpc.policy.delete.useMutation({
    onSuccess: () => {
      toast.success('Policy deleted');
      void utils.policy.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.policy.update.useMutation({
    onSuccess: () => {
      void utils.policy.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-6 md:p-10">
      <PageHeader
        eyebrow="Governance rules"
        title={
          <>
            Enforcement <span className="cav-display italic">policies</span>
          </>
        }
        description="Allowlists, blocklists, version pins, and approval gates. Every policy evaluates at the gateway before an install completes."
        actions={<CreatePolicyDialog onCreated={() => void utils.policy.list.invalidate()} />}
      />

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-3">
          {list.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : list.data && list.data.length > 0 ? (
            <div
              className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card"
              data-testid="policies-list"
            >
              {list.data.map((p) => (
                <div
                  key={p.id}
                  className="grid grid-cols-12 items-center gap-4 px-5 py-3"
                  data-testid={`policy-row-${p.name}`}
                >
                  <div className="col-span-5 min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                      priority {p.priority} · {p.scopeType}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <Badge variant="outline" className="font-mono text-[11px]">
                      {p.type}
                    </Badge>
                  </div>
                  <div className="col-span-3 flex items-center gap-2 text-xs">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={p.enabled}
                        onChange={(e) =>
                          update.mutate({ id: p.id, enabled: e.target.checked })
                        }
                        className="size-3.5"
                      />
                      {p.enabled ? 'enabled' : 'disabled'}
                    </label>
                  </div>
                  <div className="col-span-2 flex items-center justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Delete policy "${p.name}"?`)) {
                          deletePolicy.mutate({ id: p.id });
                        }
                      }}
                      aria-label={`Delete ${p.name}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-14 text-center">
              <ShieldCheck className="mx-auto size-7 text-muted-foreground" />
              <p className="mt-4 text-sm">No policies yet.</p>
              <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                Until you add policies, every install is allowed. Start with a blocklist for
                known-bad namespaces or an allowlist that restricts what can flow through.
              </p>
            </div>
          )}
        </div>

        <PreviewPane />
      </div>
    </div>
  );
}
