'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Boxes, ChevronRight, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/shared';
import { PageHeader } from '@/components/page-header';
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

function NewSkillDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [namespace, setNamespace] = useState('');
  const [name, setName] = useState('');
  const [version, setVersion] = useState('0.1.0');
  const [description, setDescription] = useState('');
  const [skillMarkdown, setSkillMarkdown] = useState(
    '# New skill\n\nDescribe what this skill does.\n',
  );

  const publish = trpc.skill.publishInline.useMutation({
    onSuccess: () => {
      toast.success('Skill published');
      onCreated();
      setOpen(false);
      setNamespace('');
      setName('');
      setVersion('0.1.0');
      setDescription('');
      setSkillMarkdown('# New skill\n\nDescribe what this skill does.\n');
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> New skill
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Publish a new skill</DialogTitle>
          <DialogDescription>
            For simple skills with one SKILL.md. Use <code className="font-mono">cavalry publish</code>
            from the CLI for multi-file skills.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            publish.mutate({
              namespace,
              name,
              version,
              description: description.trim() || undefined,
              skillMarkdown,
            });
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sk-ns">Namespace</Label>
              <Input
                id="sk-ns"
                value={namespace}
                onChange={(e) => setNamespace(e.target.value.toLowerCase())}
                pattern="[a-z0-9][a-z0-9-]*"
                required
                placeholder="acme-platform"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sk-name">Name</Label>
              <Input
                id="sk-name"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase())}
                pattern="[a-z0-9][a-z0-9-]*"
                required
                placeholder="kafka-wrapper"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sk-ver">Version</Label>
              <Input
                id="sk-ver"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                required
                placeholder="0.1.0"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sk-desc">Description</Label>
            <Input
              id="sk-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="short description (optional)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sk-md">SKILL.md</Label>
            <textarea
              id="sk-md"
              className="w-full min-h-[240px] rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
              value={skillMarkdown}
              onChange={(e) => setSkillMarkdown(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={
                publish.isPending ||
                !namespace ||
                !name ||
                !version ||
                !skillMarkdown.trim()
              }
            >
              Publish
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function SkillsInventoryPage() {
  const { org } = useParams<{ org: string }>();
  const utils = trpc.useUtils();
  const list = trpc.skill.list.useQuery();

  return (
    <div className="p-6 md:p-10">
      <PageHeader
        eyebrow="Private registry"
        title={
          <>
            Published <span className="cav-display italic">skills</span>
          </>
        }
        description="Internal skills published to this organization. Each version is content-addressed and immutable once published."
        actions={
          <NewSkillDialog onCreated={() => void utils.skill.list.invalidate()} />
        }
      />

      {list.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : list.data && list.data.length > 0 ? (
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {list.data.map((s) => (
            <Link
              key={s.id}
              href={`/${org}/skills/${s.namespace}/${s.name}`}
              className="group grid grid-cols-12 items-center gap-4 px-5 py-4 transition-colors hover:bg-card-elevated"
            >
              <div className="col-span-6 min-w-0 flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
                  <Boxes className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-mono text-[13px] leading-tight">
                    <span className="text-muted-foreground">{s.namespace}</span>
                    <span className="mx-0.5 text-muted-foreground">/</span>
                    <span>{s.name}</span>
                    {s.sourceRegistryId ? (
                      <span
                        className="ml-2 rounded bg-blue-500/15 px-1 py-0.5 font-mono text-[10px] text-blue-600"
                        data-testid="upstream-badge"
                      >
                        upstream
                      </span>
                    ) : null}
                  </p>
                  {s.description ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {s.description}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="col-span-2 flex justify-start">
                {s.latestVersion ? (
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] tabular">
                    v{s.latestVersion}
                  </span>
                ) : (
                  <span className="cav-label">no versions</span>
                )}
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <span className="cav-label">versions</span>
                <span className="font-mono text-[13px] tabular">
                  {s.versionCount ?? 0}
                </span>
              </div>
              <div className="col-span-2 flex items-center justify-end gap-3 text-xs text-muted-foreground">
                <span className="tabular">
                  {s.latestAt ? new Date(s.latestAt).toLocaleDateString() : '—'}
                </span>
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-14 text-center">
          <Boxes className="mx-auto size-7 text-muted-foreground" />
          <p className="mt-4 text-sm">No skills published yet.</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            Publish from the CLI:{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              cavalry publish ./skill-dir
            </code>
          </p>
        </div>
      )}
    </div>
  );
}
