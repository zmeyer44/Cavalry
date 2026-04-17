import { createHash } from 'node:crypto';
import { test, expect } from '../fixtures';
import { getPool } from '../support/db';
import { buildArtifact, fetchArtifact, publishArtifact } from '../helpers/gateway';
import type { SkillManifest } from '@cavalry/skill-format';

test.describe('M2.5 smoke', () => {
  test('landing → signup → org → skills page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/cavalry/i);

    await page.goto('/signup');

    const suffix = Math.random().toString(36).slice(2, 8);
    const email = `smoke-${suffix}@cavalry.test`;
    const password = 'smoke-password-123';
    const orgName = `Smoke Org ${suffix}`;
    const orgSlug = `smoke-${suffix}`;

    await page.getByLabel('Your name').fill(`Smoke User ${suffix}`);
    await page.getByLabel('Work email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: /continue/i }).click();

    await page.getByLabel('Organization name').fill(orgName);
    await page.getByLabel('Slug').fill(orgSlug);
    await page
      .getByRole('button', { name: /create organization/i })
      .click();

    // Signup now lands on the onboarding wizard. Jump directly to the
    // dashboard to exercise the rest of the journey.
    await page.waitForURL(`**/${orgSlug}/onboarding`, { timeout: 30_000 });
    await page.goto(`/${orgSlug}`);
    await expect(
      page.getByRole('link', { name: /skills/i }).first(),
    ).toBeVisible();

    // Skill inventory page is reachable and empty.
    await page.goto(`/${orgSlug}/skills`);
    await expect(page.getByText(/no skills/i)).toBeVisible();
  });

  test('orgWithToken fixture: publish + install via gateway writes DB rows', async ({
    orgWithToken,
  }) => {
    const { org, token, userId } = orgWithToken;

    const manifest: SkillManifest = {
      name: 'hello',
      namespace: 'smoke',
      version: '0.1.0',
      description: 'smoke test skill',
      targets: ['generic'],
      entrypoints: { skill: 'SKILL.md' },
    };

    const { buffer } = await buildArtifact({ manifest });
    const expectedHash = createHash('sha256').update(buffer).digest('hex');

    const published = await publishArtifact({
      token: token.token,
      manifest,
      artifact: buffer,
    });

    expect(published.namespace).toBe(manifest.namespace);
    expect(published.name).toBe(manifest.name);
    expect(published.version).toBe(manifest.version);
    expect(published.artifactHash).toBe(expectedHash);
    expect(published.artifactSizeBytes).toBe(buffer.length);

    const installed = await fetchArtifact({
      token: token.token,
      namespace: manifest.namespace,
      name: manifest.name,
      version: manifest.version,
    });
    expect(installed.hash).toBe(expectedHash);
    expect(installed.body.length).toBe(buffer.length);
    expect(installed.ref).toBe('smoke/hello@0.1.0');

    // Audit events were emitted on the gateway side.
    // The install write is fire-and-forget, so poll briefly.
    const pool = getPool();
    await expect
      .poll(
        async () => {
          const { rows } = await pool.query<{ action: string; count: string }>(
            `SELECT action, count(*)::text FROM audit_events
             WHERE org_id = $1 GROUP BY action ORDER BY action`,
            [org.id],
          );
          return Object.fromEntries(
            rows.map((r: { action: string; count: string }) => [
              r.action,
              Number(r.count),
            ]),
          );
        },
        { timeout: 10_000, intervals: [200, 500, 1000] },
      )
      .toMatchObject({
        'skill.installed': 1,
        'skill.published': 1,
      });

    // Install rows written and attributed to the token's user.
    const { rows: installRows } = await pool.query<{
      result: string;
      user_id: string | null;
      skill_ref: string;
    }>(
      `SELECT result, user_id, skill_ref FROM installs
       WHERE org_id = $1`,
      [org.id],
    );
    expect(installRows).toHaveLength(1);
    expect(installRows[0]?.result).toBe('allowed');
    expect(installRows[0]?.user_id).toBe(userId);
    expect(installRows[0]?.skill_ref).toBe('smoke/hello@0.1.0');
  });

  test('gateway rejects missing bearer token', async () => {
    const res = await fetch(
      `${process.env.CAVALRY_GATEWAY_URL ?? 'http://localhost:3001'}/v1/skills/x/y`,
    );
    expect(res.status).toBe(401);
  });
});
