import Link from 'next/link';
import { and, count, desc, eq, gte } from 'drizzle-orm';
import {
  ArrowRight,
  Boxes,
  KeyRound,
  Network,
  ScrollText,
  ShieldCheck,
} from 'lucide-react';
import {
  apiTokens,
  auditEvents,
  getDb,
  installs,
  organizations,
  skills,
  users,
  workspaces,
} from '@cavalry/database';
import { PageHeader } from '@/components/page-header';

type PageParams = { org: string };

async function loadOrg(slug: string) {
  const db = getDb();
  const [org] = await db
    .select({ id: organizations.id, name: organizations.name, slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);
  return org ?? null;
}

async function loadStats(orgId: string) {
  const db = getDb();
  const now = new Date();
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [skillsCount] = await db
    .select({ n: count() })
    .from(skills)
    .where(eq(skills.orgId, orgId));
  const [workspacesCount] = await db
    .select({ n: count() })
    .from(workspaces)
    .where(eq(workspaces.orgId, orgId));
  const [tokensCount] = await db
    .select({ n: count() })
    .from(apiTokens)
    .where(eq(apiTokens.orgId, orgId));
  const [installsCount] = await db
    .select({ n: count() })
    .from(installs)
    .where(and(eq(installs.orgId, orgId), gte(installs.createdAt, since)));
  return {
    skills: skillsCount?.n ?? 0,
    workspaces: workspacesCount?.n ?? 0,
    tokens: tokensCount?.n ?? 0,
    installs7d: installsCount?.n ?? 0,
  };
}

async function loadRecentActivity(orgId: string) {
  const db = getDb();
  return db
    .select({
      id: auditEvents.id,
      action: auditEvents.action,
      resourceType: auditEvents.resourceType,
      resourceId: auditEvents.resourceId,
      createdAt: auditEvents.createdAt,
      actorEmail: users.email,
      actorType: auditEvents.actorType,
    })
    .from(auditEvents)
    .leftJoin(users, eq(users.id, auditEvents.actorId))
    .where(eq(auditEvents.orgId, orgId))
    .orderBy(desc(auditEvents.createdAt))
    .limit(8);
}

function relativeTime(from: Date): string {
  const diffMs = Date.now() - from.getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { org: orgSlug } = await params;
  const org = await loadOrg(orgSlug);
  if (!org) return null;
  const [stats, events] = await Promise.all([
    loadStats(org.id),
    loadRecentActivity(org.id),
  ]);

  const kpis: Array<{
    label: string;
    value: number;
    href: string;
    icon: typeof Boxes;
  }> = [
    { label: 'Skills', value: stats.skills, href: `/${orgSlug}/skills`, icon: Boxes },
    {
      label: 'Installs · 7d',
      value: stats.installs7d,
      href: `/${orgSlug}/audit`,
      icon: ScrollText,
    },
    {
      label: 'Workspaces',
      value: stats.workspaces,
      href: `/${orgSlug}/settings/workspaces`,
      icon: Network,
    },
    {
      label: 'API tokens',
      value: stats.tokens,
      href: `/${orgSlug}/settings/tokens`,
      icon: KeyRound,
    },
  ];

  const quickActions: Array<{
    title: string;
    description: string;
    href: string;
    icon: typeof Boxes;
  }> = [
    {
      title: 'Mint an API token',
      description: 'Bearer credential for the CLI or CI.',
      href: `/${orgSlug}/settings/tokens`,
      icon: KeyRound,
    },
    {
      title: 'Invite your team',
      description: 'Collaborators, by role.',
      href: `/${orgSlug}/settings/members`,
      icon: ShieldCheck,
    },
    {
      title: 'Browse skills',
      description: 'Published internal registry.',
      href: `/${orgSlug}/skills`,
      icon: Boxes,
    },
  ];

  return (
    <div className="relative p-6 md:p-10">
      <PageHeader
        eyebrow={`Organization · ${org.slug}`}
        title={
          <>
            Overview of <span className="cav-display italic">{org.name}</span>
          </>
        }
        description="Live state of your governed agent context. Updates as publishes, installs, and policy decisions flow through the gateway."
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4">
        {kpis.map((k, i) => (
          <Link
            key={k.label}
            href={k.href}
            className="group relative bg-card p-5 transition-colors hover:bg-card-elevated cav-fade-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className="cav-label">{k.label}</span>
              <k.icon className="size-3.5 text-muted-foreground" />
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="cav-display text-5xl leading-none">{k.value}</span>
              <ArrowRight className="ml-auto size-4 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Activity stream */}
        <section className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="cav-label">Recent activity</h2>
            <Link
              href={`/${orgSlug}/audit`}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Full log →
            </Link>
          </div>
          <div className="divide-y divide-border rounded-lg border border-border bg-card">
            {events.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                No activity yet.
              </div>
            ) : (
              events.map((e) => (
                <div
                  key={e.id}
                  className="flex items-start gap-4 px-5 py-3 text-sm"
                >
                  <span className="mt-1.5 cav-signal shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-mono text-[12.5px]">{e.action}</span>
                      <span className="text-xs text-muted-foreground">
                        {e.resourceType}/{e.resourceId.slice(0, 8)}…
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {e.actorType === 'user'
                        ? e.actorEmail ?? 'user'
                        : e.actorType}
                    </div>
                  </div>
                  <span
                    className="cav-label tabular shrink-0"
                    title={new Date(e.createdAt).toLocaleString()}
                  >
                    {relativeTime(new Date(e.createdAt))}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Quick actions */}
        <section className="lg:col-span-2">
          <h2 className="cav-label mb-3">Quick actions</h2>
          <div className="space-y-2">
            {quickActions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="group block rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-border-strong hover:bg-card-elevated"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
                    <a.icon className="size-4 text-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {a.description}
                    </p>
                  </div>
                  <ArrowRight className="size-4 translate-x-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-dashed border-border p-4">
            <span className="cav-label">CLI</span>
            <pre className="mt-2 overflow-auto rounded bg-muted p-3 font-mono text-[12px] leading-relaxed">
              {`$ cavalry login --url ${process.env.CAVALRY_GATEWAY_URL ?? 'http://localhost:3001'}
$ cavalry publish ./my-skill
$ cavalry install acme-platform/kafka-wrapper`}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}
