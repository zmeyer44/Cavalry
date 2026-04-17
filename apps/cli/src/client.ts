import { Readable } from 'node:stream';

export interface GatewayClientOptions {
  url: string;
  token: string;
}

export interface PublishResult {
  id: string;
  namespace: string;
  name: string;
  version: string;
  artifactHash: string;
  artifactSizeBytes: number;
}

export class GatewayClient {
  constructor(private readonly opts: GatewayClientOptions) {}

  private get baseUrl(): string {
    return this.opts.url.replace(/\/$/, '');
  }

  async publish(params: {
    namespace: string;
    name: string;
    manifest: Record<string, unknown>;
    artifact: Buffer;
  }): Promise<PublishResult> {
    const form = new FormData();
    form.append('manifest', JSON.stringify(params.manifest));
    const arr = new Uint8Array(params.artifact);
    form.append(
      'artifact',
      new Blob([arr], { type: 'application/gzip' }),
      'artifact.tar.gz',
    );

    const res = await fetch(
      `${this.baseUrl}/v1/skills/${params.namespace}/${params.name}/versions`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${this.opts.token}` },
        body: form,
      },
    );

    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok) {
      const detail = (body?.detail ?? body?.title ?? `HTTP ${res.status}`) as string;
      const err = new Error(detail) as Error & { issues?: unknown; status?: number };
      err.status = res.status;
      err.issues = body?.issues;
      throw err;
    }
    return body as unknown as PublishResult;
  }

  async fetchArtifact(namespace: string, name: string, version: string): Promise<{
    stream: Readable;
    hash: string;
    size: number;
    ref: string;
  }> {
    const res = await fetch(
      `${this.baseUrl}/v1/skills/${namespace}/${name}/${version}/artifact`,
      {
        method: 'GET',
        headers: {
          authorization: `Bearer ${this.opts.token}`,
          'user-agent': 'cavalry-cli',
        },
      },
    );
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as
        | { detail?: string; title?: string }
        | null;
      throw new Error(body?.detail ?? body?.title ?? `HTTP ${res.status}`);
    }
    if (!res.body) throw new Error('Empty response body');
    const hash = res.headers.get('x-cavalry-artifact-hash') ?? '';
    const size = Number(res.headers.get('content-length') ?? 0);
    const ref = res.headers.get('x-cavalry-skill-ref') ?? '';
    const stream = Readable.fromWeb(res.body as never);
    return { stream, hash, size, ref };
  }

  async resolveLatest(namespace: string, name: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/v1/skills/${namespace}/${name}`, {
      headers: { authorization: `Bearer ${this.opts.token}` },
    });
    if (res.status === 404) throw new Error(`Skill ${namespace}/${name} not found`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { versions: Array<{ version: string }> };
    const latest = body.versions[0]?.version;
    if (!latest) throw new Error(`No versions published for ${namespace}/${name}`);
    return latest;
  }
}
