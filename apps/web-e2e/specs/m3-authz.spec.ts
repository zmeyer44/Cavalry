import { test, expect } from '../fixtures';
import { getPool } from '../support/db';
import { insertApiToken, insertRegistry } from '../support/factories';
import { MockUpstream, makeDemoSkill } from '../support/mock-upstream';

test.describe('M3 authz', () => {
  test('non-admin member cannot create a registry via tRPC', async ({ orgWithToken }) => {
    const { org, userId, page } = orgWithToken;
    const pool = getPool();
    await pool.query(
      `UPDATE memberships SET role = 'member' WHERE user_id = $1 AND org_id = $2`,
      [userId, org.id],
    );
    const res = await page.request.post('/api/trpc/registry.create?batch=1', {
      data: {
        '0': {
          json: {
            name: 'denied',
            type: 'http',
            url: 'https://example.com',
            enabled: true,
          },
        },
      },
      headers: { 'x-cavalry-org': org.slug, 'content-type': 'application/json' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('proxy artifact rejects token without skills:install scope', async ({ orgWithToken }) => {
    const upstream = new MockUpstream([makeDemoSkill()]);
    const { url } = await upstream.start();
    try {
      const { org, userId } = orgWithToken;
      await insertRegistry({ orgId: org.id, name: 'r', type: 'tessl', url });
      // Token with read-only scope.
      const readonly = await insertApiToken({
        orgId: org.id,
        userId,
        name: 'readonly',
        scopes: ['skills:read'],
      });
      const res = await fetch(
        `${process.env.CAVALRY_GATEWAY_URL}/v1/proxy/r/demo/hello/1.0.0/artifact`,
        { headers: { authorization: `Bearer ${readonly.token}` } },
      );
      expect(res.status).toBe(403);
    } finally {
      await upstream.stop();
    }
  });

  test('proxy artifact rejects bearer-less requests', async () => {
    const res = await fetch(
      `${process.env.CAVALRY_GATEWAY_URL}/v1/proxy/r/demo/hello/1.0.0/artifact`,
    );
    expect(res.status).toBe(401);
  });
});
