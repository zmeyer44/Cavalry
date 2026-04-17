import { Readable } from 'node:stream';
import {
  type RegistryAdapter,
  type SkillVersionListing,
  type UpstreamArtifactResult,
  type UpstreamManifestResult,
  type UpstreamRegistry,
  UpstreamError,
} from './adapter';

export interface TesslAdapterOptions {
  registry: UpstreamRegistry;
  /** Override fetch for tests. */
  fetchImpl?: typeof fetch;
}

export class TesslAdapter implements RegistryAdapter {
  private readonly base: string;
  private readonly token: string | undefined;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: TesslAdapterOptions) {
    this.base = stripTrailingSlash(opts.registry.url);
    const cfg = opts.registry.authConfig ?? {};
    this.token = typeof cfg.token === 'string' ? cfg.token : undefined;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      accept: 'application/json',
      'user-agent': 'cavalry-gateway',
    };
    if (this.token) h.authorization = `Bearer ${this.token}`;
    return h;
  }

  async healthCheck(): Promise<{ ok: true; detail?: string }> {
    const res = await this.fetchImpl(`${this.base}/healthz`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new UpstreamError(`tessl health: HTTP ${res.status}`, res.status);
    return { ok: true };
  }

  async listVersions(params: {
    namespace: string;
    name: string;
  }): Promise<SkillVersionListing[]> {
    const url = `${this.base}/skills/${encodeURIComponent(params.namespace)}/${encodeURIComponent(params.name)}`;
    const res = await this.fetchImpl(url, { headers: this.headers() });
    if (res.status === 404) {
      throw new UpstreamError('skill not found upstream', 404);
    }
    if (!res.ok) {
      throw new UpstreamError(`tessl list: HTTP ${res.status}`, res.status);
    }
    const body = (await res.json()) as { versions?: Array<{ version: string; publishedAt?: string }> };
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
    if (params.ref === 'latest') {
      return { version: versions[0]!.version };
    }
    const exact = versions.find((v) => v.version === params.ref);
    if (!exact) throw new UpstreamError(`version ${params.ref} not found upstream`, 404);
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
    if (!res.ok) throw new UpstreamError(`tessl manifest: HTTP ${res.status}`, res.status);
    const body = (await res.json()) as { manifest?: Record<string, unknown> };
    if (!body.manifest) throw new UpstreamError('manifest missing in upstream payload', 502);
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
    if (!res.ok) throw new UpstreamError(`tessl artifact: HTTP ${res.status}`, res.status);
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
