import { test, expect } from '../fixtures';
import { getPool } from '../support/db';
import {
  findAuditEvents,
  insertPolicy,
} from '../support/factories';
import {
  attemptInstall,
  buildArtifact,
  fetchArtifact,
  publishArtifact,
} from '../helpers/gateway';
import type { SkillManifest } from '@cavalry/skill-format';

test.describe('M4 policy · blocklist', () => {
  test('blocks internal install with RFC 7807 problem+json + populates policy_evaluations', async ({
    orgWithToken,
  }) => {
    const { org, token } = orgWithToken;

    // Publish a skill first so there's something to (try to) install.
    const manifest: SkillManifest = {
      name: 'test-skill',
      namespace: 'acme',
      version: '1.0.0',
      description: 'policy test skill',
      targets: ['claude-code'],
      entrypoints: { skill: 'SKILL.md' },
    };
    const artifact = await buildArtifact({ manifest });
    await publishArtifact({ token: token.token, manifest, artifact: artifact.buffer });

    // Sanity: no policy means install is allowed.
    const allowed = await fetchArtifact({
      token: token.token,
      namespace: manifest.namespace,
      name: manifest.name,
      version: manifest.version,
    });
    expect(allowed.body.length).toBe(artifact.buffer.length);

    // Add a blocklist pinned to internal:acme/* and retry.
    const policy = await insertPolicy({
      orgId: org.id,
      name: 'no-acme',
      type: 'blocklist',
      config: { patterns: ['internal:acme/*'] },
      priority: 100,
    });

    const blocked = await attemptInstall({
      token: token.token,
      namespace: manifest.namespace,
      name: manifest.name,
      version: manifest.version,
    });
    expect(blocked.status).toBe(403);
    expect(blocked.contentType).toContain('problem+json');
    const body = blocked.json();
    expect(body).toMatchObject({
      type: 'https://cavalry.sh/errors/policy-violation',
      title: 'policy_violation',
      policyId: policy.id,
      policyName: 'no-acme',
      decision: 'deny',
    });
    expect(String(body?.detail)).toMatch(/no-acme/);

    // DB: install row with result='blocked'; policy_evaluation row for our policy.
    const pool = getPool();
    const installRows = await pool.query<{
      id: string;
      result: string;
      skill_ref: string;
    }>(
      `SELECT id, result, skill_ref FROM installs WHERE org_id = $1 ORDER BY created_at DESC LIMIT 5`,
      [org.id],
    );
    // First install was allowed, second was blocked.
    const blockedInstall = installRows.rows.find((r) => r.result === 'blocked');
    expect(blockedInstall).toBeTruthy();

    const evalRows = await pool.query<{ policy_id: string; matched: boolean; result: string }>(
      `SELECT policy_id, matched, result FROM policy_evaluations WHERE install_id = $1`,
      [blockedInstall!.id],
    );
    expect(evalRows.rows).toHaveLength(1);
    expect(evalRows.rows[0]).toMatchObject({
      policy_id: policy.id,
      matched: true,
      result: 'deny',
    });

    // Audit log contains skill.install_blocked with the policy name.
    const audits = await findAuditEvents({
      orgId: org.id,
      action: 'skill.install_blocked',
    });
    expect(audits).toHaveLength(1);
    expect(audits[0]?.payload).toMatchObject({
      policyId: policy.id,
      policyName: 'no-acme',
    });
  });
});
