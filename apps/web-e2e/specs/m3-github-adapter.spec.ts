import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { AddressInfo } from 'node:net';
import { create as tarCreate } from 'tar';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test, expect } from '../fixtures';
import { insertRegistry } from '../support/factories';

test.describe('M3 github adapter', () => {
  test('proxies a github skill via stubbed Contents API', async ({ orgWithToken }) => {
    const manifest = {
      name: 'hello',
      namespace: 'demo',
      version: 'v1.0.0',
      description: 'github proxied',
      targets: ['generic'],
      entrypoints: { skill: 'SKILL.md' },
    };

    const tarball = await buildTarball(manifest);
    const requestLog: string[] = [];

    const server = createServer((req, res) => {
      requestLog.push(req.url ?? '');
      const url = req.url ?? '';
      if (url === '/') return json(res, 200, { message: 'ok' });
      if (url.match(/^\/repos\/[^/]+\/[^/]+\/tags/)) {
        return json(res, 200, [{ name: 'v1.0.0' }]);
      }
      if (url.match(/^\/repos\/demo\/hello\/contents\/skill\.json/)) {
        return json(res, 200, {
          content: Buffer.from(JSON.stringify(manifest)).toString('base64'),
          encoding: 'base64',
        });
      }
      if (url.match(/^\/repos\/demo\/hello\/tarball\//)) {
        res.writeHead(200, {
          'content-type': 'application/gzip',
          'content-length': String(tarball.length),
        });
        return res.end(tarball);
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    const port = (server.address() as AddressInfo).port;

    try {
      const { org, token } = orgWithToken;
      await insertRegistry({
        orgId: org.id,
        name: 'gh',
        type: 'github',
        url: `http://127.0.0.1:${port}`,
      });

      const url = `${process.env.CAVALRY_GATEWAY_URL}/v1/proxy/gh/demo/hello/v1.0.0/artifact`;
      const res = await fetch(url, {
        headers: { authorization: `Bearer ${token.token}`, 'user-agent': 'e2e' },
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('x-cavalry-cache')).toBe('MISS');
      const body = Buffer.from(await res.arrayBuffer());
      expect(body.length).toBeGreaterThan(0);

      // Verify both endpoints were hit
      expect(requestLog.some((u) => u.includes('/contents/skill.json'))).toBe(true);
      expect(requestLog.some((u) => u.includes('/tarball/'))).toBe(true);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
});

function json(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(text) });
  res.end(text);
}

async function buildTarball(manifest: Record<string, unknown>): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), 'cavalry-github-mock-'));
  try {
    await writeFile(join(dir, 'skill.json'), JSON.stringify(manifest));
    await writeFile(join(dir, 'SKILL.md'), '# from github\n');
    const chunks: Buffer[] = [];
    const stream = tarCreate(
      { cwd: dir, gzip: { level: 6 }, portable: true },
      ['skill.json', 'SKILL.md'],
    );
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
