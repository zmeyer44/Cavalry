'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { ArrowRight, GitBranch, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { Input } from '@/components/ui/input';

export default function ConnectSkillRepoPage() {
  const { org } = useParams<{ org: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const preselectedInstallationId = params.get('installation');

  const installations = trpc.gitInstallation.list.useQuery();
  const selectedInstallationId =
    preselectedInstallationId ?? installations.data?.[0]?.id ?? null;

  const startInstall = trpc.gitInstallation.startGitHubInstall.useMutation({
    onSuccess: ({ url }) => {
      window.location.assign(url);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="p-6 md:p-10">
      <PageHeader
        eyebrow="Connect"
        title={
          <>
            Connect a <span className="cav-display italic">skill repository</span>
          </>
        }
        description="Install the Cavalry GitHub App on your org, then pick one or more repos to sync."
      />

      <div className="space-y-6">
        <section className="rounded-lg border border-border bg-card p-5">
          <header className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-medium">1 · GitHub App installation</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Required once per org. Install the App against your GitHub organization so
                Cavalry can read repository contents and receive webhooks.
              </p>
            </div>
            <Button
              onClick={() => startInstall.mutate({})}
              disabled={startInstall.isPending}
            >
              <GitBranch className="size-4" /> Install on GitHub
            </Button>
          </header>

          {installations.data && installations.data.length > 0 ? (
            <div className="mt-4 divide-y divide-border rounded-md border border-border">
              {installations.data.map((inst) => (
                <label
                  key={inst.id}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm"
                >
                  <input
                    type="radio"
                    name="installation"
                    value={inst.id}
                    checked={selectedInstallationId === inst.id}
                    onChange={() => router.replace(`?installation=${inst.id}`)}
                    className="size-4"
                  />
                  <GitBranch className="size-4 text-muted-foreground" />
                  <span className="font-medium">{inst.accountLogin}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {inst.accountType}
                  </Badge>
                  {inst.suspendedAt ? (
                    <Badge variant="outline" className="text-[10px]">
                      suspended
                    </Badge>
                  ) : null}
                </label>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              No GitHub installations yet. Click <em>Install on GitHub</em> to start.
            </p>
          )}
        </section>

        {selectedInstallationId ? (
          <RepoPicker
            installationId={selectedInstallationId}
            orgSlug={org}
          />
        ) : null}
      </div>

      <div className="mt-8">
        <Link
          href={`/${org}/skill-repos`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="size-3 rotate-180" /> Back to skill repos
        </Link>
      </div>
    </div>
  );
}

function RepoPicker({
  installationId,
  orgSlug,
}: {
  installationId: string;
  orgSlug: string;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState('');
  const available = trpc.skillRepo.listAvailableRepos.useQuery({
    gitInstallationId: installationId,
  });
  const connect = trpc.skillRepo.connect.useMutation({
    onSuccess: async (repo) => {
      toast.success(`${repo.owner}/${repo.repo} connected — initial sync queued`);
      await utils.skillRepo.list.invalidate();
      router.push(`/${orgSlug}/skill-repos/${repo.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const filtered = (available.data ?? []).filter((r) => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return `${r.owner}/${r.repo}`.toLowerCase().includes(q);
  });

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium">2 · Choose a repo</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Only repos the App can access are listed. The repo must contain a valid
            <code className="mx-1 font-mono">cavalry.yaml</code> on its default branch.
          </p>
        </div>
        <Input
          placeholder="filter…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-xs"
        />
      </header>

      {available.isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="mt-4 max-h-[480px] overflow-y-auto rounded-md border border-border">
          {filtered.length === 0 ? (
            <p className="p-6 text-center text-xs text-muted-foreground">
              No repositories match.
            </p>
          ) : (
            filtered.map((r) => (
              <div
                key={`${r.owner}/${r.repo}`}
                className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
                data-testid={`available-repo-${r.owner}-${r.repo}`}
              >
                {r.private ? (
                  <Lock className="size-3.5 text-muted-foreground" />
                ) : (
                  <Unlock className="size-3.5 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    {r.owner}/{r.repo}
                  </p>
                  {r.description ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {r.description}
                    </p>
                  ) : null}
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {r.defaultBranch}
                </Badge>
                {r.alreadyConnected ? (
                  <Badge variant="outline" className="text-[10px]">
                    connected
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    disabled={connect.isPending}
                    onClick={() =>
                      connect.mutate({
                        gitInstallationId: installationId,
                        owner: r.owner,
                        repo: r.repo,
                      })
                    }
                  >
                    Connect
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
