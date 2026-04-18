import { test, expect } from '../fixtures';
import { getPool } from '../support/db';
import {
  findAuditEvents,
  insertGitInstallation,
  insertSkillRepo,
} from '../support/factories';
import { resetMockGitHub, setMockState } from '../support/mock-github-client';
import { buildInvalidYamlState } from '../support/github-fixtures';
import { syncRepo } from '@cavalry/git-sync';
import {
  createGitHubProvider,
  gitHubAppConfigFromEnv,
} from '@cavalry/git-provider';

test.describe('M3.5 git integration · invalid cavalry.yaml', () => {
  test.beforeEach(async () => {
    await resetMockGitHub();
  });

  test('sync fails cleanly without producing any skill_version rows', async ({
    authedOrg,
  }) => {
    const { org, userId } = authedOrg;

    await setMockState(buildInvalidYamlState());

    const inst = await insertGitInstallation({
      orgId: org.id,
      userId,
      externalId: '43',
      accountLogin: 'acme',
    });
    const repo = await insertSkillRepo({
      orgId: org.id,
      gitInstallationId: inst.id,
      owner: 'acme',
      repo: 'broken-skills',
    });

    const appConfig = gitHubAppConfigFromEnv();
    if (!appConfig) throw new Error('missing github app env');
    const provider = createGitHubProvider(appConfig);

    const result = await syncRepo({
      skillRepoId: repo.id,
      trigger: 'initial',
      provider,
    });

    expect(result.status).toBe('failed');
    expect(result.versionsPublished).toBe(0);

    const pool = getPool();
    const skillCount = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM skills WHERE org_id = $1`,
      [org.id],
    );
    expect(Number(skillCount.rows[0]?.count ?? '0')).toBe(0);

    const repoRows = await pool.query<{
      sync_status: string;
      last_sync_error: string | null;
    }>(
      `SELECT sync_status, last_sync_error FROM skill_repos WHERE id = $1`,
      [repo.id],
    );
    expect(repoRows.rows[0]?.sync_status).toBe('failed');
    expect(repoRows.rows[0]?.last_sync_error).toBeTruthy();

    const failures = await findAuditEvents({
      orgId: org.id,
      action: 'skill_repo.sync_failed',
    });
    expect(failures).toHaveLength(1);
  });
});
