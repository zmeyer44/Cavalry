import { test, expect } from '../fixtures';
import { getPool } from '../support/db';
import {
  findAuditEvents,
  insertGitInstallation,
  insertSkillRepo,
} from '../support/factories';
import { resetMockGitHub, setMockState } from '../support/mock-github-client';
import { buildHappyPathState } from '../support/github-fixtures';
import { syncRepo } from '@cavalry/git-sync';
import {
  createGitHubProvider,
  gitHubAppConfigFromEnv,
} from '@cavalry/git-provider';

test.describe('M3.5 git integration · disconnect', () => {
  test.beforeEach(async () => {
    await resetMockGitHub();
  });

  test('archives skills but preserves versions for audit continuity', async ({
    authedOrg,
  }) => {
    const { org, userId } = authedOrg;

    await setMockState(buildHappyPathState());
    const inst = await insertGitInstallation({
      orgId: org.id,
      userId,
      externalId: '42',
      accountLogin: 'acme',
    });
    const repo = await insertSkillRepo({
      orgId: org.id,
      gitInstallationId: inst.id,
      owner: 'acme',
      repo: 'platform-skills',
    });

    const appConfig = gitHubAppConfigFromEnv();
    if (!appConfig) throw new Error('missing github app env');
    const provider = createGitHubProvider(appConfig);

    const result = await syncRepo({
      skillRepoId: repo.id,
      trigger: 'initial',
      provider,
    });
    expect(result.status).toBe('succeeded');

    // Drive disconnect through the UI so the tRPC router + audit events exercise.
    const { page } = authedOrg;
    await page.goto(`/${org.slug}/skill-repos/${repo.id}`);
    await expect(page.getByText(/acme/).first()).toBeVisible();
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: /disconnect/i }).click();

    // Wait for the toast + list refresh.
    await expect(page.getByText(/disconnected/i).first()).toBeVisible({ timeout: 5000 });

    const pool = getPool();
    const skill = await pool.query<{ status: string }>(
      `SELECT status FROM skills WHERE org_id = $1`,
      [org.id],
    );
    expect(skill.rows[0]?.status).toBe('archived');

    // Versions remain installable (row still present).
    const versionCount = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
         FROM skill_versions sv
         INNER JOIN skills s ON s.id = sv.skill_id
         WHERE s.org_id = $1`,
      [org.id],
    );
    expect(Number(versionCount.rows[0]?.count ?? '0')).toBe(1);

    // skill_repo.enabled flipped false.
    const repoRow = await pool.query<{ enabled: boolean }>(
      `SELECT enabled FROM skill_repos WHERE id = $1`,
      [repo.id],
    );
    expect(repoRow.rows[0]?.enabled).toBe(false);

    const disconnectEvents = await findAuditEvents({
      orgId: org.id,
      action: 'skill_repo.disconnected',
    });
    expect(disconnectEvents).toHaveLength(1);
  });
});
