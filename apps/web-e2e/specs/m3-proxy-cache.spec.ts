import { test, expect } from '../fixtures';
import { getPool } from '../support/db';
import { insertRegistry } from '../support/factories';
import { MockUpstream, makeDemoSkill } from '../support/mock-upstream';

test.describe('M3 proxy cache', () => {
  test('first install miss writes storage + DB; second install hits cache', async ({
    orgWithToken,
  }) => {
    const upstream = new MockUpstream([makeDemoSkill()]);
    const { url } = await upstream.start();
    try {
      const { org, token } = orgWithToken;

      // Configure registry directly (faster than UI for this spec)
      await insertRegistry({
        orgId: org.id,
        name: 'mockreg',
        type: 'tessl',
        url,
      });

      // First call → cache miss
      const r1 = await proxyFetch({
        token: token.token,
        registry: 'mockreg',
        namespace: 'demo',
        name: 'hello',
        version: '1.0.0',
      });
      expect(r1.status).toBe(200);
      expect(r1.cache).toBe('MISS');
      // Second call → cache hit, mock upstream not called again for the artifact
      const r2 = await proxyFetch({
        token: token.token,
        registry: 'mockreg',
        namespace: 'demo',
        name: 'hello',
        version: '1.0.0',
      });
      expect(r2.status).toBe(200);
      expect(r2.cache).toBe('HIT');
      expect(r2.hash).toBe(r1.hash);

      const artifactCalls = upstream.requests.filter(
        (r) => r.url === '/skills/demo/hello/1.0.0/artifact',
      ).length;
      expect(artifactCalls).toBe(1);

      // DB has skill row with source_registry_id, version row with upstream_ref + null published_by
      const pool = getPool();
      const { rows: skills } = await pool.query<{
        namespace: string;
        name: string;
        source_registry_id: string | null;
      }>(`SELECT namespace, name, source_registry_id FROM skills WHERE org_id = $1`, [org.id]);
      expect(skills).toHaveLength(1);
      expect(skills[0]?.namespace).toBe('demo');
      expect(skills[0]?.source_registry_id).not.toBeNull();

      const { rows: versions } = await pool.query<{
        version: string;
        published_by: string | null;
        upstream_ref: string | null;
      }>(
        `SELECT version, published_by, upstream_ref FROM skill_versions
         WHERE skill_id = (SELECT id FROM skills WHERE org_id = $1 LIMIT 1)`,
        [org.id],
      );
      expect(versions).toHaveLength(1);
      expect(versions[0]?.version).toBe('1.0.0');
      expect(versions[0]?.published_by).toBeNull();
      expect(versions[0]?.upstream_ref).toMatch(/skills\/demo\/hello\/1\.0\.0\/artifact/);

      // Audit events: proxy_miss + skill.installed (first), proxy_hit (second)
      await expect
        .poll(async () => {
          const { rows } = await pool.query<{ action: string; count: string }>(
            `SELECT action, count(*)::text FROM audit_events
             WHERE org_id = $1 GROUP BY action`,
            [org.id],
          );
          return Object.fromEntries(rows.map((r) => [r.action, Number(r.count)]));
        })
        .toMatchObject({
          'registry.proxy_miss': 1,
          'registry.proxy_hit': 1,
          'skill.installed': 1,
        });

      // Skills inventory page shows the proxied skill with upstream badge.
      const { page } = orgWithToken;
      await page.goto(`/${org.slug}/skills`);
      await expect(page.getByText('demo').first()).toBeVisible();
      await expect(page.getByTestId('upstream-badge').first()).toBeVisible();
    } finally {
      await upstream.stop();
    }
  });
});

interface ProxyFetchParams {
  token: string;
  registry: string;
  namespace: string;
  name: string;
  version: string;
}

interface ProxyFetchResult {
  status: number;
  cache: string;
  hash: string;
  body: Buffer;
}

async function proxyFetch(p: ProxyFetchParams): Promise<ProxyFetchResult> {
  const url = `${process.env.CAVALRY_GATEWAY_URL}/v1/proxy/${p.registry}/${p.namespace}/${p.name}/${p.version}/artifact`;
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${p.token}`, 'user-agent': 'e2e' },
  });
  const body = Buffer.from(await res.arrayBuffer());
  return {
    status: res.status,
    cache: res.headers.get('x-cavalry-cache') ?? '',
    hash: res.headers.get('x-cavalry-artifact-hash') ?? '',
    body,
  };
}
