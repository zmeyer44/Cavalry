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
  // registries (later milestones, declared here so emissions compile uniformly)
  'registry.added',
  'registry.updated',
  'registry.removed',
  // skills
  'skill.published',
  'skill.installed',
  'skill.install_blocked',
  // policy
  'policy.created',
  'policy.updated',
  'policy.deleted',
  // approvals
  'approval.requested',
  'approval.decided',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
