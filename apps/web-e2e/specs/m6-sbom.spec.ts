import { test, expect } from '../fixtures';
import { getPool } from '../support/db';
import { createId } from '@paralleldrive/cuid2';
import {
  buildArtifact,
  fetchArtifact,
  publishArtifact,
} from '../helpers/gateway';
import type { SkillManifest } from '@cavalry/skill-format';

test.describe('M6 SBOM snapshot', () => {
  test('returns the distinct (skill, version) set installed via a workspace', async ({
    orgWithToken,
  }) => {
    const { org, userId, token } = orgWithToken;

    // Create a workspace so installs can be attributed.
    const pool = getPool();
    const workspaceId = createId();
    await pool.query(
      `INSERT INTO workspaces (id, org_id, name, slug) VALUES ($1, $2, 'core', 'core')`,
      [workspaceId, org.id],
    );
    await pool.query(
      `INSERT INTO workspace_members (id, workspace_id, user_id, role)
       VALUES ($1, $2, $3, 'admin')`,
      [createId(), workspaceId, userId],
    );

    // Publish two skills.
    for (const [ns, name, version] of [
      ['acme', 'alpha', '1.0.0'],
      ['acme', 'beta', '2.3.0'],
    ] as const) {
      const manifest: SkillManifest = {
        name,
        namespace: ns,
        version,
        description: `${ns}/${name}@${version}`,
        targets: ['claude-code'],
        entrypoints: { skill: 'SKILL.md' },
      };
      const { buffer } = await buildArtifact({ manifest });
      await publishArtifact({ token: token.token, manifest, artifact: buffer });
    }

    // Install both skills, attributing to the workspace.
    for (const [ns, name, version] of [
      ['acme', 'alpha', '1.0.0'],
      ['acme', 'beta', '2.3.0'],
    ] as const) {
      await fetchArtifact({
        token: token.token,
        namespace: ns,
        name,
        version,
        headers: { 'x-cavalry-workspace': workspaceId },
      });
    }

    // Install rows are written fire-and-forget by the gateway. Wait for
    // both to land before we snapshot.
    await expect
      .poll(
        async () => {
          const r = await pool.query<{ count: string }>(
            `SELECT COUNT(*)::text AS count FROM installs
             WHERE org_id = $1 AND workspace_id = $2 AND result = 'allowed'`,
            [org.id, workspaceId],
          );
          return Number(r.rows[0]?.count ?? 0);
        },
        { timeout: 5_000 },
      )
      .toBeGreaterThanOrEqual(2);

    // Query SBOM via tRPC over HTTP from the web app.
    const orgSlug = org.slug;
    // Use a simple fetch against the dashboard page server component's
    // embedded session — tests previously opened authedOrg.page which holds a
    // cookie. Reuse it here.
    const { page } = orgWithToken;

    // Click SBOM download on the workspace list.
    await page.goto(`/${orgSlug}/settings/workspaces`);
    await expect(page.getByTestId(`sbom-download-core`)).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId(`sbom-download-core`).click(),
    ]);
    const path = await download.path();
    const { readFile } = await import('node:fs/promises');
    const body = await readFile(path!, 'utf8');
    const sbom = JSON.parse(body) as {
      workspaceId: string;
      items: Array<{ namespace: string; name: string; version: string }>;
    };
    expect(sbom.workspaceId).toBe(workspaceId);
    const pairs = sbom.items.map((i) => `${i.namespace}/${i.name}@${i.version}`);
    expect(pairs.sort()).toEqual(['acme/alpha@1.0.0', 'acme/beta@2.3.0']);
  });
});
