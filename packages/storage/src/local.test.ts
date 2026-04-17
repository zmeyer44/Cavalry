import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Readable } from 'node:stream';
import { LocalStorageProvider } from './local';
import { buildStorageKey } from './provider';

describe('LocalStorageProvider', () => {
  let root: string;
  let provider: LocalStorageProvider;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'cavalry-storage-'));
    provider = new LocalStorageProvider({ root });
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('put/get round-trips a buffer with content type', async () => {
    const key = buildStorageKey({
      orgId: 'org_1',
      kind: 'skill',
      namespace: 'acme',
      name: 'foo',
      version: '1.0.0',
      hash: 'abc',
    });
    const body = Buffer.from('hello');
    const put = await provider.put(key, body, { contentType: 'application/gzip' });
    expect(put.size).toBe(5);
    expect(put.hash).toMatch(/^[0-9a-f]{64}$/);

    const got = await provider.get(key);
    expect(got).not.toBeNull();
    if (got) {
      const chunks: Buffer[] = [];
      for await (const c of got.body) chunks.push(c as Buffer);
      expect(Buffer.concat(chunks).toString()).toBe('hello');
      expect(got.contentType).toBe('application/gzip');
      expect(got.hash).toBe(put.hash);
    }
  });

  it('put works with a Readable stream', async () => {
    const put = await provider.put('a/b/c.bin', Readable.from([Buffer.from('aa'), Buffer.from('bb')]));
    expect(put.size).toBe(4);
    const head = await provider.head('a/b/c.bin');
    expect(head?.size).toBe(4);
  });

  it('get returns null for missing keys', async () => {
    expect(await provider.get('nope.bin')).toBeNull();
    expect(await provider.head('nope.bin')).toBeNull();
  });

  it('refuses to escape the root', async () => {
    await expect(provider.put('../evil.bin', Buffer.from('x'))).rejects.toThrow(/outside root/);
  });

  it('delete removes both artifact and metadata', async () => {
    await provider.put('x/y.bin', Buffer.from('x'));
    await provider.delete('x/y.bin');
    expect(await provider.head('x/y.bin')).toBeNull();
  });
});
