import Link from 'next/link';
import { and, count, countDistinct, desc, eq, gte, lt, sql } from 'drizzle-orm';
import {
  ArrowRight,
  Boxes,
  ExternalLink,
  KeyRound,
  Network,
  ScrollText,
  ShieldCheck,
  Users,
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

interface BucketRow extends Record<string, unknown> {
  day: string;
  allowed: number;
  blocked: number;
  pending_approval: number;
}

/**
 * 30-day daily install counts split by result. Uses a generate_series join
 * so empty days still appear and the sparkline has a stable x-axis.
 */
async function loadInstallsTimeseries(orgId: string): Promise<BucketRow[]> {
  const db = getDb();
  const rows = await db.execute<BucketRow>(sql`
    WITH days AS (
      SELECT generate_series(
        date_trunc('day', now()) - interval '29 days',
        date_trunc('day', now()),
        interval '1 day'
      )::date AS day
    )
    SELECT
      to_char(d.day, 'YYYY-MM-DD') AS day,
      COALESCE(SUM(CASE WHEN i.result = 'allowed' THEN 1 ELSE 0 END), 0)::int AS allowed,
      COALESCE(SUM(CASE WHEN i.result = 'blocked' THEN 1 ELSE 0 END), 0)::int AS blocked,
      COALESCE(SUM(CASE WHEN i.result = 'pending_approval' THEN 1 ELSE 0 END), 0)::int AS pending_approval
    FROM days d
    LEFT JOIN ${installs} i
      ON i.org_id = ${orgId}
      AND i.created_at >= d.day
      AND i.created_at < d.day + interval '1 day'
    GROUP BY d.day
    ORDER BY d.day ASC
  `);
  return rows.rows;
}

async function loadTopSkills(orgId: string) {
  const db = getDb();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return db
    .select({
      namespace: skills.namespace,
      name: skills.name,
      installCount: count(installs.id),
    })
    .from(installs)
    .innerJoin(skills, eq(skills.id, installs.sourceSkillVersionId))
    .where(
      and(
        eq(installs.orgId, orgId),
        eq(installs.result, 'allowed'),
        gte(installs.createdAt, since),
      ),
    )
    .groupBy(skills.namespace, skills.name)
    .orderBy(desc(count(installs.id)))
    .limit(5);
}

async function loadStaleSkills(orgId: string) {
  const db = getDb();
  const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  // Skills whose most recent install (if any) is before the cutoff. We
  // compute via a correlated subquery — simple, fine at our scale.
  return db
    .select({
      namespace: skills.namespace,
      name: skills.name,
      createdAt: skills.createdAt,
      lastInstallAt: sql<Date | null>`(
        SELECT MAX(${installs.createdAt})
        FROM ${installs}
        WHERE ${installs.orgId} = ${skills.orgId}
          AND ${installs.skillRef} LIKE ${skills.namespace} || '/' || ${skills.name} || '@%'
      )`.as('last_install_at'),
    })
    .from(skills)
    .where(
      and(
        eq(skills.orgId, orgId),
        eq(skills.status, 'active'),
        lt(skills.createdAt, cutoff),
      ),
    )
    .orderBy(skills.namespace, skills.name)
    .limit(6);
}

async function loadWorkspaceAdoption(orgId: string) {
  const db = getDb();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      installCount: count(installs.id),
      uniqueUsers: countDistinct(installs.userId),
    })
    .from(workspaces)
    .leftJoin(
      installs,
      and(
        eq(installs.workspaceId, workspaces.id),
        eq(installs.result, 'allowed'),
        gte(installs.createdAt, since),
      ),
    )
    .where(eq(workspaces.orgId, orgId))
    .groupBy(workspaces.id, workspaces.name, workspaces.slug)
    .orderBy(desc(count(installs.id)))
    .limit(8);
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

function InstallsSparkline({ buckets }: { buckets: BucketRow[] }) {
  const max = Math.max(
    1,
    ...buckets.map((b) => b.allowed + b.blocked + b.pending_approval),
  );
  return (
    <div className="flex h-24 items-end gap-[3px]" data-testid="installs-sparkline">
      {buckets.map((b) => {
        const total = b.allowed + b.blocked + b.pending_approval;
        const allowedPct = total === 0 ? 0 : (b.allowed / max) * 100;
        const blockedPct = total === 0 ? 0 : (b.blocked / max) * 100;
        const pendingPct =
          total === 0 ? 0 : (b.pending_approval / max) * 100;
        return (
          <div
            key={b.day}
            className="flex min-w-[6px] flex-1 flex-col-reverse overflow-hidden rounded-sm"
            title={`${b.day}: ${total} installs (${b.allowed} allowed, ${b.blocked} blocked, ${b.pending_approval} pending)`}
          >
            <div
              className="w-full bg-emerald-500 dark:bg-emerald-400"
              style={{ height: `${allowedPct}%` }}
            />
            <div
              className="w-full bg-amber-400 dark:bg-amber-300"
              style={{ height: `${pendingPct}%` }}
            />
            <div
              className="w-full bg-red-500 dark:bg-red-400"
              style={{ height: `${blockedPct}%` }}
            />
            {total === 0 ? (
              <div className="w-full bg-muted" style={{ height: '2px' }} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { org: orgSlug } = await params;
  const org = await loadOrg(orgSlug);
  if (!org) return null;
  const [stats, events, buckets, top, stale, adoption] = await Promise.all([
    loadStats(org.id),
    loadRecentActivity(org.id),
    loadInstallsTimeseries(org.id),
    loadTopSkills(org.id),
    loadStaleSkills(org.id),
    loadWorkspaceAdoption(org.id),
  ]);

  const totals = buckets.reduce(
    (acc, b) => {
      acc.allowed += b.allowed;
      acc.blocked += b.blocked;
      acc.pending_approval += b.pending_approval;
      return acc;
    },
    { allowed: 0, blocked: 0, pending_approval: 0 },
  );

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

      {/* Install timeseries */}
      <section className="mt-10 rounded-lg border border-border bg-card p-5">
        <header className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="cav-label">Installs · 30 days</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Green = allowed · amber = pending approval · red = blocked
            </p>
          </div>
          <div className="flex gap-5 text-xs">
            <div>
              <p className="text-[11px] text-muted-foreground">allowed</p>
              <p className="cav-display text-xl leading-none">{totals.allowed}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">blocked</p>
              <p className="cav-display text-xl leading-none">{totals.blocked}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">pending</p>
              <p className="cav-display text-xl leading-none">
                {totals.pending_approval}
              </p>
            </div>
          </div>
        </header>
        <InstallsSparkline buckets={buckets} />
      </section>

      {/* Top skills + stale skills */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section
          className="rounded-lg border border-border bg-card p-5"
          data-testid="top-skills"
        >
          <h2 className="cav-label mb-3">Top skills · 30 days</h2>
          {top.length === 0 ? (
            <p className="text-xs text-muted-foreground">No installs yet.</p>
          ) : (
            <ol className="space-y-2">
              {top.map((s, i) => (
                <li
                  key={`${s.namespace}/${s.name}`}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="cav-display text-muted-foreground text-lg">
                      {i + 1}
                    </span>
                    <Link
                      href={`/${orgSlug}/skills/${s.namespace}/${s.name}`}
                      className="truncate font-mono hover:underline"
                    >
                      {s.namespace}/{s.name}
                    </Link>
                  </span>
                  <span className="tabular text-xs">{s.installCount}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section
          className="rounded-lg border border-border bg-card p-5"
          data-testid="stale-skills"
        >
          <h2 className="cav-label mb-3">Stale skills · not installed in 60d</h2>
          {stale.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nothing stale yet. Skills published within the last 60 days are excluded.
            </p>
          ) : (
            <ul className="space-y-2">
              {stale.map((s) => (
                <li
                  key={`${s.namespace}/${s.name}`}
                  className="flex items-center justify-between text-sm"
                >
                  <Link
                    href={`/${orgSlug}/skills/${s.namespace}/${s.name}`}
                    className="truncate font-mono hover:underline"
                  >
                    {s.namespace}/{s.name}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {s.lastInstallAt
                      ? `last ${relativeTime(new Date(s.lastInstallAt))}`
                      : 'never installed'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Workspace adoption */}
      <section
        className="mt-6 rounded-lg border border-border bg-card p-5"
        data-testid="workspace-adoption"
      >
        <h2 className="cav-label mb-3">Per-workspace adoption · 30 days</h2>
        {adoption.length === 0 ? (
          <p className="text-xs text-muted-foreground">No workspaces yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 text-left font-medium">Workspace</th>
                  <th className="py-2 text-right font-medium">Installs</th>
                  <th className="py-2 text-right font-medium">Users</th>
                  <th className="py-2 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {adoption.map((w) => (
                  <tr key={w.id}>
                    <td className="py-2">{w.name}</td>
                    <td className="py-2 text-right tabular">{w.installCount}</td>
                    <td className="py-2 text-right tabular">{w.uniqueUsers}</td>
                    <td className="py-2 text-right">
                      <Link
                        href={`/${orgSlug}/settings/workspaces`}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Activity + CLI snippet */}
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-5">
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

        <section className="lg:col-span-2">
          <h2 className="cav-label mb-3">Quick actions</h2>
          <div className="space-y-2">
            <Link
              href={`/${orgSlug}/skills`}
              className="group block rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-border-strong hover:bg-card-elevated"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
                  <Boxes className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">
                    Publish a skill
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    In-UI or from the CLI.
                  </p>
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
              </div>
            </Link>
            <Link
              href={`/${orgSlug}/settings/members`}
              className="group block rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-border-strong hover:bg-card-elevated"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
                  <Users className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">
                    Invite your team
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Collaborators, by role.
                  </p>
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
              </div>
            </Link>
            <Link
              href={`/${orgSlug}/policies`}
              className="group block rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-border-strong hover:bg-card-elevated"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
                  <ShieldCheck className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">
                    Configure policies
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Allowlists, blocklists, approvals.
                  </p>
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
              </div>
            </Link>
          </div>

          <div className="mt-6 rounded-lg border border-dashed border-border p-4">
            <span className="cav-label">CLI</span>
            <pre className="mt-2 overflow-auto rounded bg-muted p-3 font-mono text-[12px] leading-relaxed">
              {`$ cavalry login --url ${process.env.CAVALRY_GATEWAY_URL ?? 'http://localhost:3001'}
$ cavalry publish ./my-skill
$ cavalry install acme-platform/kafka-wrapper`}
            </pre>
            <a
              href="https://docs.cavalry.sh"
              className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              docs <ExternalLink className="size-3" />
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
