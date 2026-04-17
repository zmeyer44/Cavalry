import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { workspaces, workspaceMembers, users, memberships } from '@cavalry/database';
import { WORKSPACE_ROLES, orgSlugSchema } from '@cavalry/common';
import { emitAuditEvent } from '@cavalry/audit';
import { router, orgProcedure, adminProcedure } from '../trpc';

const nameSchema = z.string().min(1).max(255);
const descSchema = z.string().max(2000).optional();

export const workspaceRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        description: workspaces.description,
        createdAt: workspaces.createdAt,
      })
      .from(workspaces)
      .where(eq(workspaces.orgId, ctx.org.id))
      .orderBy(desc(workspaces.createdAt));
  }),

  get: orgProcedure
    .input(z.object({ slug: orgSlugSchema }))
    .query(async ({ ctx, input }) => {
      const [ws] = await ctx.db
        .select()
        .from(workspaces)
        .where(and(eq(workspaces.orgId, ctx.org.id), eq(workspaces.slug, input.slug)))
        .limit(1);
      if (!ws) throw new TRPCError({ code: 'NOT_FOUND' });
      return ws;
    }),

  create: adminProcedure
    .input(
      z.object({
        name: nameSchema,
        slug: orgSlugSchema,
        description: descSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const taken = await ctx.db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(and(eq(workspaces.orgId, ctx.org.id), eq(workspaces.slug, input.slug)))
        .limit(1);
      if (taken[0]) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Slug already in use' });
      }
      const created = await ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(workspaces)
          .values({
            orgId: ctx.org.id,
            name: input.name,
            slug: input.slug,
            description: input.description,
          })
          .returning();
        if (!row) throw new Error('failed to create workspace');

        await tx
          .insert(workspaceMembers)
          .values({ workspaceId: row.id, userId: ctx.user.id, role: 'admin' });

        await emitAuditEvent({
          orgId: ctx.org.id,
          actor: { type: 'user', userId: ctx.user.id },
          action: 'workspace.created',
          resource: { type: 'workspace', id: row.id },
          payload: { name: input.name, slug: input.slug },
          request: { ip: ctx.ip ?? undefined, userAgent: ctx.headers.get('user-agent') ?? undefined },
          tx,
        });
        return row;
      });
      return created;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: nameSchema.optional(),
        description: descSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const [ws] = await tx
          .select()
          .from(workspaces)
          .where(and(eq(workspaces.id, input.id), eq(workspaces.orgId, ctx.org.id)))
          .limit(1);
        if (!ws) throw new TRPCError({ code: 'NOT_FOUND' });

        await tx
          .update(workspaces)
          .set({
            ...(input.name ? { name: input.name } : {}),
            ...(input.description !== undefined ? { description: input.description } : {}),
            updatedAt: new Date(),
          })
          .where(eq(workspaces.id, input.id));

        await emitAuditEvent({
          orgId: ctx.org.id,
          actor: { type: 'user', userId: ctx.user.id },
          action: 'workspace.updated',
          resource: { type: 'workspace', id: ws.id },
          payload: { name: input.name, description: input.description },
          request: { ip: ctx.ip ?? undefined, userAgent: ctx.headers.get('user-agent') ?? undefined },
          tx,
        });
      });
      return { ok: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const [ws] = await tx
          .select()
          .from(workspaces)
          .where(and(eq(workspaces.id, input.id), eq(workspaces.orgId, ctx.org.id)))
          .limit(1);
        if (!ws) throw new TRPCError({ code: 'NOT_FOUND' });

        await tx.delete(workspaceMembers).where(eq(workspaceMembers.workspaceId, ws.id));
        await tx.delete(workspaces).where(eq(workspaces.id, ws.id));

        await emitAuditEvent({
          orgId: ctx.org.id,
          actor: { type: 'user', userId: ctx.user.id },
          action: 'workspace.deleted',
          resource: { type: 'workspace', id: ws.id },
          payload: { name: ws.name, slug: ws.slug },
          request: { ip: ctx.ip ?? undefined, userAgent: ctx.headers.get('user-agent') ?? undefined },
          tx,
        });
      });
      return { ok: true };
    }),

  listMembers: orgProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [ws] = await ctx.db
        .select()
        .from(workspaces)
        .where(and(eq(workspaces.id, input.workspaceId), eq(workspaces.orgId, ctx.org.id)))
        .limit(1);
      if (!ws) throw new TRPCError({ code: 'NOT_FOUND' });
      return ctx.db
        .select({
          id: workspaceMembers.id,
          userId: users.id,
          email: users.email,
          name: users.name,
          role: workspaceMembers.role,
          createdAt: workspaceMembers.createdAt,
        })
        .from(workspaceMembers)
        .innerJoin(users, eq(workspaceMembers.userId, users.id))
        .where(eq(workspaceMembers.workspaceId, ws.id))
        .orderBy(desc(workspaceMembers.createdAt));
    }),

  addMember: adminProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        userId: z.string(),
        role: z.enum(WORKSPACE_ROLES).default('member'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const [ws] = await tx
          .select()
          .from(workspaces)
          .where(and(eq(workspaces.id, input.workspaceId), eq(workspaces.orgId, ctx.org.id)))
          .limit(1);
        if (!ws) throw new TRPCError({ code: 'NOT_FOUND' });

        const [m] = await tx
          .select({ id: memberships.id })
          .from(memberships)
          .where(and(eq(memberships.orgId, ctx.org.id), eq(memberships.userId, input.userId)))
          .limit(1);
        if (!m) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'User is not a member of this organization',
          });
        }

        await tx
          .insert(workspaceMembers)
          .values({ workspaceId: ws.id, userId: input.userId, role: input.role })
          .onConflictDoNothing();

        await emitAuditEvent({
          orgId: ctx.org.id,
          actor: { type: 'user', userId: ctx.user.id },
          action: 'workspace.member_added',
          resource: { type: 'workspace', id: ws.id },
          payload: { userId: input.userId, role: input.role },
          request: { ip: ctx.ip ?? undefined, userAgent: ctx.headers.get('user-agent') ?? undefined },
          tx,
        });
      });
      return { ok: true };
    }),

  removeMember: adminProcedure
    .input(z.object({ workspaceId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const [ws] = await tx
          .select()
          .from(workspaces)
          .where(and(eq(workspaces.id, input.workspaceId), eq(workspaces.orgId, ctx.org.id)))
          .limit(1);
        if (!ws) throw new TRPCError({ code: 'NOT_FOUND' });

        await tx
          .delete(workspaceMembers)
          .where(
            and(
              eq(workspaceMembers.workspaceId, ws.id),
              eq(workspaceMembers.userId, input.userId),
            ),
          );

        await emitAuditEvent({
          orgId: ctx.org.id,
          actor: { type: 'user', userId: ctx.user.id },
          action: 'workspace.member_removed',
          resource: { type: 'workspace', id: ws.id },
          payload: { userId: input.userId },
          request: { ip: ctx.ip ?? undefined, userAgent: ctx.headers.get('user-agent') ?? undefined },
          tx,
        });
      });
      return { ok: true };
    }),
});
