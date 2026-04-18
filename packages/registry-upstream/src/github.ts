import { Readable } from 'node:stream';
import {
  type RegistryAdapter,
  type SkillVersionListing,
  type UpstreamArtifactResult,
  type UpstreamManifestResult,
  type UpstreamRegistry,
  UpstreamError,
} from './adapter';

export interface GithubAdapterOptions {
  registry: UpstreamRegistry;
  fetchImpl?: typeof fetch;
}

/**
 * Treats a github registry as `github.com/<namespace>/<name>` where:
 *  - namespace = GitHub owner (org/user)
 *  - name = repo name
 *  - version = git ref (tag or commit SHA). 'latest' resolves to the default branch.
 *
 * Manifest is fetched from `<repo>/contents/skill.json` at the ref.
 * Artifact is the repo tarball from `<repo>/tarball/<ref>`.
 */
export class GithubAdapter implements RegistryAdapter {
  private readonly api: string;
  private readonly token: string | undefined;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: GithubAdapterOptions) {
    const cfg = opts.registry.authConfig ?? {};
    this.api = stripTrailingSlash(opts.registry.url) || 'https://api.github.com';
    this.token = typeof cfg.token === 'string' ? cfg.token : undefined;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      accept: 'application/vnd.github+json',
      'user-agent': 'cavalry-gateway',
      'x-github-api-version': '2022-11-28',
    };
    if (this.token) h.authorization = `Bearer ${this.token}`;
    return h;
  }

  async healthCheck(): Promise<{ ok: true; detail?: string }> {
    const res = await this.fetchImpl(`${this.api}/`, { headers: this.headers() });
    if (!res.ok) throw new UpstreamError(`github root: HTTP ${res.status}`, res.status);
    return { ok: true };
  }

  async listVersions(params: {
    namespace: string;
    name: string;
  }): Promise<SkillVersionListing[]> {
    const url = `${this.api}/repos/${encodeURIComponent(params.namespace)}/${encodeURIComponent(params.name)}/tags?per_page=100`;
    const res = await this.fetchImpl(url, { headers: this.headers() });
    if (res.status === 404) throw new UpstreamError('repo not found', 404);
    if (!res.ok) throw new UpstreamError(`github tags: HTTP ${res.status}`, res.status);
    const body = (await res.json()) as Array<{ name: string; commit?: { sha: string } }>;
    return body.map((t) => ({ version: t.name, publishedAt: null }));
  }

  async resolveRef(params: {
    namespace: string;
    name: string;
    ref: string;
  }): Promise<{ version: string }> {
    if (params.ref === 'latest') {
      const repo = await this.fetchRepo(params);
      return { version: repo.default_branch };
    }
    return { version: params.ref };
  }

  async fetchManifest(params: {
    namespace: string;
    name: string;
    version: string;
  }): Promise<UpstreamManifestResult> {
    const url = `${this.api}/repos/${encodeURIComponent(params.namespace)}/${encodeURIComponent(params.name)}/contents/skill.json?ref=${encodeURIComponent(params.version)}`;
    const res = await this.fetchImpl(url, { headers: this.headers() });
    if (res.status === 404) throw new UpstreamError('skill.json not found', 404);
    if (!res.ok) throw new UpstreamError(`github contents: HTTP ${res.status}`, res.status);
    const body = (await res.json()) as { content?: string; encoding?: string };
    if (!body.content) throw new UpstreamError('manifest content missing', 502);
    const decoded = Buffer.from(body.content, (body.encoding ?? 'base64') as BufferEncoding).toString(
      'utf8',
    );
    let manifest: Record<string, unknown>;
    try {
      manifest = JSON.parse(decoded) as Record<string, unknown>;
    } catch (err) {
      throw new UpstreamError('manifest is not valid JSON', 502, err);
    }
    return { manifest, upstreamRef: url };
  }

  async fetchArtifact(params: {
    namespace: string;
    name: string;
    version: string;
  }): Promise<UpstreamArtifactResult> {
    const url = `${this.api}/repos/${encodeURIComponent(params.namespace)}/${encodeURIComponent(params.name)}/tarball/${encodeURIComponent(params.version)}`;
    const res = await this.fetchImpl(url, { headers: this.headers(), redirect: 'follow' });
    if (res.status === 404) throw new UpstreamError('tarball not found', 404);
    if (!res.ok) throw new UpstreamError(`github tarball: HTTP ${res.status}`, res.status);
    if (!res.body) throw new UpstreamError('empty tarball body', 502);
    const sizeHeader = res.headers.get('content-length');
    return {
      body: Readable.fromWeb(res.body as never),
      sizeBytes: sizeHeader ? Number(sizeHeader) : undefined,
      contentType: res.headers.get('content-type') ?? 'application/gzip',
      upstreamRef: url,
    };
  }

  private async fetchRepo(params: {
    namespace: string;
    name: string;
  }): Promise<{ default_branch: string }> {
    const url = `${this.api}/repos/${encodeURIComponent(params.namespace)}/${encodeURIComponent(params.name)}`;
    const res = await this.fetchImpl(url, { headers: this.headers() });
    if (res.status === 404) throw new UpstreamError('repo not found', 404);
    if (!res.ok) throw new UpstreamError(`github repo: HTTP ${res.status}`, res.status);
    return (await res.json()) as { default_branch: string };
  }
}

function stripTrailingSlash(s: string): string {
  return s.replace(/\/$/, '');
}
