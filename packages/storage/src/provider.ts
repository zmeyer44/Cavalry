import type { Readable } from 'node:stream';

export interface PutOptions {
  contentType?: string;
}

export interface PutResult {
  key: string;
  hash: string;
  size: number;
}

export interface GetResult {
  body: Readable;
  hash: string;
  size: number;
  contentType: string;
}

export interface HeadResult {
  hash: string;
  size: number;
  contentType: string;
}

export interface StorageProvider {
  readonly kind: 'local' | 's3';
  put(key: string, body: Buffer | Readable, opts?: PutOptions): Promise<PutResult>;
  get(key: string): Promise<GetResult | null>;
  head(key: string): Promise<HeadResult | null>;
  delete(key: string): Promise<void>;
  presignedGetUrl(key: string, ttlSeconds: number): Promise<string>;
}

export function buildStorageKey(parts: {
  orgId: string;
  kind: 'skill' | 'cache' | 'ticket';
  namespace: string;
  name: string;
  version: string;
  hash: string;
}): string {
  return `${parts.orgId}/${parts.kind}/${parts.namespace}/${parts.name}/${parts.version}/${parts.hash}.tar.gz`;
}
