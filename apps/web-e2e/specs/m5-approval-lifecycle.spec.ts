import { test, expect } from '../fixtures';
import { getPool } from '../support/db';
import { findAuditEvents, insertPolicy } from '../support/factories';
import {
  attemptInstall,
  buildArtifact,
  fetchArtifact,
  publishArtifact,
} from '../helpers/gateway';
import type { SkillManifest } from '@cavalry/skill-format';

async function publishVersion(
  token: string,
  namespace: string,
  name: string,
  version: string,
): Promise<void> {
  const manifest: SkillManifest = {
    name,
    namespace,
    version,
    description: `${namespace}/${name}@${version}`,
    targets: ['claude-code'],
    entrypoints: { skill: 'SKILL.md' },
  };
  const { buffer } = await buildArtifact({ manifest });
  await publishArtifact({ token, manifest, artifact: buffer });
}

test.describe('M5 approval lifecycle', () => {
  test('approve path: 202 pending → admin approves → retry succeeds', async ({
    orgWithToken,
  }) => {
    const { org, userId, token } = orgWithToken;
    await publishVersion(token.token, 'gated', 'tool', '1.0.0');
    await insertPolicy({
      orgId: org.id,
      name: 'review-internal',
      type: 'require_approval',
      config: { patterns: ['internal:*'] },
      priority: 10,
    });

    // First attempt → 202 pending.
    const first = await attemptInstall({
      token: token.token,
      namespace: 'gated',
      name: 'tool',
      version: '1.0.0',
    });
    expect(first.status).toBe(202);
    const pendingBody = first.json();
    expect(pendingBody).toMatchObject({
      title: 'approval_required',
      approvalStatus: 'pending',
    });
    const approvalId = String(pendingBody?.approvalId);
    expect(approvalId).toBeTruthy();

    // Approve via DB (simulates admin click).
    const pool = getPool();
    await pool.query(
      `UPDATE approvals SET status = 'approved', decided_by = $1, decided_at = now() WHERE id = $2`,
      [userId, approvalId],
    );

    // Retry → 200, artifact streams.
    const retried = await fetchArtifact({
      token: token.token,
      namespace: 'gated',
      name: 'tool',
      version: '1.0.0',
    });
    expect(retried.body.length).toBeGreaterThan(0);

    // Install row with metadata.approvalId populated. Install insert is
    // fire-and-forget in the gateway, so poll briefly.
    await expect
      .poll(
        async () => {
          const installRows = await pool.query<{
            result: string;
            metadata: { approvalId: string | null };
          }>(
            `SELECT result, metadata FROM installs WHERE org_id = $1 AND result = 'allowed'`,
            [org.id],
          );
          return installRows.rows.some(
            (r) => r.metadata?.approvalId === approvalId,
          );
        },
        { timeout: 5_000, intervals: [100, 300, 500] },
      )
      .toBe(true);

    // approval.requested audit emitted.
    const requested = await findAuditEvents({
      orgId: org.id,
      action: 'approval.requested',
    });
    expect(requested).toHaveLength(1);
  });

  test('deny path: admin denies → retry returns 403 policy-violation', async ({
    orgWithToken,
  }) => {
    const { org, userId, token } = orgWithToken;
    await publishVersion(token.token, 'gated', 'tool', '1.0.0');
    await insertPolicy({
      orgId: org.id,
      name: 'review-internal',
      type: 'require_approval',
      config: { patterns: ['internal:*'] },
      priority: 10,
    });

    const first = await attemptInstall({
      token: token.token,
      namespace: 'gated',
      name: 'tool',
      version: '1.0.0',
    });
    expect(first.status).toBe(202);
    const approvalId = String(first.json()?.approvalId);

    const pool = getPool();
    await pool.query(
      `UPDATE approvals SET status = 'denied', decided_by = $1, decided_at = now(), reason = $2 WHERE id = $3`,
      [userId, 'Too broad a scope', approvalId],
    );

    const retried = await attemptInstall({
      token: token.token,
      namespace: 'gated',
      name: 'tool',
      version: '1.0.0',
    });
    expect(retried.status).toBe(403);
    const body = retried.json();
    expect(body).toMatchObject({
      type: 'https://cavalry.sh/errors/policy-violation',
      decision: 'deny',
    });
    expect(String(body?.detail)).toMatch(/Too broad a scope/);
  });

  test('duplicate attempts while pending reuse the same approval row', async ({
    orgWithToken,
  }) => {
    const { org, token } = orgWithToken;
    await publishVersion(token.token, 'gated', 'tool', '1.0.0');
    await insertPolicy({
      orgId: org.id,
      name: 'review',
      type: 'require_approval',
      config: { patterns: ['internal:*'] },
    });

    const first = await attemptInstall({
      token: token.token,
      namespace: 'gated',
      name: 'tool',
      version: '1.0.0',
    });
    const second = await attemptInstall({
      token: token.token,
      namespace: 'gated',
      name: 'tool',
      version: '1.0.0',
    });
    expect(first.status).toBe(202);
    expect(second.status).toBe(202);
    const firstId = String(first.json()?.approvalId);
    const secondId = String(second.json()?.approvalId);
    expect(firstId).toBe(secondId);

    const pool = getPool();
    const count = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM approvals WHERE org_id = $1`,
      [org.id],
    );
    expect(count.rows[0]?.count).toBe('1');
  });
});
