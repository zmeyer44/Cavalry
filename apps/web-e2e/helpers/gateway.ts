import { mkdtemp, rm, writeFile, mkdir, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { create as tarCreate } from 'tar';
import type { SkillManifest } from '@cavalry/skill-format';

const GATEWAY_URL = process.env.CAVALRY_GATEWAY_URL ?? 'http://localhost:3001';

export interface BuildArtifactOptions {
  manifest: SkillManifest;
  files?: Record<string, string>;
}

export interface Artifact {
  buffer: Buffer;
  sizeBytes: number;
}

/** Pack a stub skill directory into a gzipped tarball in-memory. */
export async function buildArtifact(
  opts: BuildArtifactOptions,
): Promise<Artifact> {
  const dir = await mkdtemp(join(tmpdir(), 'cavalry-e2e-'));
  try {
    await writeFile(
      join(dir, 'skill.json'),
      JSON.stringify(opts.manifest, null, 2),
    );
    const files = opts.files ?? {
      'SKILL.md': '# skill\n\nstub content\n',
    };
    for (const [rel, content] of Object.entries(files)) {
      const full = resolve(dir, rel);
      await mkdir(resolve(full, '..'), { recursive: true });
      await writeFile(full, content);
    }
    const entries = await readdir(dir);
    const chunks: Buffer[] = [];
    const stream = tarCreate(
      { cwd: dir, gzip: { level: 6 }, portable: true },
      entries,
    );
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const buffer = Buffer.concat(chunks);
    return { buffer, sizeBytes: buffer.length };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export interface PublishResult {
  id: string;
  namespace: string;
  name: string;
  version: string;
  artifactHash: string;
  artifactSizeBytes: number;
}

export async function publishArtifact(params: {
  token: string;
  manifest: SkillManifest;
  artifact: Buffer;
}): Promise<PublishResult> {
  const form = new FormData();
  form.append('manifest', JSON.stringify(params.manifest));
  form.append(
    'artifact',
    new Blob([new Uint8Array(params.artifact)], { type: 'application/gzip' }),
    'artifact.tar.gz',
  );
  const res = await fetch(
    `${GATEWAY_URL}/v1/skills/${params.manifest.namespace}/${params.manifest.name}/versions`,
    {
      method: 'POST',
      headers: { authorization: `Bearer ${params.token}` },
      body: form,
    },
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`publish failed: ${res.status} ${text}`);
  }
  return JSON.parse(text) as PublishResult;
}

export interface InstallResult {
  body: Buffer;
  hash: string;
  sizeBytes: number;
  ref: string;
}

export async function fetchArtifact(params: {
  token: string;
  namespace: string;
  name: string;
  version: string;
  headers?: Record<string, string>;
}): Promise<InstallResult> {
  const res = await fetch(
    `${GATEWAY_URL}/v1/skills/${params.namespace}/${params.name}/${params.version}/artifact`,
    {
      method: 'GET',
      headers: {
        authorization: `Bearer ${params.token}`,
        'user-agent': 'cavalry-e2e',
        ...(params.headers ?? {}),
      },
    },
  );
  const body = Buffer.from(await res.arrayBuffer());
  if (!res.ok) {
    throw new Error(
      `install failed: ${res.status} ${body.toString('utf8')}`,
    );
  }
  return {
    body,
    hash: res.headers.get('x-cavalry-artifact-hash') ?? '',
    sizeBytes: body.length,
    ref: res.headers.get('x-cavalry-skill-ref') ?? '',
  };
}
