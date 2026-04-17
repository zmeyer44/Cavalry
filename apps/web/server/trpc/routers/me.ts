import { eq } from 'drizzle-orm';
import { memberships, organizations } from '@cavalry/database';
import { router, authedProcedure, publicProcedure } from '../trpc';

export const meRouter = router({
  session: publicProcedure.query(({ ctx }) => {
    if (!ctx.session) return null;
    return {
      user: ctx.session.user,
    };
  }),

  organizations: authedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: organizations.id,
        slug: organizations.slug,
        name: organizations.name,
        role: memberships.role,
      })
      .from(memberships)
      .innerJoin(organizations, eq(memberships.orgId, organizations.id))
      .where(eq(memberships.userId, ctx.user.id));
    return rows;
  }),
});
