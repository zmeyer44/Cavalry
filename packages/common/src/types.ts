export const ORG_ROLES = ['owner', 'admin', 'author', 'member'] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const WORKSPACE_ROLES = ['admin', 'member'] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const REGISTRY_TYPES = ['tessl', 'github', 'http', 'mcp'] as const;
export type RegistryType = (typeof REGISTRY_TYPES)[number];

export const SKILL_VISIBILITY = ['private', 'workspace'] as const;
export type SkillVisibility = (typeof SKILL_VISIBILITY)[number];

export const SKILL_SOURCES = ['internal', 'tessl', 'github', 'http'] as const;
export type SkillSource = (typeof SKILL_SOURCES)[number];

export const POLICY_TYPES = [
  'allowlist',
  'blocklist',
  'version_pin',
  'require_approval',
  'custom',
] as const;
export type PolicyType = (typeof POLICY_TYPES)[number];

export const POLICY_SCOPES = ['org', 'workspace'] as const;
export type PolicyScope = (typeof POLICY_SCOPES)[number];

export const INSTALL_RESULTS = ['allowed', 'blocked', 'pending_approval'] as const;
export type InstallResult = (typeof INSTALL_RESULTS)[number];

export const APPROVAL_STATUSES = ['pending', 'approved', 'denied', 'expired'] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const AUDIT_ACTOR_TYPES = ['user', 'token', 'system'] as const;
export type AuditActorType = (typeof AUDIT_ACTOR_TYPES)[number];

export type PaginatedResult<T> = {
  items: T[];
  nextCursor: string | null;
};
