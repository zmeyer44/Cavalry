'use client';

import { useState } from 'react';
import { Plus, Trash2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function WorkspacesPage() {
  const utils = trpc.useUtils();
  const list = trpc.workspace.list.useQuery();
  const create = trpc.workspace.create.useMutation({
    onSuccess: () => {
      toast.success('Workspace created');
      setOpen(false);
      setName('');
      setSlug('');
      setDescription('');
      utils.workspace.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = trpc.workspace.delete.useMutation({
    onSuccess: () => {
      toast.success('Workspace deleted');
      utils.workspace.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div className="p-6 md:p-10">
      <PageHeader
        eyebrow="Organization · Workspaces"
        title={
          <>
            Team <span className="cav-display italic">workspaces</span>
          </>
        }
        description="Group skills, policies, and members by team or business unit."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> New workspace
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create workspace</DialogTitle>
                <DialogDescription>
                  A workspace is a scoped governance surface inside your org.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  create.mutate({
                    name,
                    slug: slug || slugify(name),
                    description: description || undefined,
                  });
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="ws-name">Name</Label>
                  <Input
                    id="ws-name"
                    placeholder="Platform Engineering"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!slug) setSlug(slugify(e.target.value));
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ws-slug">Slug</Label>
                  <Input
                    id="ws-slug"
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    pattern="[a-z0-9][a-z0-9-]*"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ws-desc">Description</Label>
                  <Input
                    id="ws-desc"
                    placeholder="Optional"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={create.isPending}>
                    Create
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
          {list.data.map((ws) => (
            <div
              key={ws.id}
              className="grid grid-cols-12 items-center gap-4 px-5 py-4"
            >
              <div className="col-span-6 flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
                  <Building2 className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium leading-tight">{ws.name}</p>
                  <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                    {ws.slug}
                  </p>
                </div>
              </div>
              <div className="col-span-4 truncate text-xs text-muted-foreground">
                {ws.description ?? '—'}
              </div>
              <div className="col-span-1 text-right text-xs text-muted-foreground tabular">
                {new Date(ws.createdAt).toLocaleDateString()}
              </div>
              <div className="col-span-1 text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm(`Delete workspace "${ws.name}"?`)) {
                      remove.mutate({ id: ws.id });
                    }
                  }}
                  aria-label={`Delete ${ws.name}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-14 text-center">
          <Building2 className="mx-auto size-7 text-muted-foreground" />
          <p className="mt-4 text-sm">No workspaces yet.</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            Create a workspace to scope skills and policies by team.
          </p>
        </div>
      )}
    </div>
  );
}
