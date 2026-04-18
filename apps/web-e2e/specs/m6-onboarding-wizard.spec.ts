import { test, expect } from '../fixtures';
import { getPool } from '../support/db';

test.describe('M6 onboarding wizard (user journey: platform engineer deploys)', () => {
  test('steps through policy → registry → invites and marks org done', async ({
    authedOrg,
  }) => {
    const { org, page } = authedOrg;

    await page.goto(`/${org.slug}/onboarding`);

    // Step 1 — policy. Default selection is "approve-upstream"; click Continue.
    await expect(page.getByTestId('onboarding-step-policy')).toBeVisible();
    await page.getByTestId('onboarding-next-policy').click();

    // Step 2 — registry. Skip it.
    await expect(page.getByTestId('onboarding-step-registry')).toBeVisible();
    await page.getByTestId('onboarding-skip-registry').click();

    // Step 3 — invites. Skip and finish.
    await expect(page.getByTestId('onboarding-step-invites')).toBeVisible();
    await page.getByTestId('onboarding-skip-invites').click();

    // Wizard finishes — DB side-effects are async w.r.t. the UI navigation,
    // so poll for them rather than asserting synchronously.
    const pool = getPool();

    await expect
      .poll(
        async () => {
          const r = await pool.query<{ name: string; type: string }>(
            `SELECT name, type FROM policies WHERE org_id = $1`,
            [org.id],
          );
          return r.rows.length;
        },
        { timeout: 5_000 },
      )
      .toBe(1);

    await expect
      .poll(
        async () => {
          const r = await pool.query<{ settings: Record<string, unknown> }>(
            `SELECT settings FROM organizations WHERE id = $1`,
            [org.id],
          );
          return Boolean(
            (r.rows[0]?.settings as { onboardingCompletedAt?: string } | undefined)
              ?.onboardingCompletedAt,
          );
        },
        { timeout: 10_000 },
      )
      .toBe(true);
  });
});
