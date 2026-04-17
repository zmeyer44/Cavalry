import { describe, expect, it, vi } from 'vitest';
import { emitAuditEvent } from './emit';

function createFakeTx() {
  const inserted: Array<{ table: unknown; values: Record<string, unknown> }> = [];
  const tx = {
    insert(table: unknown) {
      return {
        values(values: Record<string, unknown>) {
          inserted.push({ table, values });
          return Promise.resolve();
        },
      };
    },
  } as const;
  return { tx: tx as unknown as Parameters<typeof emitAuditEvent>[0]['tx'], inserted };
}

describe('emitAuditEvent', () => {
  it('writes a row with normalized actor fields (user)', async () => {
    const { tx, inserted } = createFakeTx();
    await emitAuditEvent({
      orgId: 'org_1',
      actor: { type: 'user', userId: 'u_1' },
      action: 'workspace.created',
      resource: { type: 'workspace', id: 'ws_1' },
      payload: { name: 'Platform' },
      request: { ip: '127.0.0.1', userAgent: 'curl/8' },
      tx,
    });
    expect(inserted).toHaveLength(1);
    const first = inserted[0];
    expect(first).toBeDefined();
    expect(first?.values).toMatchObject({
      orgId: 'org_1',
      actorType: 'user',
      actorId: 'u_1',
      action: 'workspace.created',
      resourceType: 'workspace',
      resourceId: 'ws_1',
      payload: { name: 'Platform' },
      ipAddress: '127.0.0.1',
      userAgent: 'curl/8',
    });
  });

  it('maps token actor to actorId = tokenId', async () => {
    const { tx, inserted } = createFakeTx();
    await emitAuditEvent({
      orgId: 'org_1',
      actor: { type: 'token', tokenId: 't_abc' },
      action: 'skill.installed',
      resource: { type: 'skill', id: 'sk_1' },
      tx,
    });
    expect(inserted[0]?.values).toMatchObject({
      actorType: 'token',
      actorId: 't_abc',
    });
  });

  it('system actor has null actorId', async () => {
    const { tx, inserted } = createFakeTx();
    await emitAuditEvent({
      orgId: 'org_1',
      actor: { type: 'system' },
      action: 'approval.decided',
      resource: { type: 'approval', id: 'ap_1' },
      tx,
    });
    expect(inserted[0]?.values).toMatchObject({ actorType: 'system', actorId: null });
  });

  it('defaults payload to empty object', async () => {
    const { tx, inserted } = createFakeTx();
    await emitAuditEvent({
      orgId: 'org_1',
      actor: { type: 'system' },
      action: 'policy.created',
      resource: { type: 'policy', id: 'p_1' },
      tx,
    });
    expect(inserted[0]?.values.payload).toEqual({});
  });

  it('falls back to getDb() when no tx is provided (no crash for missing DB connection)', async () => {
    const mod = await import('@cavalry/database');
    const fakeDb = {
      insert: vi.fn(() => ({ values: vi.fn(() => Promise.resolve()) })),
    };
    const spy = vi.spyOn(mod, 'getDb').mockReturnValue(fakeDb as unknown as ReturnType<typeof mod.getDb>);
    try {
      await emitAuditEvent({
        orgId: 'org_1',
        actor: { type: 'system' },
        action: 'org.created',
        resource: { type: 'organization', id: 'org_1' },
      });
      expect(fakeDb.insert).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  });
});
