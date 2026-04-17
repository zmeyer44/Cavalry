import { and, desc, eq, gt, isNull, or, sql } from 'drizzle-orm';
import {
  policies as policiesTable,
  policyEvaluations,
  approvals,
  installs,
  type Database,
  type DbTransaction,
} from '@cavalry/database';
import { evaluate, type PolicyContext, type PolicyRow } from '@cavalry/policy';
import { emitAuditEvent } from '@cavalry/audit';

/**
 * Shape of the auth context each route already has. Kept narrow so the
 * pipeline stage doesn't pull in every field from AuthContext.
 */
export interface PipelineAuth {
  orgId: string;
  userId: string | null;
  tokenId: string;
  db: Database;
}

export interface InstallMetadata {
  skillRef: string;
  resolvedVersion: string;
  sourceRegistryId: string | null;
  sourceSkillVersionId: string | null;
  workspaceId: string | null;
  projectIdentifier: string | null;
  userAgent: string | null;
  cacheHit?: boolean;
  registryName?: string | null;
}

export interface PolicyBlockResult {
  blocked: true;
  statusCode: 403;
  body: {
    type: string;
    title: string;
    status: 403;
    detail: string;
    policyId: string;
    policyName: string;
    decision: 'deny';
  };
  installId: string;
}

export interface PolicyPendingResult {
  blocked: true;
  statusCode: 202;
  body: {
    type: string;
    title: 'approval_required';
    status: 202;
    detail: string;
    policyId: string;
    policyName: string;
    approvalId: string;
    approvalStatus: 'pending' | 'denied';
    decision: 'require_approval';
  };
  installId: string;
}

export interface PolicyAllowResult {
  blocked: false;
  /**
   * Evaluations collected while deciding `allow`. The caller persists these
   * alongside the install record once it knows the install_id.
   *
   * When an approved approval record is what's letting the install through,
   * `approvalId` points at it so the caller can stamp it into the install
   * metadata for audit continuity.
   */
  evaluations: ReturnType<typeof evaluate>['evaluations'];
  approvalId?: string;
}

export type PolicyResult =
  | PolicyBlockResult
  | PolicyPendingResult
  | PolicyAllowResult;

const APPROVAL_TTL_HOURS = 24;

/**
 * Evaluate policies against a pending install and reconcile with any
 * prior approval record. The three outcomes are:
 *
 *   - allow → caller serves the artifact and records an `allowed` install
 *   - blocked (403) → hard deny from a policy rule OR a previously denied
 *     approval. Install row with result=blocked written, audit emitted.
 *   - pending (202) → require_approval in effect and no approved decision
 *     exists yet. Install row with result=pending_approval written,
 *     approval row created/reused, `approval.requested` audit emitted on
 *     first request.
 */
export async function enforcePolicy(args: {
  auth: PipelineAuth;
  context: PolicyContext;
  install: InstallMetadata;
}): Promise<PolicyResult> {
  const rows = await args.auth.db
    .select()
    .from(policiesTable)
    .where(eq(policiesTable.orgId, args.auth.orgId));

  const loaded: PolicyRow[] = rows.map((r) => ({
    id: r.id,
    orgId: r.orgId,
    scopeType: r.scopeType as 'org' | 'workspace',
    scopeId: r.scopeId,
    name: r.name,
    type: r.type as PolicyRow['type'],
    config: r.config,
    priority: r.priority,
    enabled: r.enabled,
    createdAt: r.createdAt,
  }));

  const { decision, evaluations } = evaluate(loaded, args.context);

  if (decision.type === 'allow') {
    return { blocked: false, evaluations };
  }

  if (decision.type === 'require_approval') {
    return handleRequireApproval({
      auth: args.auth,
      install: args.install,
      decision,
      evaluations,
    });
  }

  // Hard deny.
  const installId = await writeBlockedInstall({
    auth: args.auth,
    install: args.install,
    result: 'blocked',
    evaluations,
    decisionMeta: {
      type: 'deny',
      policyId: decision.policyId,
      policyName: decision.policyName,
      reason: decision.reason,
    },
    emitBlockedAudit: true,
  });

  return {
    blocked: true,
    statusCode: 403,
    body: {
      type: 'https://cavalry.sh/errors/policy-violation',
      title: 'policy_violation',
      status: 403,
      detail: decision.reason,
      policyId: decision.policyId,
      policyName: decision.policyName,
      decision: 'deny',
    },
    installId,
  };
}

async function handleRequireApproval(args: {
  auth: PipelineAuth;
  install: InstallMetadata;
  decision: {
    type: 'require_approval';
    policyId: string;
    policyName: string;
    reason: string;
  };
  evaluations: ReturnType<typeof evaluate>['evaluations'];
}): Promise<PolicyResult> {
  // Look up the most recent approval for this skill_ref in this org.
  // Approvals are linked to installs; we match on installs.skill_ref and
  // ignore expired pending requests so a stale 24h-old request doesn't wedge.
  const latest = await args.auth.db
    .select({
      id: approvals.id,
      status: approvals.status,
      decidedAt: approvals.decidedAt,
      reason: approvals.reason,
      expiresAt: approvals.expiresAt,
      createdAt: approvals.createdAt,
    })
    .from(approvals)
    .innerJoin(installs, eq(installs.id, approvals.installId))
    .where(
      and(
        eq(approvals.orgId, args.auth.orgId),
        eq(installs.skillRef, args.install.skillRef),
      ),
    )
    .orderBy(desc(approvals.createdAt))
    .limit(1);

  const existing = latest[0];

  if (existing?.status === 'approved') {
    // Approval in hand — treat this request like allow. The caller writes
    // the install as result=allowed and stamps the approval id for audit.
    return {
      blocked: false,
      evaluations: args.evaluations,
      approvalId: existing.id,
    };
  }

  if (existing?.status === 'denied') {
    const installId = await writeBlockedInstall({
      auth: args.auth,
      install: args.install,
      result: 'blocked',
      evaluations: args.evaluations,
      decisionMeta: {
        type: 'require_approval_denied',
        policyId: args.decision.policyId,
        policyName: args.decision.policyName,
        reason: existing.reason ?? 'approval denied',
      },
      emitBlockedAudit: true,
    });
    return {
      blocked: true,
      statusCode: 403,
      body: {
        type: 'https://cavalry.sh/errors/policy-violation',
        title: 'policy_violation',
        status: 403,
        detail: existing.reason ?? 'Previously denied by an admin',
        policyId: args.decision.policyId,
        policyName: args.decision.policyName,
        decision: 'deny',
      },
      installId,
    };
  }

  // Expired pending approval is treated as no-approval-yet — we create a new
  // one below.
  const now = Date.now();
  const isLive =
    existing?.status === 'pending' &&
    existing.expiresAt !== null &&
    existing.expiresAt.getTime() > now;

  if (existing && isLive) {
    // Reuse the pending approval; don't pile up duplicate rows per retry.
    const installId = await writeBlockedInstall({
      auth: args.auth,
      install: args.install,
      result: 'pending_approval',
      evaluations: args.evaluations,
      decisionMeta: {
        type: 'require_approval_pending',
        policyId: args.decision.policyId,
        policyName: args.decision.policyName,
        reason: args.decision.reason,
        approvalId: existing.id,
      },
      emitBlockedAudit: false,
    });
    return pendingResponse({
      installId,
      approvalId: existing.id,
      decision: args.decision,
      approvalStatus: 'pending',
    });
  }

  // No live approval yet — create install + approval + audit.
  const { installId, approvalId } = await args.auth.db.transaction(
    async (tx: DbTransaction) => {
      const iid = await writeBlockedInstallInTx(tx, {
        auth: args.auth,
        install: args.install,
        result: 'pending_approval',
        evaluations: args.evaluations,
        decisionMeta: {
          type: 'require_approval_pending',
          policyId: args.decision.policyId,
          policyName: args.decision.policyName,
          reason: args.decision.reason,
        },
      });

      const expiresAt = new Date(now + APPROVAL_TTL_HOURS * 60 * 60 * 1000);
      const [approval] = await tx
        .insert(approvals)
        .values({
          orgId: args.auth.orgId,
          installId: iid,
          requestedBy: args.auth.userId,
          status: 'pending',
          expiresAt,
        })
        .returning({ id: approvals.id });
      if (!approval) throw new Error('failed to create approval');

      await emitAuditEvent({
        orgId: args.auth.orgId,
        actor: { type: 'token', tokenId: args.auth.tokenId },
        action: 'approval.requested',
        resource: { type: 'approval', id: approval.id },
        payload: {
          installId: iid,
          skillRef: args.install.skillRef,
          policyId: args.decision.policyId,
          policyName: args.decision.policyName,
        },
        request: { userAgent: args.install.userAgent ?? undefined },
        tx,
      });

      return { installId: iid, approvalId: approval.id };
    },
  );

  return pendingResponse({
    installId,
    approvalId,
    decision: args.decision,
    approvalStatus: 'pending',
  });
}

function pendingResponse(args: {
  installId: string;
  approvalId: string;
  decision: { policyId: string; policyName: string; reason: string };
  approvalStatus: 'pending' | 'denied';
}): PolicyPendingResult {
  return {
    blocked: true,
    statusCode: 202,
    body: {
      type: 'https://cavalry.sh/errors/approval-required',
      title: 'approval_required',
      status: 202,
      detail: `Approval required by policy "${args.decision.policyName}"`,
      policyId: args.decision.policyId,
      policyName: args.decision.policyName,
      approvalId: args.approvalId,
      approvalStatus: args.approvalStatus,
      decision: 'require_approval',
    },
    installId: args.installId,
  };
}

interface DecisionMeta {
  type: 'deny' | 'require_approval_pending' | 'require_approval_denied';
  policyId: string;
  policyName: string;
  reason: string;
  approvalId?: string;
}

async function writeBlockedInstall(args: {
  auth: PipelineAuth;
  install: InstallMetadata;
  result: 'blocked' | 'pending_approval';
  evaluations: ReturnType<typeof evaluate>['evaluations'];
  decisionMeta: DecisionMeta;
  emitBlockedAudit: boolean;
}): Promise<string> {
  return args.auth.db.transaction(async (tx: DbTransaction) => {
    const iid = await writeBlockedInstallInTx(tx, args);
    if (args.emitBlockedAudit) {
      await emitAuditEvent({
        orgId: args.auth.orgId,
        actor: { type: 'token', tokenId: args.auth.tokenId },
        action: 'skill.install_blocked',
        resource: { type: 'install', id: iid },
        payload: {
          ref: args.install.skillRef,
          policyId: args.decisionMeta.policyId,
          policyName: args.decisionMeta.policyName,
          reason: args.decisionMeta.reason,
          decisionType: args.decisionMeta.type,
        },
        request: { userAgent: args.install.userAgent ?? undefined },
        tx,
      });
    }
    return iid;
  });
}

async function writeBlockedInstallInTx(
  tx: DbTransaction,
  args: {
    auth: PipelineAuth;
    install: InstallMetadata;
    result: 'blocked' | 'pending_approval';
    evaluations: ReturnType<typeof evaluate>['evaluations'];
    decisionMeta: DecisionMeta;
  },
): Promise<string> {
  const [install] = await tx
    .insert(installs)
    .values({
      orgId: args.auth.orgId,
      userId: args.auth.userId ?? null,
      tokenId: args.auth.tokenId,
      workspaceId: args.install.workspaceId,
      projectIdentifier: args.install.projectIdentifier,
      skillRef: args.install.skillRef,
      resolvedVersion: args.install.resolvedVersion,
      sourceRegistryId: args.install.sourceRegistryId,
      sourceSkillVersionId: args.install.sourceSkillVersionId,
      result: args.result,
      metadata: {
        userAgent: args.install.userAgent,
        registry: args.install.registryName ?? null,
        policyDecision: args.decisionMeta.type,
        policyId: args.decisionMeta.policyId,
        policyName: args.decisionMeta.policyName,
        approvalId: args.decisionMeta.approvalId ?? null,
        cacheHit: args.install.cacheHit ?? false,
      },
    })
    .returning({ id: installs.id });
  if (!install) throw new Error('failed to record install row');

  if (args.evaluations.length > 0) {
    await tx.insert(policyEvaluations).values(
      args.evaluations.map((e) => ({
        installId: install.id,
        policyId: e.policyId,
        matched: e.matched,
        result: e.result,
        reason: e.reason,
      })),
    );
  }

  return install.id;
}

/**
 * Persist the install row for an `allow` outcome. Called by the route after
 * it successfully serves the artifact. When approvalId is provided (approved
 * install unblocking a prior pending request), it's stamped into metadata.
 */
export async function recordAllowedInstall(args: {
  auth: PipelineAuth;
  install: InstallMetadata;
  evaluations: ReturnType<typeof evaluate>['evaluations'];
  approvalId?: string;
  action?: 'skill.installed' | 'registry.proxy_hit';
}): Promise<string | null> {
  return args.auth.db.transaction(async (tx: DbTransaction) => {
    const [install] = await tx
      .insert(installs)
      .values({
        orgId: args.auth.orgId,
        userId: args.auth.userId ?? null,
        tokenId: args.auth.tokenId,
        workspaceId: args.install.workspaceId,
        projectIdentifier: args.install.projectIdentifier,
        skillRef: args.install.skillRef,
        resolvedVersion: args.install.resolvedVersion,
        sourceRegistryId: args.install.sourceRegistryId,
        sourceSkillVersionId: args.install.sourceSkillVersionId,
        result: 'allowed',
        metadata: {
          userAgent: args.install.userAgent,
          registry: args.install.registryName ?? null,
          cacheHit: args.install.cacheHit ?? false,
          approvalId: args.approvalId ?? null,
        },
      })
      .returning({ id: installs.id });
    if (!install) return null;

    if (args.evaluations.length > 0) {
      await tx.insert(policyEvaluations).values(
        args.evaluations.map((e) => ({
          installId: install.id,
          policyId: e.policyId,
          matched: e.matched,
          result: e.result,
          reason: e.reason,
        })),
      );
    }

    await emitAuditEvent({
      orgId: args.auth.orgId,
      actor: { type: 'token', tokenId: args.auth.tokenId },
      action: args.action ?? 'skill.installed',
      resource: {
        type: 'skill_version',
        id: args.install.sourceSkillVersionId ?? install.id,
      },
      payload: {
        ref: args.install.skillRef,
        installId: install.id,
        registry: args.install.registryName ?? null,
        approvalId: args.approvalId ?? null,
      },
      request: { userAgent: args.install.userAgent ?? undefined },
      tx,
    });
    return install.id;
  });
}

export { and, eq } from 'drizzle-orm';
