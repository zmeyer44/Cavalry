'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronRight, Network, Plus, Trash2 } from 'lucide-react';
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
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/components/page-header';

const TYPES = [
  { value: 'tessl', label: 'Tessl', defaultUrl: 'https://tessl.io/registry' },
  { value: 'github', label: 'GitHub', defaultUrl: 'https://api.github.com' },
  { value: 'http', label: 'HTTP', defaultUrl: '' },
  { value: 'mcp', label: 'MCP (M3b)', defaultUrl: '' },
] as const;
type RegistryType = (typeof TYPES)[number]['value'];

export default function RegistriesPage() {
  const { org } = useParams<{ org: string }>();
  const utils = trpc.useUtils();
  const list = trpc.registry.list.useQuery();
  const create = trpc.registry.create.useMutation({
    onSuccess: () => {
      toast.success('Registry added');
      utils.registry.list.invalidate();
      reset();
      setOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = trpc.registry.delete.useMutation({
    onSuccess: () => {
      toast.success('Registry removed');
      utils.registry.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<RegistryType>('tessl');
  const [url, setUrl] = useState<string>(TYPES[0].defaultUrl);
  const [token, setToken] = useState('');

  function reset() {
    setName('');
    setType('tessl');
    setUrl(TYPES[0].defaultUrl);
    setToken('');
  }

  const onTypeChange = (t: RegistryType) => {
    setType(t);
    const def = TYPES.find((x) => x.value === t);
    if (def && (!url || TYPES.some((x) => x.defaultUrl === url))) {
      setUrl(def.defaultUrl);
    }
  };

  return (
    <div className="p-6 md:p-10">
      <PageHeader
        eyebrow="Upstream sources"
        title={
          <>
            Registry <span className="cav-display italic">sources</span>
          </>
        }
        description="Tessl, GitHub, and generic HTTP registries that the gateway proxies on behalf of your org."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> Add registry
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add upstream registry</DialogTitle>
                <DialogDescription>
                  The gateway will proxy requests through this registry and cache artifacts in
                  this org&apos;s storage.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  create.mutate({
                    name,
                    type,
                    url,
                    authConfig: token ? { token } : undefined,
                    enabled: true,
                  });
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Name</Label>
                  <Input
                    id="reg-name"
                    placeholder="tessl"
                    value={name}
                    onChange={(e) => setName(e.target.value.toLowerCase())}
                    pattern="[a-z0-9][a-z0-9-]*"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Used in refs: <code className="font-mono">{name || 'name'}://demo/hello</code>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-type">Type</Label>
                  <Select
                    id="reg-type"
                    value={type}
                    onChange={(e) => onTypeChange(e.target.value as RegistryType)}
                  >
                    {TYPES.map((t) => (
                      <option key={t.value} value={t.value} disabled={t.value === 'mcp'}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-url">URL</Label>
                  <Input
                    id="reg-url"
                    placeholder="https://tessl.io/registry"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-token">Token (optional)</Label>
                  <Input
                    id="reg-token"
                    placeholder="bearer token for private registry"
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Encrypted at rest with envelope encryption.
                  </p>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={create.isPending || !name || !url}>
                    Add
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {list.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : list.data && list.data.length > 0 ? (
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {list.data.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-12 items-center gap-4 px-5 py-3"
            >
              <div className="col-span-5 flex items-center gap-3 min-w-0">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
                  <Network className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium leading-tight">{r.name}</p>
                  <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                    {r.url}
                  </p>
                </div>
              </div>
              <div className="col-span-2">
                <Badge variant="outline" className="font-mono text-[11px]">
                  {r.type}
                </Badge>
              </div>
              <div className="col-span-2 flex items-center gap-2 text-xs">
                <span
                  className={
                    r.enabled
                      ? 'cav-signal cav-signal-green'
                      : 'cav-signal cav-signal-red'
                  }
                />
                {r.enabled ? 'enabled' : 'disabled'}
                {r.hasAuthConfig ? (
                  <Badge variant="outline" className="ml-1 text-[10px]">auth</Badge>
                ) : null}
              </div>
              <div className="col-span-3 flex items-center justify-end gap-2">
                <Link
                  href={`/${org}/registries/${r.id}`}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  details <ChevronRight className="size-3" />
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm(`Remove "${r.name}"?`)) remove.mutate({ id: r.id });
                  }}
                  aria-label={`Remove ${r.name}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-14 text-center">
          <Network className="mx-auto size-7 text-muted-foreground" />
          <p className="mt-4 text-sm">No registries configured.</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            Configure Tessl, GitHub, or generic HTTP registries to proxy public skills.
          </p>
        </div>
      )}
    </div>
  );
}
