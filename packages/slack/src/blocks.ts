/**
 * Block Kit builders for Cavalry's approval messages. Keeping these pure +
 * well-typed lets us round-trip them in tests without hitting Slack.
 */

export interface ApprovalMessageContext {
  approvalId: string;
  skillRef: string;
  policyName: string;
  reason: string;
  requesterEmail: string | null;
  orgSlug: string;
  webUrl: string;
  /** Optional token echoed back by Slack to validate the payload source. */
  stateToken: string;
}

export function approvalRequestBlocks(ctx: ApprovalMessageContext): unknown[] {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: [
          `*Install approval required*`,
          `\`${ctx.skillRef}\` is gated by policy *${ctx.policyName}*.`,
          ctx.requesterEmail ? `_Requested by_ ${ctx.requesterEmail}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      },
    },
    {
      type: 'actions',
      block_id: `cavalry-approval-${ctx.approvalId}`,
      elements: [
        {
          type: 'button',
          action_id: 'cavalry_approve',
          text: { type: 'plain_text', text: 'Approve' },
          style: 'primary',
          value: JSON.stringify({
            approvalId: ctx.approvalId,
            decision: 'approved',
            stateToken: ctx.stateToken,
          }),
        },
        {
          type: 'button',
          action_id: 'cavalry_deny',
          text: { type: 'plain_text', text: 'Deny' },
          style: 'danger',
          value: JSON.stringify({
            approvalId: ctx.approvalId,
            decision: 'denied',
            stateToken: ctx.stateToken,
          }),
        },
        {
          type: 'button',
          action_id: 'cavalry_open',
          text: { type: 'plain_text', text: 'Review in Cavalry' },
          url: `${ctx.webUrl}/${ctx.orgSlug}/approvals`,
        },
      ],
    },
  ];
}

export function approvalDecidedBlocks(params: {
  skillRef: string;
  policyName: string;
  decision: 'approved' | 'denied';
  deciderEmail: string | null;
  reason: string | null;
}): unknown[] {
  const verb = params.decision === 'approved' ? '✅ Approved' : '🚫 Denied';
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: [
          `*${verb}*: \`${params.skillRef}\` · policy *${params.policyName}*`,
          params.deciderEmail ? `_by_ ${params.deciderEmail}` : '',
          params.reason ? `_reason:_ ${params.reason}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      },
    },
  ];
}
