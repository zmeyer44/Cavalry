import { describe, expect, it } from 'vitest';
import {
  canManageOrg,
  canAuthorSkills,
  canRemoveMember,
  canChangeMemberRole,
} from './authz';

describe('canManageOrg', () => {
  it('grants owner + admin, denies author + member', () => {
    expect(canManageOrg('owner')).toBe(true);
    expect(canManageOrg('admin')).toBe(true);
    expect(canManageOrg('author')).toBe(false);
    expect(canManageOrg('member')).toBe(false);
  });
});

describe('canAuthorSkills', () => {
  it('grants owner/admin/author, denies member', () => {
    expect(canAuthorSkills('owner')).toBe(true);
    expect(canAuthorSkills('admin')).toBe(true);
    expect(canAuthorSkills('author')).toBe(true);
    expect(canAuthorSkills('member')).toBe(false);
  });
});

describe('canRemoveMember', () => {
  it('admin can remove non-owners', () => {
    expect(canRemoveMember('admin', 'member')).toBe(true);
    expect(canRemoveMember('admin', 'author')).toBe(true);
    expect(canRemoveMember('admin', 'admin')).toBe(true);
  });
  it('cannot remove owner', () => {
    expect(canRemoveMember('admin', 'owner')).toBe(false);
    expect(canRemoveMember('owner', 'owner')).toBe(false);
  });
  it('member cannot remove anyone', () => {
    expect(canRemoveMember('member', 'member')).toBe(false);
  });
});

describe('canChangeMemberRole', () => {
  it('only owner can promote to owner', () => {
    expect(canChangeMemberRole('admin', 'member', 'owner')).toBe(false);
    expect(canChangeMemberRole('owner', 'member', 'owner')).toBe(true);
  });
  it('admin can change non-owner roles', () => {
    expect(canChangeMemberRole('admin', 'member', 'admin')).toBe(true);
    expect(canChangeMemberRole('admin', 'author', 'member')).toBe(true);
  });
  it('cannot change owner role', () => {
    expect(canChangeMemberRole('admin', 'owner', 'admin')).toBe(false);
    expect(canChangeMemberRole('owner', 'owner', 'admin')).toBe(false);
  });
  it('member cannot change roles', () => {
    expect(canChangeMemberRole('member', 'member', 'admin')).toBe(false);
  });
});
