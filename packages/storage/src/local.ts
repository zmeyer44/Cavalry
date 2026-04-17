import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, rm, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import type { StorageProvider, PutResult, GetResult, HeadResult, PutOptions } from './provider';

const META_SUFFIX = '.meta.json';

export interface LocalStorageConfig {
  root: string;
}

export class LocalStorageProvider implements StorageProvider {
  readonly kind = 'local' as const;
  private readonly root: string;

  constructor(cfg: LocalStorageConfig) {
    this.root = resolve(cfg.root);
  }

  private resolveSafe(key: string): string {
    const target = resolve(this.root, key);
    const rel = relative(this.root, target);
    if (isAbsolute(rel) || rel.startsWith('..')) {
      throw new Error(`Refusing to store outside root: ${key}`);
    }
    return target;
  }

  async put(key: string, body: Buffer | Readable, opts?: PutOptions): Promise<PutResult> {
    const target = this.resolveSafe(key);
    await mkdir(dirname(target), { recursive: true });
    const hash = createHash('sha256');
    let size = 0;
    const stream = Buffer.isBuffer(body) ? Readable.from(body) : body;
    await pipeline(stream, async function* (src) {
      for await (const chunk of src) {
        hash.update(chunk);
        size += (chunk as Buffer).length;
        yield chunk;
      }
    }, createWriteStream(target));
    const digest = hash.digest('hex');
    const meta = {
      contentType: opts?.contentType ?? 'application/octet-stream',
      hash: digest,
      size,
    };
    await writeMeta(target, meta);
    return { key, hash: digest, size };
  }

  async get(key: string): Promise<GetResult | null> {
    const target = this.resolveSafe(key);
    const meta = await readMeta(target);
    if (!meta) return null;
    const body = createReadStream(target);
    return { body, hash: meta.hash, size: meta.size, contentType: meta.contentType };
  }

  async head(key: string): Promise<HeadResult | null> {
    const target = this.resolveSafe(key);
    return readMeta(target);
  }

  async delete(key: string): Promise<void> {
    const target = this.resolveSafe(key);
    await rm(target, { force: true });
    await rm(target + META_SUFFIX, { force: true });
  }

  async presignedGetUrl(key: string, _ttlSeconds: number): Promise<string> {
    // Local provider has no meaningful URL. Return a file URL so callers have something to print.
    const target = this.resolveSafe(key);
    return `file://${target}`;
  }
}

async function writeMeta(target: string, meta: HeadResult): Promise<void> {
  await mkdir(dirname(target), { recursive: true });
  await pipeline(Readable.from(JSON.stringify(meta)), createWriteStream(target + META_SUFFIX));
}

async function readMeta(target: string): Promise<HeadResult | null> {
  try {
    const [raw] = await Promise.all([readFile(target + META_SUFFIX, 'utf8'), stat(target)]);
    return JSON.parse(raw) as HeadResult;
  } catch {
    return null;
  }
}
