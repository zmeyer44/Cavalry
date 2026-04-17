import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { auth } from '@cavalry/auth/server';
import { getDb, memberships, organizations } from '@cavalry/database';
import { TopNav } from '@/components/marketing/top-nav';
import { Hero } from '@/components/marketing/hero';
import {
  TrustBar,
  Stats,
  Problem,
  HowItWorks,
  Features,
  Personas,
  Comparison,
  SelfHost,
  Integrations,
  CTA,
  Footer,
} from '@/components/marketing/sections';

export default async function LandingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    const [row] = await getDb()
      .select({ slug: organizations.slug })
      .from(memberships)
      .innerJoin(organizations, eq(memberships.orgId, organizations.id))
      .where(eq(memberships.userId, session.user.id))
      .limit(1);
    if (row) redirect(`/${row.slug}`);
    redirect('/onboarding');
  }

  return (
    <div className="light min-h-screen bg-white text-stone-900">
      <TopNav />
      <Hero />
      <TrustBar />
      <Stats />
      <Problem />
      <HowItWorks />
      <Features />
      <Personas />
      <Comparison />
      <SelfHost />
      <Integrations />
      <CTA />
      <Footer />
    </div>
  );
}
