import { test, expect } from '../fixtures';
import { getPool } from '../support/db';
import { MockUpstream } from '../support/mock-upstream';

test.describe('M3 registry CRUD', () => {
  test('admin can add, edit, test, and delete a registry; audit captures it', async ({
    authedOrg,
  }) => {
    const upstream = new MockUpstream([]);
    const { url } = await upstream.start();
    try {
      const { page, org } = authedOrg;

      await page.goto(`/${org.slug}/registries`);
      await expect(page.getByText(/no registries configured/i)).toBeVisible();

      // Add a registry
      await page.getByRole('button', { name: /add registry/i }).click();
      await page.getByLabel('Name').fill('mockreg');
      await page.getByLabel('URL').fill(url);
      await page.getByRole('button', { name: 'Add' }).click();

      await expect(page.getByText('mockreg')).toBeVisible();
      await expect(page.getByText(url)).toBeVisible();

      // Audit row visible on /audit
      await page.goto(`/${org.slug}/audit`);
      await expect(page.getByText('registry.added').first()).toBeVisible();

      // DB row check
      const pool = getPool();
      const { rows } = await pool.query<{ name: string; type: string; enabled: boolean }>(
        `SELECT name, type, enabled FROM registries WHERE org_id = $1`,
        [org.id],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ name: 'mockreg', type: 'tessl', enabled: true });

      // Test the registry — mock upstream's /healthz returns ok
      await page.goto(`/${org.slug}/registries`);
      await page.getByRole('link', { name: /details/i }).click();
      await page.getByRole('button', { name: /test connection/i }).click();
      await expect(page.getByText(/health check passed/i)).toBeVisible({ timeout: 5000 });

      // Delete via list page
      page.once('dialog', (d) => d.accept());
      await page.goto(`/${org.slug}/registries`);
      await page.getByRole('button', { name: /remove mockreg/i }).click();
      await expect(page.getByText(/no registries configured/i)).toBeVisible();

      // Audit log shows added/tested/removed
      await page.goto(`/${org.slug}/audit`);
      await expect(page.getByText('registry.added').first()).toBeVisible();
      await expect(page.getByText('registry.tested').first()).toBeVisible();
      await expect(page.getByText('registry.removed').first()).toBeVisible();
    } finally {
      await upstream.stop();
    }
  });

  test('non-admin gets denied creating a registry', async ({ orgWithToken }) => {
    // orgWithToken's user is the owner; demote via DB to "member" to simulate non-admin.
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
            type: 'tessl',
            url: 'https://example.com',
            enabled: true,
          },
        },
      },
      headers: { 'x-cavalry-org': org.slug, 'content-type': 'application/json' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    const body = await res.text();
    expect(body.toLowerCase()).toMatch(/admin|forbidden/);
  });
});
