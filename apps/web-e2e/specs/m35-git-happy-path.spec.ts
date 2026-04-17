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

test.describe('M3.5 git integration · happy path', () => {
  test.beforeEach(async () => {
    await resetMockGitHub();
  });

  test('sync materializes a tagged skill version with audit + storage', async ({
    authedOrg,
  }) => {
    const { org, userId } = authedOrg;

    // Seed the mock repo.
    await setMockState(buildHappyPathState());

    // Seed a git_installation + skill_repo matching the mock.
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

    // Run the sync engine directly (the worker is not running in e2e).
    const appConfig = gitHubAppConfigFromEnv();
    if (!appConfig) throw new Error('GitHub App env must be configured in e2e');
    const provider = createGitHubProvider(appConfig);

    const result = await syncRepo({
      skillRepoId: repo.id,
      trigger: 'initial',
      provider,
    });

    expect(result.status).toBe('succeeded');
    expect(result.versionsPublished).toBe(1);
    expect(result.errors).toHaveLength(0);

    // skill + skill_version rows exist.
    const pool = getPool();
    const skillRows = await pool.query<{
      id: string;
      namespace: string;
      name: string;
      source: string;
      status: string;
      skill_repo_id: string | null;
    }>(
      `SELECT id, namespace, name, source, status, skill_repo_id
       FROM skills
       WHERE org_id = $1`,
      [org.id],
    );
    expect(skillRows.rows).toHaveLength(1);
    expect(skillRows.rows[0]).toMatchObject({
      namespace: 'acme-platform',
      name: 'kafka-wrapper',
      source: 'git',
      status: 'active',
      skill_repo_id: repo.id,
    });

    const versionRows = await pool.query<{
      version: string;
      source_kind: string;
      source_ref: string;
      source_commit_sha: string;
      artifact_size_bytes: string | number;
    }>(
      `SELECT version, source_kind, source_ref, source_commit_sha, artifact_size_bytes
       FROM skill_versions
       WHERE skill_id = $1`,
      [skillRows.rows[0]!.id],
    );
    expect(versionRows.rows).toHaveLength(1);
    expect(versionRows.rows[0]).toMatchObject({
      version: '1.0.0',
      source_kind: 'git_tag',
      source_ref: 'kafka-wrapper/v1.0.0',
    });
    expect(Number(versionRows.rows[0]!.artifact_size_bytes)).toBeGreaterThan(0);

    // Repo transitions to healthy + last_successful_sync_at set.
    const repoRows = await pool.query<{
      sync_status: string;
      last_successful_sync_at: Date | null;
      config_commit_sha: string | null;
    }>(
      `SELECT sync_status, last_successful_sync_at, config_commit_sha
       FROM skill_repos
       WHERE id = $1`,
      [repo.id],
    );
    expect(repoRows.rows[0]?.sync_status).toBe('healthy');
    expect(repoRows.rows[0]?.last_successful_sync_at).toBeTruthy();
    expect(repoRows.rows[0]?.config_commit_sha).toBeTruthy();

    // Audit trail: sync_started, sync_succeeded, config_updated, skill.published.
    const audits = await findAuditEvents({ orgId: org.id });
    const actions = audits.map((a) => a.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        'skill_repo.sync_started',
        'skill_repo.sync_succeeded',
        'skill_repo.config_updated',
        'skill.published',
      ]),
    );
  });
});
