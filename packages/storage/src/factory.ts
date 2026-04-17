import { resolve } from 'node:path';
import { LocalStorageProvider } from './local';
import { S3StorageProvider } from './s3';
import type { StorageProvider } from './provider';

let cached: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (cached) return cached;
  const kind = (process.env.CAVALRY_STORAGE_PROVIDER ?? 'local') as 'local' | 's3' | 'r2';

  if (kind === 'local') {
    const root = resolve(process.cwd(), process.env.CAVALRY_STORAGE_LOCAL_DIR ?? './.cavalry-storage');
    cached = new LocalStorageProvider({ root });
    return cached;
  }

  const bucket = process.env.CAVALRY_STORAGE_S3_BUCKET;
  if (!bucket) throw new Error('CAVALRY_STORAGE_S3_BUCKET is required when CAVALRY_STORAGE_PROVIDER is s3 or r2');
  cached = new S3StorageProvider({
    bucket,
    region: process.env.CAVALRY_STORAGE_S3_REGION,
    endpoint: process.env.CAVALRY_STORAGE_S3_ENDPOINT,
  });
  return cached;
}

export function resetStorageProviderForTests(): void {
  cached = null;
}
