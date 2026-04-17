import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { and, eq } from 'drizzle-orm';
import { memberships, organizations } from '@cavalry/database';
import type { TrpcContext } from './context';

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const authedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: { ...ctx, session: ctx.session, user: ctx.session.user },
  });
});

const ORG_HEADER = 'x-cavalry-org';

export const orgProcedure = authedProcedure.use(async ({ ctx, next }) => {
  const orgSlug = ctx.headers.get(ORG_HEADER);
  if (!orgSlug) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Missing ${ORG_HEADER} header`,
    });
  }

  const [row] = await ctx.db
    .select({
      org: organizations,
      role: memberships.role,
    })
    .from(organizations)
    .innerJoin(memberships, eq(memberships.orgId, organizations.id))
    .where(and(eq(organizations.slug, orgSlug), eq(memberships.userId, ctx.user.id)))
    .limit(1);

  if (!row) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this organization' });
  }

  return next({
    ctx: {
      ...ctx,
      org: row.org,
      role: row.role as 'owner' | 'admin' | 'author' | 'member',
    },
  });
});

export const adminProcedure = orgProcedure.use(async ({ ctx, next }) => {
  if (ctx.role !== 'owner' && ctx.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin role required' });
  }
  return next({ ctx });
});

export const ORG_HEADER_NAME = ORG_HEADER;
