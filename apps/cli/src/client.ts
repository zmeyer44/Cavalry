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

export interface PolicyViolationError extends Error {
  kind: 'policy_violation' | 'approval_required';
  policyId: string;
  policyName: string;
  reason: string;
  status: number;
  approvalId?: string;
  approvalStatus?: 'pending' | 'denied';
}

export interface PolicySummary {
  id: string;
  name: string;
  type: 'allowlist' | 'blocklist' | 'version_pin' | 'require_approval';
  priority: number;
  enabled: boolean;
  scopeType: 'org' | 'workspace';
  scopeId: string | null;
}

async function maybePolicyError(
  res: Response,
  body: unknown,
): Promise<Error | null> {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const type = typeof b.type === 'string' ? b.type : undefined;
  if (
    type === 'https://cavalry.sh/errors/policy-violation' ||
    type === 'https://cavalry.sh/errors/approval-required'
  ) {
    const err = new Error(String(b.detail ?? 'policy violation')) as PolicyViolationError;
    err.kind =
      type === 'https://cavalry.sh/errors/policy-violation'
        ? 'policy_violation'
        : 'approval_required';
    err.policyId = String(b.policyId ?? '');
    err.policyName = String(b.policyName ?? '');
    err.reason = String(b.detail ?? '');
    err.status = res.status;
    if (typeof b.approvalId === 'string') err.approvalId = b.approvalId;
    if (b.approvalStatus === 'pending' || b.approvalStatus === 'denied') {
      err.approvalStatus = b.approvalStatus;
    }
    return err;
  }
  return null;
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
    // 202 = approval pending; 4xx/5xx = error. 200 = artifact stream.
    if (res.status === 202 || !res.ok) {
      const body = (await res.json().catch(() => null)) as
        | { detail?: string; title?: string }
        | null;
      const policyErr = await maybePolicyError(res, body);
      if (policyErr) throw policyErr;
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

  async fetchProxiedArtifact(
    registry: string,
    namespace: string,
    name: string,
    version: string,
  ): Promise<{ stream: Readable; hash: string; size: number; ref: string; cache: string }> {
    const res = await fetch(
      `${this.baseUrl}/v1/proxy/${registry}/${namespace}/${name}/${version}/artifact`,
      {
        method: 'GET',
        headers: {
          authorization: `Bearer ${this.opts.token}`,
          'user-agent': 'cavalry-cli',
        },
      },
    );
    if (res.status === 202 || !res.ok) {
      const body = (await res.json().catch(() => null)) as
        | { detail?: string; title?: string }
        | null;
      const policyErr = await maybePolicyError(res, body);
      if (policyErr) throw policyErr;
      throw new Error(body?.detail ?? body?.title ?? `HTTP ${res.status}`);
    }
    if (!res.body) throw new Error('Empty response body');
    const hash = res.headers.get('x-cavalry-artifact-hash') ?? '';
    const size = Number(res.headers.get('content-length') ?? 0);
    const ref = res.headers.get('x-cavalry-skill-ref') ?? '';
    const cache = res.headers.get('x-cavalry-cache') ?? '';
    const stream = Readable.fromWeb(res.body as never);
    return { stream, hash, size, ref, cache };
  }

  async listPolicies(): Promise<PolicySummary[]> {
    const res = await fetch(`${this.baseUrl}/v1/policies`, {
      headers: { authorization: `Bearer ${this.opts.token}` },
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as
        | { detail?: string; title?: string }
        | null;
      throw new Error(body?.detail ?? body?.title ?? `HTTP ${res.status}`);
    }
    const json = (await res.json()) as { policies: PolicySummary[] };
    return json.policies;
  }

  async resolveProxiedLatest(
    registry: string,
    namespace: string,
    name: string,
  ): Promise<string> {
    const res = await fetch(
      `${this.baseUrl}/v1/proxy/${registry}/${namespace}/${name}`,
      { headers: { authorization: `Bearer ${this.opts.token}` } },
    );
    if (res.status === 404) throw new Error(`${registry}:${namespace}/${name} not found`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { versions: Array<{ version: string }> };
    const latest = body.versions[0]?.version;
    if (!latest) throw new Error(`No versions upstream for ${registry}:${namespace}/${name}`);
    return latest;
  }
}
