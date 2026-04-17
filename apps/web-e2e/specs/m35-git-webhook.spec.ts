import { test, expect } from '../fixtures';
import { getPool } from '../support/db';
import { insertGitInstallation, insertSkillRepo } from '../support/factories';
import { postWebhook, resetMockGitHub } from '../support/mock-github-client';

test.describe('M3.5 git integration · webhook endpoint', () => {
  test.beforeEach(async () => {
    await resetMockGitHub();
  });

  test('verifies signature, dedups by delivery id, and rejects tampered payloads', async ({
    authedOrg,
  }) => {
    const { org, userId } = authedOrg;

    const inst = await insertGitInstallation({
      orgId: org.id,
      userId,
      externalId: '77',
      accountLogin: 'acme',
    });
    await insertSkillRepo({
      orgId: org.id,
      gitInstallationId: inst.id,
      owner: 'acme',
      repo: 'platform-skills',
    });

    const pushPayload = {
      ref: 'refs/tags/kafka-wrapper/v1.0.0',
      repository: {
        id: 1,
        name: 'platform-skills',
        owner: { login: 'acme' },
        default_branch: 'main',
      },
      installation: { id: 77 },
      sender: { login: 'bot', type: 'User' },
    };

    // Valid signature → 200
    const ok = await postWebhook({
      event: 'push',
      deliveryId: 'd-happy-1',
      payload: pushPayload,
    });
    expect(ok.status).toBe(200);
    const okBody = (await ok.json()) as { ok: boolean; duplicate?: boolean };
    expect(okBody.ok).toBe(true);
    expect(okBody.duplicate).toBeFalsy();

    // Second delivery with same id → 200 with duplicate=true
    const dup = await postWebhook({
      event: 'push',
      deliveryId: 'd-happy-1',
      payload: pushPayload,
    });
    expect(dup.status).toBe(200);
    const dupBody = (await dup.json()) as { ok: boolean; duplicate?: boolean };
    expect(dupBody.duplicate).toBe(true);

    // Tampered signature → 401
    const bad = await postWebhook({
      event: 'push',
      deliveryId: 'd-bad-1',
      payload: pushPayload,
      overrideSignature: 'sha256=deadbeef',
    });
    expect(bad.status).toBe(401);

    // webhook_deliveries contains exactly one row per accepted delivery.
    const pool = getPool();
    const rows = await pool.query<{ delivery_id: string; event_type: string }>(
      `SELECT delivery_id, event_type FROM webhook_deliveries ORDER BY received_at ASC`,
    );
    expect(rows.rows.map((r) => r.delivery_id)).toEqual(['d-happy-1']);
  });

  test('ping event returns 200 without side effects', async () => {
    const res = await postWebhook({
      event: 'ping',
      deliveryId: 'ping-1',
      payload: { zen: 'e2e' },
    });
    expect(res.status).toBe(200);
  });
});
