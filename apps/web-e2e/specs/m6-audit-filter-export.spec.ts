import { test, expect } from '../fixtures';
import { createId } from '@paralleldrive/cuid2';
import { getPool } from '../support/db';

async function seedEvents(
  orgId: string,
  userId: string,
  events: Array<{ action: string; resourceType: string; resourceId: string }>,
): Promise<void> {
  const pool = getPool();
  for (const e of events) {
    await pool.query(
      `INSERT INTO audit_events (id, org_id, actor_type, actor_id, action, resource_type, resource_id, payload)
       VALUES ($1, $2, 'user', $3, $4, $5, $6, '{}'::jsonb)`,
      [createId(), orgId, userId, e.action, e.resourceType, e.resourceId],
    );
  }
}

test.describe('M6 audit filter + CSV export (user journey: security investigates)', () => {
  test('filters narrow the result set; CSV export downloads matching rows', async ({
    authedOrg,
  }) => {
    const { org, userId, page } = authedOrg;

    await seedEvents(org.id, userId, [
      { action: 'skill.installed', resourceType: 'skill_version', resourceId: 'sv_1' },
      { action: 'skill.installed', resourceType: 'skill_version', resourceId: 'sv_2' },
      { action: 'skill.install_blocked', resourceType: 'install', resourceId: 'ins_1' },
      { action: 'policy.created', resourceType: 'policy', resourceId: 'pol_1' },
      { action: 'registry.added', resourceType: 'registry', resourceId: 'reg_1' },
    ]);

    await page.goto(`/${org.slug}/audit`);

    // All 5 events visible initially.
    await expect(page.locator('[data-testid^="audit-row-"]')).toHaveCount(5);

    // Open filters panel.
    await page.getByTestId('audit-toggle-filters').click();
    await expect(page.getByTestId('audit-filters-panel')).toBeVisible();

    // Filter by action = skill.*
    await page.getByTestId('audit-filter-action').fill('skill.*');
    await expect(page.locator('[data-testid^="audit-row-"]')).toHaveCount(3);
    await expect(page.locator('[data-testid="audit-row-policy.created"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="audit-row-registry.added"]')).toHaveCount(0);

    // Download CSV with the filter applied.
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('audit-export-csv').click(),
    ]);
    const path = await download.path();
    expect(path).toBeTruthy();
    const { readFile } = await import('node:fs/promises');
    const csv = await readFile(path!, 'utf8');
    const lines = csv.trim().split('\n');
    // Header + 3 filtered rows.
    expect(lines).toHaveLength(4);
    expect(lines[0]).toContain('timestamp');
    expect(lines[0]).toContain('action');
    // All data rows start with an ISO timestamp.
    for (const line of lines.slice(1)) {
      expect(line).toMatch(/\d{4}-\d{2}-\d{2}T/);
    }
    // CSV does not contain the policy.created or registry.added rows.
    expect(csv).not.toContain('policy.created');
    expect(csv).not.toContain('registry.added');
  });
});
