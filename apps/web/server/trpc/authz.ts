import type { OrgRole } from '@cavalry/common';

export function canManageOrg(role: OrgRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canAuthorSkills(role: OrgRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'author';
}

export function canManageToken(role: OrgRole): boolean {
  return canManageOrg(role);
}

export function canRemoveMember(actorRole: OrgRole, targetRole: OrgRole): boolean {
  if (!canManageOrg(actorRole)) return false;
  if (targetRole === 'owner') return false;
  return true;
}

export function canChangeMemberRole(
  actorRole: OrgRole,
  targetRole: OrgRole,
  newRole: OrgRole,
): boolean {
  if (!canManageOrg(actorRole)) return false;
  if (targetRole === 'owner') return false;
  if (newRole === 'owner') return actorRole === 'owner';
  return true;
}
