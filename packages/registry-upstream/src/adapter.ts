import type { Readable } from 'node:stream';

export interface UpstreamRegistry {
  /** Configured registry name (org-scoped). */
  name: string;
  /** Underlying type that selects the adapter. */
  type: 'tessl' | 'github' | 'http' | 'mcp';
  /** Base URL or identifier the adapter will hit. */
  url: string;
  /** Decrypted auth/config — adapter-specific shape. */
  authConfig?: Record<string, unknown>;
}

export interface SkillVersionListing {
  version: string;
  publishedAt?: string | null;
}

export interface UpstreamManifestResult {
  manifest: Record<string, unknown>;
  /** Adapter-defined upstream identifier for traceability. */
  upstreamRef: string;
}

export interface UpstreamArtifactResult {
  body: Readable;
  /** Optional content length when known up-front. */
  sizeBytes?: number;
  contentType?: string;
  upstreamRef: string;
}

export class UpstreamError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'UpstreamError';
  }
}

export interface RegistryAdapter {
  /** Cheap connectivity probe. Returns OK or throws. */
  healthCheck(): Promise<{ ok: true; detail?: string }>;

  /** List versions for a skill in this registry. */
  listVersions(params: { namespace: string; name: string }): Promise<SkillVersionListing[]>;

  /** Resolve a ref ('latest', '^1.0.0', '1.2.3') to a concrete version. */
  resolveRef(params: {
    namespace: string;
    name: string;
    ref: string;
  }): Promise<{ version: string }>;

  /** Fetch the manifest for a specific version. */
  fetchManifest(params: {
    namespace: string;
    name: string;
    version: string;
  }): Promise<UpstreamManifestResult>;

  /** Fetch the artifact (gzipped tarball stream). */
  fetchArtifact(params: {
    namespace: string;
    name: string;
    version: string;
  }): Promise<UpstreamArtifactResult>;
}

/** Returned by the dispatcher — used by callers to log which adapter was chosen. */
export interface AdapterContext {
  adapter: RegistryAdapter;
  registry: UpstreamRegistry;
}
