import { Readable } from 'node:stream';
import {
  type RegistryAdapter,
  type SkillVersionListing,
  type UpstreamArtifactResult,
  type UpstreamManifestResult,
  type UpstreamRegistry,
  UpstreamError,
} from './adapter';

export interface HttpAdapterOptions {
  registry: UpstreamRegistry;
  fetchImpl?: typeof fetch;
}

/**
 * Generic HTTP adapter. Expects upstream to honor the same surface the cavalry
 * gateway exposes:
 *   GET <baseUrl>/skills/:ns/:name              → { versions: [{version, publishedAt}] }
 *   GET <baseUrl>/skills/:ns/:name/:v           → { manifest: {...} }
 *   GET <baseUrl>/skills/:ns/:name/:v/artifact  → tarball
 * Optional `authConfig.headers` is merged into every request.
 */
export class HttpAdapter implements RegistryAdapter {
  private readonly base: string;
  private readonly extraHeaders: Record<string, string>;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: HttpAdapterOptions) {
    this.base = stripTrailingSlash(opts.registry.url);
    const cfg = opts.registry.authConfig ?? {};
    this.extraHeaders =
      cfg.headers && typeof cfg.headers === 'object' && !Array.isArray(cfg.headers)
        ? (cfg.headers as Record<string, string>)
        : {};
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    return {
      accept: 'application/json',
      'user-agent': 'cavalry-gateway',
      ...this.extraHeaders,
      ...(extra ?? {}),
    };
  }

  async healthCheck(): Promise<{ ok: true; detail?: string }> {
    const res = await this.fetchImpl(`${this.base}/healthz`, { headers: this.headers() });
    if (!res.ok) throw new UpstreamError(`http health: HTTP ${res.status}`, res.status);
    return { ok: true };
  }

  async listVersions(params: {
    namespace: string;
    name: string;
  }): Promise<SkillVersionListing[]> {
    const url = `${this.base}/skills/${encodeURIComponent(params.namespace)}/${encodeURIComponent(params.name)}`;
    const res = await this.fetchImpl(url, { headers: this.headers() });
    if (res.status === 404) throw new UpstreamError('not found', 404);
    if (!res.ok) throw new UpstreamError(`http list: HTTP ${res.status}`, res.status);
    const body = (await res.json()) as {
      versions?: Array<{ version: string; publishedAt?: string }>;
    };
    return (body.versions ?? []).map((v) => ({
      version: v.version,
      publishedAt: v.publishedAt ?? null,
    }));
  }

  async resolveRef(params: {
    namespace: string;
    name: string;
    ref: string;
  }): Promise<{ version: string }> {
    const versions = await this.listVersions(params);
    if (versions.length === 0) throw new UpstreamError('no versions upstream', 404);
    if (params.ref === 'latest') return { version: versions[0]!.version };
    const exact = versions.find((v) => v.version === params.ref);
    if (!exact) throw new UpstreamError(`version ${params.ref} not found`, 404);
    return { version: exact.version };
  }

  async fetchManifest(params: {
    namespace: string;
    name: string;
    version: string;
  }): Promise<UpstreamManifestResult> {
    const url = `${this.base}/skills/${encodeURIComponent(params.namespace)}/${encodeURIComponent(params.name)}/${encodeURIComponent(params.version)}`;
    const res = await this.fetchImpl(url, { headers: this.headers() });
    if (res.status === 404) throw new UpstreamError('manifest not found', 404);
    if (!res.ok) throw new UpstreamError(`http manifest: HTTP ${res.status}`, res.status);
    const body = (await res.json()) as { manifest?: Record<string, unknown> };
    if (!body.manifest) throw new UpstreamError('manifest missing in payload', 502);
    return { manifest: body.manifest, upstreamRef: url };
  }

  async fetchArtifact(params: {
    namespace: string;
    name: string;
    version: string;
  }): Promise<UpstreamArtifactResult> {
    const url = `${this.base}/skills/${encodeURIComponent(params.namespace)}/${encodeURIComponent(params.name)}/${encodeURIComponent(params.version)}/artifact`;
    const res = await this.fetchImpl(url, { headers: this.headers() });
    if (res.status === 404) throw new UpstreamError('artifact not found', 404);
    if (!res.ok) throw new UpstreamError(`http artifact: HTTP ${res.status}`, res.status);
    if (!res.body) throw new UpstreamError('empty artifact body', 502);
    const sizeHeader = res.headers.get('content-length');
    return {
      body: Readable.fromWeb(res.body as never),
      sizeBytes: sizeHeader ? Number(sizeHeader) : undefined,
      contentType: res.headers.get('content-type') ?? 'application/gzip',
      upstreamRef: url,
    };
  }
}

function stripTrailingSlash(s: string): string {
  return s.replace(/\/$/, '');
}
