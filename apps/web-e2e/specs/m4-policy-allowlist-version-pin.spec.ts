import { test, expect } from '../fixtures';
import { insertPolicy } from '../support/factories';
import {
  attemptInstall,
  buildArtifact,
  publishArtifact,
} from '../helpers/gateway';
import type { SkillManifest } from '@cavalry/skill-format';

async function publishVersion(
  token: string,
  namespace: string,
  name: string,
  version: string,
): Promise<void> {
  const manifest: SkillManifest = {
    name,
    namespace,
    version,
    description: `${namespace}/${name}@${version}`,
    targets: ['claude-code'],
    entrypoints: { skill: 'SKILL.md' },
  };
  const { buffer } = await buildArtifact({ manifest });
  await publishArtifact({ token, manifest, artifact: buffer });
}

test.describe('M4 policy · allowlist and version_pin', () => {
  test('allowlist denies skills not on the list, allows those on it', async ({
    orgWithToken,
  }) => {
    const { org, token } = orgWithToken;

    await publishVersion(token.token, 'allowed-ns', 'keepme', '1.0.0');
    await publishVersion(token.token, 'other-ns', 'blockme', '1.0.0');

    await insertPolicy({
      orgId: org.id,
      name: 'prod-allowlist',
      type: 'allowlist',
      config: { patterns: ['internal:allowed-ns/*'] },
      priority: 50,
    });

    const allowed = await attemptInstall({
      token: token.token,
      namespace: 'allowed-ns',
      name: 'keepme',
      version: '1.0.0',
    });
    expect(allowed.status).toBe(200);

    const blocked = await attemptInstall({
      token: token.token,
      namespace: 'other-ns',
      name: 'blockme',
      version: '1.0.0',
    });
    expect(blocked.status).toBe(403);
    const body = blocked.json();
    expect(body?.title).toBe('policy_violation');
    expect(String(body?.detail)).toMatch(/allowlist/);
  });

  test('version_pin denies out-of-range versions but allows in-range', async ({
    orgWithToken,
  }) => {
    const { org, token } = orgWithToken;

    await publishVersion(token.token, 'pinned', 'lib', '1.0.0');
    await publishVersion(token.token, 'pinned', 'lib', '2.5.0');

    await insertPolicy({
      orgId: org.id,
      name: 'pin-pinned-to-v2',
      type: 'version_pin',
      config: {
        rules: [{ pattern: 'internal:pinned/*', range: '^2.0.0' }],
      },
      priority: 10,
    });

    const tooOld = await attemptInstall({
      token: token.token,
      namespace: 'pinned',
      name: 'lib',
      version: '1.0.0',
    });
    expect(tooOld.status).toBe(403);
    expect(String(tooOld.json()?.detail)).toMatch(/does not satisfy \^2\.0\.0/);

    const inRange = await attemptInstall({
      token: token.token,
      namespace: 'pinned',
      name: 'lib',
      version: '2.5.0',
    });
    expect(inRange.status).toBe(200);
  });

  test('require_approval returns 202 pending with approval_required body', async ({
    orgWithToken,
  }) => {
    const { org, token } = orgWithToken;

    await publishVersion(token.token, 'sensitive', 'tool', '1.0.0');

    await insertPolicy({
      orgId: org.id,
      name: 'gate-all',
      type: 'require_approval',
      config: { patterns: ['internal:*'] },
      priority: 10,
    });

    const pending = await attemptInstall({
      token: token.token,
      namespace: 'sensitive',
      name: 'tool',
      version: '1.0.0',
    });
    expect(pending.status).toBe(202);
    const body = pending.json();
    expect(body).toMatchObject({
      title: 'approval_required',
      decision: 'require_approval',
      policyName: 'gate-all',
      approvalStatus: 'pending',
    });
    expect(typeof body?.approvalId).toBe('string');
  });
});
