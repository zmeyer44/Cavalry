import { test, expect } from '../fixtures';
import { getPool } from '../support/db';
import {
  findAuditEvents,
  insertGitInstallation,
  insertSkillRepo,
} from '../support/factories';
import { resetMockGitHub, setMockState } from '../support/mock-github-client';
import {
  buildHappyPathState,
  forcePushTag,
} from '../support/github-fixtures';
import { syncRepo } from '@cavalry/git-sync';
import {
  createGitHubProvider,
  gitHubAppConfigFromEnv,
} from '@cavalry/git-provider';

test.describe('M3.5 git integration · force-push detection', () => {
  test.beforeEach(async () => {
    await resetMockGitHub();
  });

  test('moved tag raises security event and does not re-derive the version', async ({
    authedOrg,
  }) => {
    const { org, userId } = authedOrg;

    const initialState = buildHappyPathState({
      skillBasename: 'kafka-wrapper',
      version: '1.0.0',
      tagCommitSha: 'sha-original-0000000000000000000000000000aa',
    });
    await setMockState(initialState);

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

    // First sync — publishes 1.0.0 at the original commit.
    const first = await syncRepo({
      skillRepoId: repo.id,
      trigger: 'initial',
      provider,
    });
    expect(first.status).toBe('succeeded');

    const pool = getPool();
    const beforeRow = await pool.query<{ source_commit_sha: string }>(
      `SELECT sv.source_commit_sha
         FROM skill_versions sv
         INNER JOIN skills s ON s.id = sv.skill_id
         WHERE s.org_id = $1 AND sv.version = '1.0.0'`,
      [org.id],
    );
    expect(beforeRow.rows[0]?.source_commit_sha).toBe(
      'sha-original-0000000000000000000000000000aa',
    );

    // Force-push: re-point the tag at a NEW commit with different content.
    const pushedState = forcePushTag(
      initialState,
      'acme',
      'platform-skills',
      'kafka-wrapper/v1.0.0',
      'sha-forced-11111111111111111111111111111bb',
      {
        files: [
          { path: 'cavalry.yaml', content: 'version: 1\nskills:\n  - path: "skills/*"\nreleases:\n  tag_pattern: "{skill}/v{version}"\ndefaults:\n  namespace: acme-platform\n' },
          {
            path: 'skills/kafka-wrapper/skill.json',
            content: JSON.stringify({
              name: 'kafka-wrapper',
              namespace: 'acme-platform',
              version: '1.0.0',
              description: 'tampered',
              targets: ['claude-code'],
              entrypoints: { skill: 'SKILL.md' },
            }),
          },
          {
            path: 'skills/kafka-wrapper/SKILL.md',
            content: '# tampered\n',
          },
        ],
      },
    );
    await setMockState(pushedState);

    // Re-sync — should NOT create a new version, should emit force-push audit.
    const second = await syncRepo({
      skillRepoId: repo.id,
      trigger: 'webhook',
      provider,
    });
    expect(second.status).toBe('partial');
    expect(second.versionsPublished).toBe(0);

    // Version still references the ORIGINAL sha.
    const afterRow = await pool.query<{
      source_commit_sha: string;
      count: string;
    }>(
      `SELECT sv.source_commit_sha, COUNT(*) OVER () AS count
         FROM skill_versions sv
         INNER JOIN skills s ON s.id = sv.skill_id
         WHERE s.org_id = $1 AND sv.version = '1.0.0'`,
      [org.id],
    );
    expect(afterRow.rows).toHaveLength(1);
    expect(afterRow.rows[0]?.source_commit_sha).toBe(
      'sha-original-0000000000000000000000000000aa',
    );

    // Repo sync_status is now degraded.
    const repoRows = await pool.query<{ sync_status: string }>(
      `SELECT sync_status FROM skill_repos WHERE id = $1`,
      [repo.id],
    );
    expect(repoRows.rows[0]?.sync_status).toBe('degraded');

    // Audit log contains the security event.
    const fp = await findAuditEvents({
      orgId: org.id,
      action: 'skill_repo.force_push_detected',
    });
    expect(fp).toHaveLength(1);
    expect(fp[0]?.payload).toMatchObject({
      tag: 'kafka-wrapper/v1.0.0',
      previousSha: 'sha-original-0000000000000000000000000000aa',
      currentSha: 'sha-forced-11111111111111111111111111111bb',
    });
  });
});
