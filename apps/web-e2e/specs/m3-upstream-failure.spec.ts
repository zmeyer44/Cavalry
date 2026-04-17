import { test, expect } from '../fixtures';
import { getPool } from '../support/db';
import { insertRegistry } from '../support/factories';
import { MockUpstream, makeDemoSkill } from '../support/mock-upstream';

test.describe('M3 upstream failure', () => {
  test('500 from upstream returns 502 + audit registry.fetch_failed; no skill row created', async ({
    orgWithToken,
  }) => {
    const upstream = new MockUpstream([makeDemoSkill()], { artifactStatus: 500, artifactBody: 'boom' });
    const { url } = await upstream.start();
    try {
      const { org, token } = orgWithToken;
      await insertRegistry({
        orgId: org.id,
        name: 'flaky',
        type: 'tessl',
        url,
      });

      const proxyUrl = `${process.env.CAVALRY_GATEWAY_URL}/v1/proxy/flaky/demo/hello/1.0.0/artifact`;
      const res = await fetch(proxyUrl, {
        headers: { authorization: `Bearer ${token.token}`, 'user-agent': 'e2e' },
      });
      expect(res.status).toBe(502);

      // Audit row exists, no skill_versions row inserted.
      const pool = getPool();
      await expect
        .poll(async () => {
          const { rows } = await pool.query<{ count: string }>(
            `SELECT count(*)::text FROM audit_events
             WHERE org_id = $1 AND action = 'registry.fetch_failed'`,
            [org.id],
          );
          return Number(rows[0]?.count ?? 0);
        })
        .toBeGreaterThanOrEqual(1);

      const { rows: skillRows } = await pool.query<{ count: string }>(
        `SELECT count(*)::text FROM skills WHERE org_id = $1`,
        [org.id],
      );
      expect(Number(skillRows[0]?.count)).toBe(0);

      const { rows: versionRows } = await pool.query<{ count: string }>(
        `SELECT count(*)::text FROM skill_versions
         WHERE skill_id IN (SELECT id FROM skills WHERE org_id = $1)`,
        [org.id],
      );
      expect(Number(versionRows[0]?.count)).toBe(0);
    } finally {
      await upstream.stop();
    }
  });

  test('upstream 404 surfaces as 404', async ({ orgWithToken }) => {
    const upstream = new MockUpstream([]);
    const { url } = await upstream.start();
    try {
      const { org, token } = orgWithToken;
      await insertRegistry({
        orgId: org.id,
        name: 'empty',
        type: 'tessl',
        url,
      });
      const res = await fetch(
        `${process.env.CAVALRY_GATEWAY_URL}/v1/proxy/empty/missing/skill/1.0.0/artifact`,
        { headers: { authorization: `Bearer ${token.token}`, 'user-agent': 'e2e' } },
      );
      expect(res.status).toBe(404);
    } finally {
      await upstream.stop();
    }
  });

  test('unknown registry returns 404', async ({ orgWithToken }) => {
    const { token } = orgWithToken;
    const res = await fetch(
      `${process.env.CAVALRY_GATEWAY_URL}/v1/proxy/nope/x/y/1.0.0/artifact`,
      { headers: { authorization: `Bearer ${token.token}` } },
    );
    expect(res.status).toBe(404);
  });
});
