import { and, eq } from 'drizzle-orm';
import {
  approvals,
  getDb,
  installs,
  policies,
  policyEvaluations,
  slackIntegrations,
} from '@cavalry/database';
import {
  approvalDecidedBlocks,
  slackConfigFromEnv,
  updateMessage,
  verifySlackSignature,
} from '@cavalry/slack';
import { decrypt, isEnvelope } from '@cavalry/registry-upstream';
import { emitAuditEvent } from '@cavalry/audit';
import { verifyInstallState } from '@/server/state-token';

export const dynamic = 'force-dynamic';

/**
 * Slack sends button-click payloads as `application/x-www-form-urlencoded`
 * with a single `payload=<JSON>` parameter. We verify the signing secret,
 * parse the payload, and decide an approval if the action was ours.
 */
export async function POST(req: Request): Promise<Response> {
  const config = slackConfigFromEnv();
  if (!config) return new Response('slack not configured', { status: 503 });

  const rawBody = await req.text();
  const timestamp = req.headers.get('x-slack-request-timestamp') ?? '';
  const signature = req.headers.get('x-slack-signature') ?? '';

  const valid = verifySlackSignature({
    signingSecret: config.signingSecret,
    timestamp,
    signature,
    rawBody,
  });
  if (!valid) return new Response('invalid signature', { status: 401 });

  const form = new URLSearchParams(rawBody);
  const raw = form.get('payload');
  if (!raw) return new Response('missing payload', { status: 400 });

  let payload: {
    type?: string;
    actions?: Array<{ action_id?: string; value?: string }>;
    user?: { id?: string; name?: string };
    team?: { id?: string };
    response_url?: string;
    message?: { ts?: string };
    channel?: { id?: string };
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response('invalid json', { status: 400 });
  }

  if (payload.type !== 'block_actions') return json({ ok: true, ignored: payload.type });
  const action = payload.actions?.[0];
  if (!action?.action_id?.startsWith('cavalry_') || !action.value) {
    return json({ ok: true, ignored: action?.action_id });
  }

  let actionValue: {
    approvalId: string;
    decision: 'approved' | 'denied';
    stateToken: string;
  };
  try {
    actionValue = JSON.parse(action.value);
  } catch {
    return new Response('invalid action value', { status: 400 });
  }

  // State token proves this payload wasn't forged by replaying an old button.
  // We signed state tokens at post-time via the same signInstallState helper.
  const stateOk = verifyInstallState(actionValue.stateToken);
  if (!stateOk.ok) {
    return new Response(`invalid state: ${stateOk.reason}`, { status: 401 });
  }

  const db = getDb();
  const teamId = payload.team?.id ?? '';
  const [integration] = await db
    .select()
    .from(slackIntegrations)
    .where(
      and(
        eq(slackIntegrations.orgId, stateOk.value.orgId),
        eq(slackIntegrations.teamId, teamId),
      ),
    )
    .limit(1);
  if (!integration) return new Response('unknown slack team', { status: 403 });

  // Look up the approval and apply the decision. We treat Slack clicks as a
  // `system` actor — the decider's slack user id is attached to the audit
  // payload for attribution, but we don't link them to a Cavalry user since
  // there's no guaranteed mapping.
  const [approval] = await db
    .select()
    .from(approvals)
    .where(
      and(
        eq(approvals.id, actionValue.approvalId),
        eq(approvals.orgId, stateOk.value.orgId),
      ),
    )
    .limit(1);
  if (!approval) return new Response('approval not found', { status: 404 });

  if (approval.status !== 'pending') {
    return json({
      ok: false,
      detail: `approval already ${approval.status}`,
    });
  }

  const [updated] = await db
    .update(approvals)
    .set({
      status: actionValue.decision,
      decidedAt: new Date(),
      reason: `Decided via Slack by ${payload.user?.name ?? payload.user?.id ?? 'unknown'}`,
    })
    .where(eq(approvals.id, approval.id))
    .returning();
  if (!updated) return new Response('failed to update approval', { status: 500 });

  await emitAuditEvent({
    orgId: stateOk.value.orgId,
    actor: { type: 'system' },
    action: 'approval.decided',
    resource: { type: 'approval', id: updated.id },
    payload: {
      decision: actionValue.decision,
      via: 'slack',
      slackUserId: payload.user?.id,
      slackUserName: payload.user?.name,
      installId: updated.installId,
    },
  });

  // Best-effort: rewrite the original message so the buttons disappear.
  if (payload.message?.ts && payload.channel?.id) {
    const [install] = await db
      .select({ skillRef: installs.skillRef })
      .from(installs)
      .where(eq(installs.id, updated.installId))
      .limit(1);
    // Resolve the policy that triggered the approval via policy_evaluations —
    // NOT a cross-join on policies, which returns an arbitrary row.
    const [policy] = await db
      .select({ name: policies.name })
      .from(policyEvaluations)
      .innerJoin(policies, eq(policies.id, policyEvaluations.policyId))
      .where(
        and(
          eq(policyEvaluations.installId, approval.installId),
          eq(policyEvaluations.result, 'require_approval'),
        ),
      )
      .limit(1);

    const token = decryptBotToken(integration.botToken);
    const blocks = approvalDecidedBlocks({
      skillRef: install?.skillRef ?? '(unknown skill)',
      policyName: policy?.name ?? '(unknown policy)',
      decision: actionValue.decision,
      deciderEmail: payload.user?.name ?? null,
      reason: null,
    });
    await updateMessage({
      token,
      channel: payload.channel.id,
      ts: payload.message.ts,
      text: `Cavalry approval ${actionValue.decision}`,
      blocks,
    }).catch(() => {
      // Non-fatal — the approval is already decided.
    });
  }

  return json({ ok: true });
}

function decryptBotToken(envelope: string): string {
  if (isEnvelope(envelope)) return decrypt<{ token: string }>(envelope).token;
  try {
    const parsed = JSON.parse(envelope);
    if (typeof parsed === 'object' && parsed && typeof parsed.token === 'string') {
      return parsed.token;
    }
  } catch {
    // fallthrough
  }
  return envelope;
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
