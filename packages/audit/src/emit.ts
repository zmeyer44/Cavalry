import { auditEvents, getDb, type Database, type DbTransaction } from '@cavalry/database';
import type { AuditAction } from './actions';

export type AuditActor =
  | { type: 'user'; userId: string }
  | { type: 'token'; tokenId: string }
  | { type: 'system' };

export interface EmitAuditEventParams {
  orgId: string;
  actor: AuditActor;
  action: AuditAction;
  resource: { type: string; id: string };
  payload?: Record<string, unknown>;
  request?: { ip?: string; userAgent?: string };
  tx?: DbTransaction | Database;
}

export async function emitAuditEvent(params: EmitAuditEventParams): Promise<void> {
  const runner = params.tx ?? getDb();
  const actorId =
    params.actor.type === 'user'
      ? params.actor.userId
      : params.actor.type === 'token'
        ? params.actor.tokenId
        : null;

  await runner.insert(auditEvents).values({
    orgId: params.orgId,
    actorType: params.actor.type,
    actorId,
    action: params.action,
    resourceType: params.resource.type,
    resourceId: params.resource.id,
    payload: params.payload ?? {},
    ipAddress: params.request?.ip ?? null,
    userAgent: params.request?.userAgent ?? null,
  });
}
