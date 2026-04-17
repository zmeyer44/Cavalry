import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export async function computeArtifactHash(source: Readable | Buffer): Promise<string> {
  const hash = createHash('sha256');
  if (Buffer.isBuffer(source)) {
    hash.update(source);
    return hash.digest('hex');
  }
  await pipeline(source, async function* (stream) {
    for await (const chunk of stream) {
      hash.update(chunk);
      yield chunk;
    }
  });
  return hash.digest('hex');
}

export function verifyArtifactHash(expected: string, actual: string): boolean {
  if (expected.length !== actual.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ actual.charCodeAt(i);
  }
  return diff === 0;
}
