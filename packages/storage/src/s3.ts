import type { StorageProvider, PutResult, GetResult, HeadResult } from './provider';

export interface S3StorageConfig {
  bucket: string;
  region?: string;
  endpoint?: string;
}

/**
 * Stub S3 provider. Wired up fully in M3 when the gateway needs remote caching.
 * Throws at every method so misconfigured environments fail loudly rather than silently.
 */
export class S3StorageProvider implements StorageProvider {
  readonly kind = 's3' as const;
  constructor(private readonly _cfg: S3StorageConfig) {}

  private notImplemented(): never {
    throw new Error('S3 storage provider is not yet implemented. Set CAVALRY_STORAGE_PROVIDER=local for M2.');
  }

  put(): Promise<PutResult> {
    this.notImplemented();
  }
  get(): Promise<GetResult | null> {
    this.notImplemented();
  }
  head(): Promise<HeadResult | null> {
    this.notImplemented();
  }
  delete(): Promise<void> {
    this.notImplemented();
  }
  presignedGetUrl(): Promise<string> {
    this.notImplemented();
  }
}
