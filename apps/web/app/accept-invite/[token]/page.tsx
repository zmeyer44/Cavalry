import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { and, eq, gte } from 'drizzle-orm';
import { auth } from '@cavalry/auth/server';
import { getDb, invitations, organizations } from '@cavalry/database';
import { hashToken } from '@/server/tokens';
import { AcceptInviteButton } from '@/components/accept-invite-button';
import { Button } from '@/components/ui/button';

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const hash = hashToken(token);
  const db = getDb();
  const [inv] = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
      orgName: organizations.name,
      orgSlug: organizations.slug,
    })
    .from(invitations)
    .innerJoin(organizations, eq(organizations.id, invitations.orgId))
    .where(
      and(
        eq(invitations.tokenHash, hash),
        eq(invitations.status, 'pending'),
        gte(invitations.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return (
    <main className="relative flex min-h-screen flex-col bg-background">
      <div className="absolute inset-0 cav-grid-bg opacity-60" />
      <div
        className="absolute inset-x-0 top-0 h-[400px] opacity-30"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, oklch(0.66 0.21 265 / 0.25), transparent 60%)',
        }}
      />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <span className="cav-display text-[15px] leading-none">C</span>
          </div>
          <span className="text-sm font-medium tracking-tight">Cavalry</span>
        </Link>
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
        {!inv ? (
          <InvalidInvite />
        ) : (
          <ValidInvite
            token={token}
            inv={inv}
            signedInEmail={
              (await auth.api.getSession({ headers: await headers() }))?.user.email ?? null
            }
          />
        )}
      </div>
    </main>
  );
}

function InvalidInvite() {
  return (
    <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 cav-fade-up">
      <span className="cav-label">Link · Expired</span>
      <h1 className="mt-2 text-2xl tracking-tight">
        This <span className="cav-display italic">invitation</span> is no longer valid.
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        It has been revoked, expired, or never existed. Ask the admin to resend.
      </p>
      <div className="mt-6">
        <Link href="/">
          <Button variant="outline">Back to home</Button>
        </Link>
      </div>
    </div>
  );
}

async function ValidInvite({
  token,
  inv,
  signedInEmail,
}: {
  token: string;
  inv: { email: string; role: string; orgName: string; orgSlug: string };
  signedInEmail: string | null;
}) {
  if (!signedInEmail) {
    const next = encodeURIComponent(`/accept-invite/${token}`);
    redirect(`/login?redirect=${next}`);
  }

  const emailMismatch = signedInEmail.toLowerCase() !== inv.email.toLowerCase();

  return (
    <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 cav-fade-up">
      <span className="cav-label">Invitation · {inv.orgSlug}</span>
      <h1 className="mt-2 text-2xl tracking-tight">
        Join <span className="cav-display italic">{inv.orgName}</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You&apos;ve been invited as a <strong>{inv.role}</strong>. Accepting joins this
        organization with the corresponding permissions.
      </p>
      <div className="mt-6 space-y-4">
        {emailMismatch ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
            This invitation is for <strong>{inv.email}</strong>, but you&apos;re signed in
            as <strong>{signedInEmail}</strong>. Sign out and back in with the invited
            email.
          </div>
        ) : (
          <AcceptInviteButton token={token} />
        )}
        <div className="text-center">
          <Link href="/">
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
