import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { auth } from '@cavalry/auth/server';
import { getDb, organizations, memberships } from '@cavalry/database';
import { createOrgSchema } from '@cavalry/common';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createOrgSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid organization', details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const db = getDb();
  const existing = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, parsed.data.slug))
    .limit(1);

  if (existing[0]) {
    return NextResponse.json({ error: 'Slug already taken' }, { status: 409 });
  }

  const created = await db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organizations)
      .values({ name: parsed.data.name, slug: parsed.data.slug })
      .returning();
    if (!org) throw new Error('Failed to create organization');
    await tx.insert(memberships).values({
      userId: session.user.id,
      orgId: org.id,
      role: 'owner',
    });
    return org;
  });

  return NextResponse.json({ id: created.id, slug: created.slug });
}
