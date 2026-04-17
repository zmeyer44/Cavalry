import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { auth } from '@cavalry/auth/server';
import { getDb, memberships, organizations } from '@cavalry/database';
import { Button } from '@/components/ui/button';

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const db = getDb();
  const existing = await db
    .select({ slug: organizations.slug })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.orgId, organizations.id))
    .where(eq(memberships.userId, session.user.id))
    .limit(1);

  if (existing[0]) {
    redirect(`/${existing[0].slug}`);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="absolute inset-0 cav-grid-bg opacity-60" />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm cav-fade-up">
        <span className="cav-label">Onboarding · Step 0</span>
        <h1 className="mt-2 text-2xl tracking-tight">
          Claim your <span className="cav-display italic">organization</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You&apos;re signed in, but not a member of any organization. Create one to continue.
        </p>
        <div className="mt-6">
          <Link href="/signup">
            <Button className="w-full">Create organization</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
