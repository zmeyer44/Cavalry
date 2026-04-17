'use client';

import { useState } from 'react';
import { Copy, Key, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { PageHeader } from '@/components/page-header';

const ALL_SCOPES = ['skills:read', 'skills:write', 'skills:install'] as const;
type Scope = (typeof ALL_SCOPES)[number];

export default function TokensPage() {
  const utils = trpc.useUtils();
  const list = trpc.token.list.useQuery();
  const create = trpc.token.create.useMutation({
    onSuccess: (data) => {
      setCreatedToken(data.token);
      setName('');
      setScopes(['skills:read']);
      utils.token.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const revoke = trpc.token.revoke.useMutation({
    onSuccess: () => {
      toast.success('Token revoked');
      utils.token.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<Scope[]>(['skills:read']);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  return (
    <div className="p-6 md:p-10">
      <PageHeader
        eyebrow="Organization · Credentials"
        title={
          <>
            API <span className="cav-display italic">tokens</span>
          </>
        }
        description="Long-lived credentials for the CLI and CI. Shown once at creation, hashed at rest."
        actions={
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) setCreatedToken(null);
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Key className="size-4" /> New token
              </Button>
            </DialogTrigger>
            <DialogContent>
              {createdToken ? (
                <>
                  <DialogHeader>
                    <DialogTitle>
                      <span className="cav-display italic">Copy</span> your token now
                    </DialogTitle>
                    <DialogDescription>
                      Store it securely — you will not see it again.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="rounded-md border border-border bg-muted p-3 font-mono text-[12px] break-all">
                    {createdToken}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(createdToken);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                    >
                      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                    <DialogClose asChild>
                      <Button>Done</Button>
                    </DialogClose>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>Create API token</DialogTitle>
                    <DialogDescription>
                      Scope determines what endpoints this token can call.
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      create.mutate({ name, scopes });
                    }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="tok-name">Name</Label>
                      <Input
                        id="tok-name"
                        placeholder="CI — release pipeline"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Scopes</Label>
                      <div className="space-y-1.5 rounded-md border border-border p-3">
                        {ALL_SCOPES.map((s) => (
                          <label
                            key={s}
                            className="flex cursor-pointer items-center justify-between rounded px-1 py-1 text-sm transition-colors hover:bg-muted"
                          >
                            <code className="font-mono text-[12.5px]">{s}</code>
                            <input
                              type="checkbox"
                              className="accent-primary"
                              checked={scopes.includes(s)}
                              onChange={(e) =>
                                setScopes((curr) =>
                                  e.target.checked
                                    ? Array.from(new Set([...curr, s]))
                                    : curr.filter((x) => x !== s),
                                )
                              }
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button type="button" variant="outline">
                          Cancel
                        </Button>
                      </DialogClose>
                      <Button type="submit" disabled={create.isPending || scopes.length === 0}>
                        Create
                      </Button>
                    </DialogFooter>
                  </form>
                </>
              )}
            </DialogContent>
          </Dialog>
        }
      />

      {list.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : list.data && list.data.length > 0 ? (
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {list.data.map((t) => {
            const active = !t.revokedAt;
            return (
              <div
                key={t.id}
                className="grid grid-cols-12 items-center gap-4 px-5 py-3"
              >
                <div className="col-span-4 flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
                    <Key className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium leading-tight">{t.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {t.prefix}…
                    </p>
                  </div>
                </div>
                <div className="col-span-5 flex flex-wrap gap-1">
                  {t.scopes.map((s) => (
                    <Badge key={s} variant="outline" className="font-mono text-[11px]">
                      {s}
                    </Badge>
                  ))}
                </div>
                <div className="col-span-2">
                  <span className="inline-flex items-center gap-2 text-xs">
                    <span
                      className={
                        active
                          ? 'cav-signal cav-signal-green'
                          : 'cav-signal cav-signal-red'
                      }
                    />
                    {active ? 'active' : 'revoked'}
                  </span>
                </div>
                <div className="col-span-1 text-right">
                  {active ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Revoke "${t.name}"?`)) revoke.mutate({ id: t.id });
                      }}
                      aria-label={`Revoke ${t.name}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-14 text-center">
          <Key className="mx-auto size-7 text-muted-foreground" />
          <p className="mt-4 text-sm">No tokens yet.</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            Tokens authenticate the CLI and CI against the gateway.
          </p>
        </div>
      )}
    </div>
  );
}
