import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { GithubAdapter } from './github';
import { HttpAdapter } from './http';
import { TesslAdapter } from './tessl';
import { UpstreamError, type UpstreamRegistry } from './adapter';
import { getAdapter } from './index';

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
}

function streamResponse(payload: string, init: ResponseInit = {}): Response {
  return new Response(payload, {
    status: 200,
    ...init,
    headers: { 'content-type': 'application/gzip', ...(init.headers ?? {}) },
  });
}

async function readStream(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

describe('TesslAdapter', () => {
  const baseRegistry: UpstreamRegistry = {
    name: 'tessl',
    type: 'tessl',
    url: 'https://tessl.example.com/registry',
    authConfig: { token: 'test-token' },
  };

  it('listVersions hits the right URL with bearer token', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl: typeof fetch = (input, init) => {
      calls.push({ url: String(input), init });
      return Promise.resolve(
        jsonResponse({ versions: [{ version: '1.0.0' }, { version: '0.9.0' }] }),
      );
    };
    const adapter = new TesslAdapter({ registry: baseRegistry, fetchImpl });
    const versions = await adapter.listVersions({ namespace: 'demo', name: 'hello' });
    expect(versions).toEqual([
      { version: '1.0.0', publishedAt: null },
      { version: '0.9.0', publishedAt: null },
    ]);
    expect(calls[0]?.url).toBe('https://tessl.example.com/registry/skills/demo/hello');
    const auth = (calls[0]?.init?.headers as Record<string, string>)?.authorization;
    expect(auth).toBe('Bearer test-token');
  });

  it('resolveRef returns first version for "latest"', async () => {
    const fetchImpl: typeof fetch = () =>
      Promise.resolve(jsonResponse({ versions: [{ version: '2.0.0' }, { version: '1.0.0' }] }));
    const adapter = new TesslAdapter({ registry: baseRegistry, fetchImpl });
    const r = await adapter.resolveRef({ namespace: 'demo', name: 'hello', ref: 'latest' });
    expect(r.version).toBe('2.0.0');
  });

  it('fetchArtifact returns the upstream stream', async () => {
    const fetchImpl: typeof fetch = () =>
      Promise.resolve(streamResponse('FAKE_TARBALL_BYTES'));
    const adapter = new TesslAdapter({ registry: baseRegistry, fetchImpl });
    const r = await adapter.fetchArtifact({ namespace: 'demo', name: 'hello', version: '1.0.0' });
    const text = await readStream(r.body);
    expect(text).toBe('FAKE_TARBALL_BYTES');
  });

  it('throws UpstreamError on 404', async () => {
    const fetchImpl: typeof fetch = () =>
      Promise.resolve(new Response('not found', { status: 404 }));
    const adapter = new TesslAdapter({ registry: baseRegistry, fetchImpl });
    await expect(adapter.listVersions({ namespace: 'demo', name: 'hello' })).rejects.toThrow(
      UpstreamError,
    );
  });

  it('throws UpstreamError on 5xx', async () => {
    const fetchImpl: typeof fetch = () =>
      Promise.resolve(new Response('boom', { status: 503 }));
    const adapter = new TesslAdapter({ registry: baseRegistry, fetchImpl });
    await expect(adapter.fetchArtifact({ namespace: 'd', name: 'h', version: '1.0.0' }))
      .rejects.toMatchObject({ status: 503 });
  });
});

describe('GithubAdapter', () => {
  const registry: UpstreamRegistry = {
    name: 'gh',
    type: 'github',
    url: 'https://api.github.com',
    authConfig: { token: 'ghp_xxx' },
  };

  it('decodes base64 manifest from contents endpoint', async () => {
    const manifest = { name: 'hello', namespace: 'demo', version: '1.0.0' };
    const fetchImpl: typeof fetch = (input) => {
      const url = String(input);
      if (url.includes('/contents/skill.json')) {
        return Promise.resolve(
          jsonResponse({
            content: Buffer.from(JSON.stringify(manifest)).toString('base64'),
            encoding: 'base64',
          }),
        );
      }
      return Promise.resolve(jsonResponse({}));
    };
    const adapter = new GithubAdapter({ registry, fetchImpl });
    const m = await adapter.fetchManifest({ namespace: 'demo', name: 'hello', version: 'v1.0.0' });
    expect(m.manifest).toEqual(manifest);
  });

  it('latest resolves to default branch', async () => {
    const fetchImpl: typeof fetch = (input) => {
      const url = String(input);
      if (url.endsWith('/repos/demo/hello')) {
        return Promise.resolve(jsonResponse({ default_branch: 'main' }));
      }
      return Promise.resolve(jsonResponse({}));
    };
    const adapter = new GithubAdapter({ registry, fetchImpl });
    const r = await adapter.resolveRef({ namespace: 'demo', name: 'hello', ref: 'latest' });
    expect(r.version).toBe('main');
  });

  it('listVersions maps tags', async () => {
    const fetchImpl: typeof fetch = () =>
      Promise.resolve(jsonResponse([{ name: 'v1.0.0' }, { name: 'v0.9.0' }]));
    const adapter = new GithubAdapter({ registry, fetchImpl });
    const v = await adapter.listVersions({ namespace: 'demo', name: 'hello' });
    expect(v.map((x) => x.version)).toEqual(['v1.0.0', 'v0.9.0']);
  });
});

describe('HttpAdapter', () => {
  const registry: UpstreamRegistry = {
    name: 'http-test',
    type: 'http',
    url: 'https://internal.example.com/r',
    authConfig: { headers: { 'x-api-key': 'secret' } },
  };

  it('merges authConfig.headers into requests', async () => {
    const calls: Array<RequestInit | undefined> = [];
    const fetchImpl: typeof fetch = (_input, init) => {
      calls.push(init);
      return Promise.resolve(jsonResponse({ versions: [{ version: '1.0.0' }] }));
    };
    const adapter = new HttpAdapter({ registry, fetchImpl });
    await adapter.listVersions({ namespace: 'demo', name: 'hello' });
    const headers = calls[0]?.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('secret');
    expect(headers.accept).toBe('application/json');
  });

  it('resolveRef handles exact-version match', async () => {
    const fetchImpl: typeof fetch = () =>
      Promise.resolve(jsonResponse({ versions: [{ version: '1.0.0' }, { version: '0.9.0' }] }));
    const adapter = new HttpAdapter({ registry, fetchImpl });
    const r = await adapter.resolveRef({ namespace: 'd', name: 'h', ref: '0.9.0' });
    expect(r.version).toBe('0.9.0');
  });
});

describe('getAdapter dispatcher', () => {
  it('returns the right class per type', () => {
    expect(
      getAdapter({
        name: 't',
        type: 'tessl',
        url: 'https://x',
      }) instanceof TesslAdapter,
    ).toBe(true);
    expect(
      getAdapter({
        name: 'g',
        type: 'github',
        url: 'https://api.github.com',
      }) instanceof GithubAdapter,
    ).toBe(true);
    expect(
      getAdapter({
        name: 'h',
        type: 'http',
        url: 'https://x',
      }) instanceof HttpAdapter,
    ).toBe(true);
  });

  it('throws for mcp', () => {
    expect(() =>
      getAdapter({ name: 'm', type: 'mcp', url: 'https://x' }),
    ).toThrow(/MCP/);
  });
});
