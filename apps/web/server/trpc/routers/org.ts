import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import {
  organizations,
  memberships,
  users,
  invitations,
} from '@cavalry/database';
import { ORG_ROLES, orgSlugSchema } from '@cavalry/common';
import { emitAuditEvent } from '@cavalry/audit';
import { router, orgProcedure, adminProcedure } from '../trpc';
import { generateInviteToken } from '@/server/tokens';
import { sendEmail } from '@/server/email';

const inviteExpiryDays = 7;

export const orgRouter = router({
  get: orgProcedure.query(({ ctx }) => ({
    id: ctx.org.id,
    slug: ctx.org.slug,
    name: ctx.org.name,
    settings: ctx.org.settings,
    role: ctx.role,
  })),

  completeOnboarding: adminProcedure.mutation(async ({ ctx }) => {
    const current = (ctx.org.settings ?? {}) as Record<string, unknown>;
    const next = { ...current, onboardingCompletedAt: new Date().toISOString() };
    await ctx.db
      .update(organizations)
      .set({ settings: next, updatedAt: new Date() })
      .where(eq(organizations.id, ctx.org.id));
    return { ok: true };
  }),

  update: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255).optional(),
        slug: orgSlugSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.name && !input.slug) return { ok: true };

      if (input.slug && input.slug !== ctx.org.slug) {
        const taken = await ctx.db
          .select({ id: organizations.id })
          .from(organizations)
          .where(eq(organizations.slug, input.slug))
          .limit(1);
        if (taken[0]) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Slug already taken' });
        }
      }

      await ctx.db.transaction(async (tx) => {
        await tx
          .update(organizations)
          .set({
            ...(input.name ? { name: input.name } : {}),
            ...(input.slug ? { slug: input.slug } : {}),
            updatedAt: new Date(),
          })
          .where(eq(organizations.id, ctx.org.id));

        await emitAuditEvent({
          orgId: ctx.org.id,
          actor: { type: 'user', userId: ctx.user.id },
          action: 'org.updated',
          resource: { type: 'organization', id: ctx.org.id },
          payload: input,
          request: { ip: ctx.ip ?? undefined, userAgent: ctx.headers.get('user-agent') ?? undefined },
          tx,
        });
      });

      return { ok: true };
    }),

  listMembers: orgProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: memberships.id,
        userId: users.id,
        email: users.email,
        name: users.name,
        role: memberships.role,
        createdAt: memberships.createdAt,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.orgId, ctx.org.id))
      .orderBy(desc(memberships.createdAt));
    return rows;
  }),

  removeMember: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot remove yourself' });
      }
      const [existing] = await ctx.db
        .select()
        .from(memberships)
        .where(
          and(eq(memberships.orgId, ctx.org.id), eq(memberships.userId, input.userId)),
        )
        .limit(1);
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Membership not found' });
      }
      if (existing.role === 'owner') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot remove an owner' });
      }
      await ctx.db.transaction(async (tx) => {
        await tx
          .delete(memberships)
          .where(
            and(eq(memberships.orgId, ctx.org.id), eq(memberships.userId, input.userId)),
          );
        await emitAuditEvent({
          orgId: ctx.org.id,
          actor: { type: 'user', userId: ctx.user.id },
          action: 'member.removed',
          resource: { type: 'user', id: input.userId },
          request: { ip: ctx.ip ?? undefined, userAgent: ctx.headers.get('user-agent') ?? undefined },
          tx,
        });
      });
      return { ok: true };
    }),

  updateMemberRole: adminProcedure
    .input(z.object({ userId: z.string(), role: z.enum(ORG_ROLES) }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot change your own role' });
      }
      await ctx.db.transaction(async (tx) => {
        await tx
          .update(memberships)
          .set({ role: input.role })
          .where(
            and(eq(memberships.orgId, ctx.org.id), eq(memberships.userId, input.userId)),
          );
        await emitAuditEvent({
          orgId: ctx.org.id,
          actor: { type: 'user', userId: ctx.user.id },
          action: 'member.role_updated',
          resource: { type: 'user', id: input.userId },
          payload: { role: input.role },
          request: { ip: ctx.ip ?? undefined, userAgent: ctx.headers.get('user-agent') ?? undefined },
          tx,
        });
      });
      return { ok: true };
    }),

  listInvitations: orgProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: invitations.id,
        email: invitations.email,
        role: invitations.role,
        status: invitations.status,
        expiresAt: invitations.expiresAt,
        createdAt: invitations.createdAt,
      })
      .from(invitations)
      .where(eq(invitations.orgId, ctx.org.id))
      .orderBy(desc(invitations.createdAt));
    return rows;
  }),

  inviteMember: adminProcedure
    .input(
      z.object({
        email: z.string().email().toLowerCase(),
        role: z.enum(ORG_ROLES).default('member'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.role === 'owner') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot invite as owner' });
      }

      const { token, hash } = generateInviteToken();
      const expiresAt = new Date(Date.now() + inviteExpiryDays * 24 * 60 * 60 * 1000);

      const inv = await ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(invitations)
          .values({
            orgId: ctx.org.id,
            email: input.email,
            role: input.role,
            tokenHash: hash,
            invitedById: ctx.user.id,
            expiresAt,
          })
          .returning();
        if (!row) throw new Error('failed to create invitation');

        await emitAuditEvent({
          orgId: ctx.org.id,
          actor: { type: 'user', userId: ctx.user.id },
          action: 'member.invited',
          resource: { type: 'invitation', id: row.id },
          payload: { email: input.email, role: input.role },
          request: { ip: ctx.ip ?? undefined, userAgent: ctx.headers.get('user-agent') ?? undefined },
          tx,
        });
        return row;
      });

      const baseUrl = process.env.CAVALRY_WEB_URL ?? 'http://localhost:3000';
      const acceptUrl = `${baseUrl}/accept-invite/${token}`;
      await sendEmail({
        to: input.email,
        subject: `You're invited to ${ctx.org.name} on Cavalry`,
        text: `Accept the invitation: ${acceptUrl}\n\nThis link expires in ${inviteExpiryDays} days.`,
      });

      return { id: inv.id, acceptUrl };
    }),

  revokeInvitation: adminProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const [inv] = await tx
          .select()
          .from(invitations)
          .where(and(eq(invitations.id, input.invitationId), eq(invitations.orgId, ctx.org.id)))
          .limit(1);
        if (!inv) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        if (inv.status !== 'pending') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invitation not pending' });
        }
        await tx
          .update(invitations)
          .set({ status: 'revoked' })
          .where(eq(invitations.id, inv.id));
        await emitAuditEvent({
          orgId: ctx.org.id,
          actor: { type: 'user', userId: ctx.user.id },
          action: 'invitation.revoked',
          resource: { type: 'invitation', id: inv.id },
          payload: { email: inv.email },
          request: { ip: ctx.ip ?? undefined, userAgent: ctx.headers.get('user-agent') ?? undefined },
          tx,
        });
      });
      return { ok: true };
    }),
});
