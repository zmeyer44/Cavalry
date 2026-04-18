import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { AddressInfo } from 'node:net';
import { create as tarCreate } from 'tar';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export interface MockSkill {
  namespace: string;
  name: string;
  versions: Array<{
    version: string;
    manifest: Record<string, unknown>;
    /** If omitted, a default tarball with skill.json + SKILL.md is built. */
    artifact?: Buffer;
  }>;
}

export interface MockUpstreamOptions {
  /** Behavior knobs for testing failure paths. */
  artifactStatus?: number;
  artifactBody?: string;
  versionsStatus?: number;
}

interface RecordedRequest {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
}

export class MockUpstream {
  private server: Server | null = null;
  public requests: RecordedRequest[] = [];

  constructor(
    private readonly skills: MockSkill[] = [],
    private readonly opts: MockUpstreamOptions = {},
  ) {}

  setOptions(opts: Partial<MockUpstreamOptions>): void {
    Object.assign(this.opts, opts);
  }

  async start(): Promise<{ url: string; port: number }> {
    this.server = createServer((req, res) => this.handle(req, res));
    await new Promise<void>((resolve, reject) => {
      this.server!.once('error', reject);
      this.server!.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = this.server.address() as AddressInfo;
    return { url: `http://127.0.0.1:${addr.port}`, port: addr.port };
  }

  async stop(): Promise<void> {
    if (!this.server) return;
    await new Promise<void>((resolve, reject) =>
      this.server!.close((err) => (err ? reject(err) : resolve())),
    );
    this.server = null;
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    this.requests.push({
      method: req.method ?? 'GET',
      url: req.url ?? '',
      headers: req.headers,
    });

    const url = req.url ?? '';
    // GET /healthz
    if (url === '/healthz') {
      send(res, 200, JSON.stringify({ status: 'ok' }), 'application/json');
      return;
    }

    // /skills/:ns/:name(/:version(/artifact)?)?
    const m = url.match(/^\/skills\/([^/]+)\/([^/]+)(?:\/([^/]+)(?:\/(artifact))?)?$/);
    if (!m) {
      send(res, 404, 'not found');
      return;
    }
    const [, ns, name, version, artifact] = m;
    const skill = this.skills.find((s) => s.namespace === ns && s.name === name);
    if (!skill) {
      send(res, 404, JSON.stringify({ detail: 'skill not found' }), 'application/json');
      return;
    }

    // List versions
    if (!version) {
      if (this.opts.versionsStatus && this.opts.versionsStatus !== 200) {
        send(res, this.opts.versionsStatus, 'upstream error');
        return;
      }
      send(
        res,
        200,
        JSON.stringify({
          versions: skill.versions.map((v) => ({ version: v.version })),
        }),
        'application/json',
      );
      return;
    }

    const v = skill.versions.find((x) => x.version === version);
    if (!v) {
      send(res, 404, JSON.stringify({ detail: 'version not found' }), 'application/json');
      return;
    }

    // Fetch manifest
    if (!artifact) {
      send(res, 200, JSON.stringify({ manifest: v.manifest }), 'application/json');
      return;
    }

    // Fetch artifact
    if (this.opts.artifactStatus && this.opts.artifactStatus !== 200) {
      send(res, this.opts.artifactStatus, this.opts.artifactBody ?? 'upstream error');
      return;
    }
    const buf = v.artifact ?? (await defaultArtifact(v.manifest));
    res.writeHead(200, {
      'content-type': 'application/gzip',
      'content-length': String(buf.length),
    });
    res.end(buf);
  }
}

function send(res: ServerResponse, status: number, body: string, contentType = 'text/plain'): void {
  res.writeHead(status, { 'content-type': contentType, 'content-length': Buffer.byteLength(body) });
  res.end(body);
}

async function defaultArtifact(manifest: Record<string, unknown>): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), 'cavalry-mock-upstream-'));
  try {
    await writeFile(join(dir, 'skill.json'), JSON.stringify(manifest, null, 2));
    await mkdir(resolve(dir), { recursive: true });
    await writeFile(join(dir, 'SKILL.md'), `# ${manifest.namespace}/${manifest.name}\n\nmock upstream skill\n`);
    const chunks: Buffer[] = [];
    const stream = tarCreate(
      { cwd: dir, gzip: { level: 6 }, portable: true },
      ['skill.json', 'SKILL.md'],
    );
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Convenience: build a single-skill mock with a default 1.0.0 version. */
export function makeDemoSkill(): MockSkill {
  return {
    namespace: 'demo',
    name: 'hello',
    versions: [
      {
        version: '1.0.0',
        manifest: {
          name: 'hello',
          namespace: 'demo',
          version: '1.0.0',
          description: 'demo upstream skill',
          targets: ['generic'],
          entrypoints: { skill: 'SKILL.md' },
        },
      },
    ],
  };
}
