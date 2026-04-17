import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { and, eq } from 'drizzle-orm';
import { auth } from '@cavalry/auth/server';
import { getDb, memberships, organizations } from '@cavalry/database';
import { TrpcProvider } from '@/lib/trpc/provider';
import { CavalrySidebar } from '@/components/cavalry-sidebar';

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ org: string }>;
}) {
  const { org: orgSlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect(`/login?redirect=/${orgSlug}`);

  const db = getDb();
  const [org] = await db
    .select({ id: organizations.id, name: organizations.name, slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.slug, orgSlug))
    .limit(1);
  if (!org) notFound();

  const [membership] = await db
    .select({ role: memberships.role })
    .from(memberships)
    .where(and(eq(memberships.orgId, org.id), eq(memberships.userId, session.user.id)))
    .limit(1);
  if (!membership) notFound();

  const isAdmin = membership.role === 'owner' || membership.role === 'admin';

  return (
    <TrpcProvider orgSlug={org.slug}>
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        <CavalrySidebar
          user={session.user}
          orgSlug={org.slug}
          orgName={org.name}
          isAdmin={isAdmin}
        />
        <div className="flex flex-1 p-2 pl-0">
          <main className="relative flex-1 overflow-auto rounded-lg border border-border bg-card shadow-sm">
            {children}
          </main>
        </div>
      </div>
    </TrpcProvider>
  );
}
