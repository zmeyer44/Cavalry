export const AUDIT_ACTIONS = [
  // org
  'org.created',
  'org.updated',
  // members
  'member.invited',
  'member.joined',
  'member.removed',
  'member.role_updated',
  'invitation.revoked',
  // workspaces
  'workspace.created',
  'workspace.updated',
  'workspace.deleted',
  'workspace.member_added',
  'workspace.member_removed',
  // tokens
  'token.created',
  'token.revoked',
  // registries
  'registry.added',
  'registry.updated',
  'registry.removed',
  'registry.tested',
  'registry.proxy_hit',
  'registry.proxy_miss',
  'registry.fetch_failed',
  // skills
  'skill.published',
  'skill.installed',
  'skill.install_blocked',
  'skill.archived',
  // git integration
  'git_installation.created',
  'git_installation.suspended',
  'git_installation.removed',
  'skill_repo.connected',
  'skill_repo.disconnected',
  'skill_repo.config_updated',
  'skill_repo.sync_started',
  'skill_repo.sync_succeeded',
  'skill_repo.sync_partial',
  'skill_repo.sync_failed',
  'skill_repo.force_push_detected',
  'skill_repo.pr_opened',
  // policy
  'policy.created',
  'policy.updated',
  'policy.deleted',
  // approvals
  'approval.requested',
  'approval.decided',
  // integrations
  'integration.webhook.added',
  'integration.webhook.updated',
  'integration.webhook.removed',
  'integration.webhook.delivery_failed',
  'integration.slack.installed',
  'integration.slack.removed',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
