'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Slack, Trash2, Webhook } from 'lucide-react';
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

type WebhookFormat = 'generic' | 'splunk' | 'datadog';

const FORMAT_LABELS: Record<WebhookFormat, string> = {
  generic: 'Generic (Cavalry)',
  splunk: 'Splunk HEC',
  datadog: 'Datadog Logs',
};

function CreateWebhookDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [format, setFormat] = useState<WebhookFormat>('generic');
  const [actionFiltersText, setActionFiltersText] = useState('');

  const create = trpc.integration.webhookCreate.useMutation({
    onSuccess: () => {
      toast.success('Webhook added');
      onCreated();
      reset();
      setOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  function reset() {
    setName('');
    setUrl('');
    setSecret('');
    setFormat('generic');
    setActionFiltersText('');
  }

  function genSecret() {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    setSecret(
      Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(''),
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> Add webhook
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add audit webhook</DialogTitle>
          <DialogDescription>
            Audit events for this org will be POSTed to the URL with an
            <code className="mx-1 font-mono text-[11px]">X-Cavalry-Signature</code>
            header signed by the shared secret.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const filters = actionFiltersText
              .split(/\s+/)
              .map((s) => s.trim())
              .filter(Boolean);
            create.mutate({
              name,
              url,
              secret,
              format,
              actionFilters: filters,
              enabled: true,
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="wh-name">Name</Label>
            <Input
              id="wh-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="splunk-prod"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wh-url">URL</Label>
            <Input
              id="wh-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://siem.example.com/ingest"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wh-secret">Shared secret</Label>
            <div className="flex gap-2">
              <Input
                id="wh-secret"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="at least 16 chars"
                required
                minLength={16}
              />
              <Button type="button" variant="outline" onClick={genSecret}>
                Generate
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              The receiver should reject requests whose signature doesn't match
              HMAC-SHA256 of the body with this secret. Store it carefully — it
              is shown only once.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wh-format">Format</Label>
            <Select
              id="wh-format"
              value={format}
              onChange={(e) => setFormat(e.target.value as WebhookFormat)}
            >
              {Object.entries(FORMAT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wh-filters">Action filters (optional)</Label>
            <Input
              id="wh-filters"
              value={actionFiltersText}
              onChange={(e) => setActionFiltersText(e.target.value)}
              placeholder="skill.* approval.*"
            />
            <p className="text-[11px] text-muted-foreground">
              Space-separated globs. Empty = deliver everything.
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
              disabled={create.isPending || !name || !url || secret.length < 16}
            >
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SlackSection() {
  const utils = trpc.useUtils();
  const list = trpc.slack.list.useQuery();
  const setChannel = trpc.slack.setDefaultChannel.useMutation({
    onSuccess: () => {
      toast.success('Channel saved');
      void utils.slack.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = trpc.slack.remove.useMutation({
    onSuccess: () => {
      toast.success('Slack disconnected');
      void utils.slack.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const params = useParams<{ org: string }>();
  const orgList = trpc.me.organizations.useQuery();
  const orgId = orgList.data?.find((o) => o.slug === params.org)?.id;
  const installUrl = orgId
    ? `/api/integrations/slack/install?org=${encodeURIComponent(orgId)}`
    : '#';

  return (
    <section className="mb-8 rounded-lg border border-border bg-card p-5">
      <header className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium">Slack</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Approval requests get posted to a Slack channel with Approve / Deny buttons.
          </p>
        </div>
        {list.data && list.data.length === 0 ? (
          <a href={installUrl}>
            <Button disabled={!orgId}>
              <Slack className="size-4" /> Add to Slack
            </Button>
          </a>
        ) : null}
      </header>

      {list.data && list.data.length > 0 ? (
        <div className="divide-y divide-border rounded-md border border-border">
          {list.data.map((i) => {
            return (
              <SlackRow
                key={i.id}
                integration={i}
                onChannelSet={(channelId) =>
                  setChannel.mutate({ id: i.id, channelId })
                }
                onRemove={() => {
                  if (confirm(`Disconnect Slack workspace ${i.teamName}?`)) {
                    remove.mutate({ id: i.id });
                  }
                }}
                savingChannel={setChannel.isPending}
              />
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function SlackRow({
  integration,
  onChannelSet,
  onRemove,
  savingChannel,
}: {
  integration: { id: string; teamName: string; defaultChannelId: string | null };
  onChannelSet: (id: string) => void;
  onRemove: () => void;
  savingChannel: boolean;
}) {
  const [channelDraft, setChannelDraft] = useState(
    integration.defaultChannelId ?? '',
  );
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Slack className="size-4 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{integration.teamName}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          channel id (e.g. <code className="font-mono">C01ABC2DEF3</code>)
        </p>
      </div>
      <Input
        value={channelDraft}
        onChange={(e) => setChannelDraft(e.target.value)}
        placeholder="C01ABC2DEF3"
        className="w-44"
      />
      <Button
        size="sm"
        variant="outline"
        disabled={savingChannel || !channelDraft}
        onClick={() => onChannelSet(channelDraft)}
      >
        Save channel
      </Button>
      <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Disconnect">
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

export default function IntegrationsPage() {
  const utils = trpc.useUtils();
  const list = trpc.integration.webhookList.useQuery();
  const del = trpc.integration.webhookDelete.useMutation({
    onSuccess: () => {
      toast.success('Webhook removed');
      void utils.integration.webhookList.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.integration.webhookUpdate.useMutation({
    onSuccess: () => {
      void utils.integration.webhookList.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-6 md:p-10">
      <PageHeader
        eyebrow="SIEM &amp; automation"
        title={
          <>
            Audit event <span className="cav-display italic">webhooks</span>
          </>
        }
        description="Forward audit events to Splunk, Datadog, or any HTTP endpoint. Every delivery is signed and retried with backoff."
        actions={
          <CreateWebhookDialog
            onCreated={() => void utils.integration.webhookList.invalidate()}
          />
        }
      />

      <SlackSection />

      {list.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : list.data && list.data.length > 0 ? (
        <div
          className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card"
          data-testid="webhooks-list"
        >
          {list.data.map((w) => (
            <div
              key={w.id}
              className="grid grid-cols-12 items-center gap-4 px-5 py-3"
              data-testid={`webhook-row-${w.name}`}
            >
              <div className="col-span-5 min-w-0">
                <div className="flex items-center gap-2">
                  <Webhook className="size-4 text-muted-foreground" />
                  <p className="truncate text-sm font-medium">{w.name}</p>
                </div>
                <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                  {w.url}
                </p>
              </div>
              <div className="col-span-2">
                <Badge variant="outline" className="font-mono text-[11px]">
                  {w.format}
                </Badge>
              </div>
              <div className="col-span-3 flex items-center gap-2 text-xs">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={w.enabled}
                    onChange={(e) =>
                      update.mutate({ id: w.id, enabled: e.target.checked })
                    }
                    className="size-3.5"
                  />
                  {w.enabled ? 'enabled' : 'disabled'}
                </label>
                {w.lastFailureAt ? (
                  <Badge variant="outline" className="ml-1 text-[10px]">
                    last failed
                  </Badge>
                ) : null}
              </div>
              <div className="col-span-2 flex items-center justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm(`Remove webhook "${w.name}"?`)) {
                      del.mutate({ id: w.id });
                    }
                  }}
                  aria-label={`Remove ${w.name}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-14 text-center">
          <Webhook className="mx-auto size-7 text-muted-foreground" />
          <p className="mt-4 text-sm">No webhooks configured.</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            Add a webhook to forward audit events to a SIEM or an internal
            automation. Deliveries are signed with HMAC-SHA256 and retried with
            exponential backoff.
          </p>
        </div>
      )}
    </div>
  );
}
