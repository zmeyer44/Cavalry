/**
 * In-memory HTTP mock of the GitHub App REST endpoints Cavalry uses.
 *
 * Runs as its own process via `mock-github-server.run.ts` so it can serve the
 * webServer child processes (apps/web, apps/gateway) AND the test processes
 * from the same state. Tests seed data through `/_control/*` endpoints.
 *
 * This mock does NOT verify JWTs. It accepts any Authorization header. The
 * goal is fidelity of the response shapes, not auth simulation.
 */

import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import { randomBytes } from 'node:crypto';

export interface MockFile {
  path: string;
  content: string; // utf-8 text
}

export interface MockCommit {
  sha: string;
  message?: string;
  authorName?: string;
  authorEmail?: string;
  /** Files present at this commit. */
  files: MockFile[];
}

export interface MockTag {
  name: string;
  commitSha: string;
}

export interface MockRepo {
  owner: string;
  repo: string;
  defaultBranch: string;
  private: boolean;
  description?: string;
  /** HEAD of the default branch. */
  head: string;
  commits: MockCommit[];
  tags: MockTag[];
}

export interface MockInstallation {
  id: number;
  accountLogin: string;
  accountType: 'user' | 'organization';
  permissions?: Record<string, unknown>;
  suspended?: boolean;
  repos: MockRepo[];
}

export interface MockState {
  installations: MockInstallation[];
}

export interface RecordedRequest {
  method: string;
  url: string;
  status: number;
}

interface TokenContext {
  installationId: number;
  expiresAt: Date;
}

export class MockGitHubServer {
  private server: Server | null = null;
  private state: MockState = { installations: [] };
  private tokens = new Map<string, TokenContext>();
  public requests: RecordedRequest[] = [];

  async start(port: number): Promise<{ url: string; port: number }> {
    this.server = createServer((req, res) => this.handle(req, res));
    await new Promise<void>((resolve, reject) => {
      this.server!.once('error', reject);
      this.server!.listen(port, '127.0.0.1', () => resolve());
    });
    return { url: `http://127.0.0.1:${port}`, port };
  }

  async stop(): Promise<void> {
    if (!this.server) return;
    await new Promise<void>((resolve, reject) =>
      this.server!.close((err) => (err ? reject(err) : resolve())),
    );
    this.server = null;
  }

  getState(): MockState {
    return this.state;
  }

  setState(next: MockState): void {
    this.state = next;
    this.tokens.clear();
  }

  reset(): void {
    this.state = { installations: [] };
    this.tokens.clear();
    this.requests.length = 0;
  }

  private log(req: IncomingMessage, status: number): void {
    this.requests.push({
      method: req.method ?? 'GET',
      url: req.url ?? '',
      status,
    });
  }

  private async handle(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const path = url.pathname;

      // --- Control plane ----------------------------------------------------
      if (path.startsWith('/_control/')) {
        await this.handleControl(req, res, url);
        return;
      }

      // --- GitHub App API ---------------------------------------------------
      if (req.method === 'POST') {
        const m = path.match(
          /^\/app\/installations\/(\d+)\/access_tokens$/,
        );
        if (m) {
          const id = Number(m[1]);
          const token = 'ghs_' + randomBytes(16).toString('hex');
          const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
          this.tokens.set(token, { installationId: id, expiresAt });
          return this.send(req, res, 201, {
            token,
            expires_at: expiresAt.toISOString(),
            permissions: { contents: 'read', metadata: 'read' },
            repository_selection: 'all',
          });
        }
      }

      if (req.method === 'GET' && path === '/app/installations') {
        return this.send(
          req,
          res,
          200,
          this.state.installations.map((i) => this.installationJson(i)),
        );
      }

      if (req.method === 'GET' && path === '/installation/repositories') {
        const installationId = this.installationIdFromAuth(req);
        const installation = this.state.installations.find(
          (i) => i.id === installationId,
        );
        const repos = installation?.repos ?? [];
        return this.send(req, res, 200, {
          total_count: repos.length,
          repositories: repos.map((r) => this.repoJson(r)),
        });
      }

      const reposMatch = path.match(/^\/repos\/([^/]+)\/([^/]+)\/(.+)$/);
      if (req.method === 'GET' && reposMatch) {
        const [, owner, repo, rest] = reposMatch;
        const r = this.findRepo(owner!, repo!);
        if (!r) {
          return this.send(req, res, 404, { message: 'Not Found' });
        }

        // GET /repos/:owner/:repo/contents/:path?ref=...
        const contentsMatch = rest!.match(/^contents\/(.+)$/);
        if (contentsMatch) {
          const filePath = decodeURIComponent(contentsMatch[1]!);
          const ref = url.searchParams.get('ref') ?? r.head;
          const commit = r.commits.find((c) => c.sha === ref);
          if (!commit) return this.send(req, res, 404, { message: 'ref not found' });
          const file = commit.files.find((f) => f.path === filePath);
          if (!file) return this.send(req, res, 404, { message: 'file not found' });

          const accept = req.headers['accept'];
          const wantsRaw =
            typeof accept === 'string' &&
            accept.includes('application/vnd.github.raw');

          if (wantsRaw) {
            this.log(req, 200);
            res.writeHead(200, { 'content-type': 'application/vnd.github.raw' });
            res.end(file.content);
            return;
          }
          return this.send(req, res, 200, {
            type: 'file',
            name: filePath.split('/').pop() ?? filePath,
            path: filePath,
            content: Buffer.from(file.content, 'utf8').toString('base64'),
            encoding: 'base64',
            sha: `blob-${filePath}`,
            size: Buffer.byteLength(file.content),
          });
        }

        // GET /repos/:owner/:repo/commits/:ref
        const commitsMatch = rest!.match(/^commits\/(.+)$/);
        if (commitsMatch) {
          const ref = decodeURIComponent(commitsMatch[1]!);
          // Treat "HEAD" and the default-branch name as the current head.
          const targetSha =
            ref === 'HEAD' || ref === r.defaultBranch
              ? r.head
              : this.resolveRef(r, ref);
          const commit = r.commits.find((c) => c.sha === targetSha);
          if (!commit) return this.send(req, res, 404, { message: 'commit not found' });
          return this.send(req, res, 200, this.commitJson(r, commit));
        }

        // GET /repos/:owner/:repo/git/trees/:sha?recursive=1
        const treeMatch = rest!.match(/^git\/trees\/([^/?]+)/);
        if (treeMatch) {
          const sha = treeMatch[1]!;
          // Tree shas in our mock are `tree-<commitSha>` for the root and
          // we derive subtree listings from file paths directly.
          const commit = r.commits.find(
            (c) => c.sha === sha || `tree-${c.sha}` === sha,
          );
          if (!commit) return this.send(req, res, 404, { message: 'tree not found' });
          const recursive = url.searchParams.get('recursive') === '1';
          const entries = recursive
            ? commit.files.map((f) => ({
                path: f.path,
                mode: '100644',
                type: 'blob',
                sha: `blob-${f.path}`,
                size: Buffer.byteLength(f.content),
              }))
            : commit.files
                .filter((f) => !f.path.includes('/'))
                .map((f) => ({
                  path: f.path,
                  mode: '100644',
                  type: 'blob',
                  sha: `blob-${f.path}`,
                  size: Buffer.byteLength(f.content),
                }));
          return this.send(req, res, 200, {
            sha,
            tree: entries,
            truncated: false,
          });
        }

        // GET /repos/:owner/:repo/tags?per_page=100&page=N
        if (rest === 'tags') {
          const page = Number(url.searchParams.get('page') ?? 1);
          const perPage = Number(url.searchParams.get('per_page') ?? 30);
          const offset = (page - 1) * perPage;
          const slice = r.tags.slice(offset, offset + perPage);
          return this.send(
            req,
            res,
            200,
            slice.map((t) => ({
              name: t.name,
              commit: { sha: t.commitSha, url: '' },
              zipball_url: '',
              tarball_url: '',
              node_id: '',
            })),
          );
        }
      }

      this.send(req, res, 404, { message: 'Not Found', path });
    } catch (err) {
      console.error('[mock-github] error', err);
      this.send(req, res, 500, {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private async handleControl(
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
  ): Promise<void> {
    const path = url.pathname;
    if (req.method === 'POST' && path === '/_control/reset') {
      this.reset();
      return this.send(req, res, 200, { ok: true });
    }
    if (req.method === 'GET' && path === '/_control/state') {
      return this.send(req, res, 200, this.state);
    }
    if (req.method === 'POST' && path === '/_control/state') {
      const body = await readJson(req);
      this.setState(body as MockState);
      return this.send(req, res, 200, { ok: true });
    }
    if (req.method === 'GET' && path === '/_control/requests') {
      return this.send(req, res, 200, this.requests);
    }
    if (req.method === 'POST' && path === '/_control/requests/clear') {
      this.requests.length = 0;
      return this.send(req, res, 200, { ok: true });
    }
    this.send(req, res, 404, { message: 'control endpoint not found' });
  }

  private installationIdFromAuth(req: IncomingMessage): number | null {
    const auth = req.headers['authorization'];
    if (typeof auth !== 'string') return null;
    const match = auth.match(/^(?:token|bearer)\s+(.+)$/i);
    if (!match) return null;
    const token = match[1]!;
    const ctx = this.tokens.get(token);
    return ctx?.installationId ?? null;
  }

  private findRepo(owner: string, repo: string): MockRepo | null {
    for (const i of this.state.installations) {
      const r = i.repos.find((r) => r.owner === owner && r.repo === repo);
      if (r) return r;
    }
    return null;
  }

  private resolveRef(repo: MockRepo, ref: string): string {
    // Might be a tag name, might already be a sha. Check tags first.
    const tag = repo.tags.find((t) => t.name === ref);
    if (tag) return tag.commitSha;
    return ref;
  }

  private installationJson(i: MockInstallation) {
    return {
      id: i.id,
      account: { login: i.accountLogin, type: capitalize(i.accountType) },
      permissions: i.permissions ?? { contents: 'read', metadata: 'read' },
      suspended_at: i.suspended ? new Date(0).toISOString() : null,
      app_id: 1,
      target_id: i.id,
      target_type: capitalize(i.accountType),
      repository_selection: 'all',
      events: ['push', 'create', 'delete'],
      created_at: new Date(0).toISOString(),
      updated_at: new Date(0).toISOString(),
      single_file_name: null,
    };
  }

  private repoJson(r: MockRepo) {
    return {
      id: Math.abs(hashString(`${r.owner}/${r.repo}`)),
      name: r.repo,
      full_name: `${r.owner}/${r.repo}`,
      owner: { login: r.owner, id: 1, type: 'Organization' },
      private: r.private,
      description: r.description ?? null,
      default_branch: r.defaultBranch,
      html_url: `https://github.com/${r.owner}/${r.repo}`,
      fork: false,
    };
  }

  private commitJson(r: MockRepo, c: MockCommit) {
    return {
      sha: c.sha,
      commit: {
        message: c.message ?? '',
        author: {
          name: c.authorName ?? 'Test',
          email: c.authorEmail ?? 'test@example.com',
          date: new Date(0).toISOString(),
        },
        tree: { sha: `tree-${c.sha}` },
      },
      html_url: `https://github.com/${r.owner}/${r.repo}/commit/${c.sha}`,
    };
  }

  private send(
    req: IncomingMessage,
    res: ServerResponse,
    status: number,
    body: unknown,
  ): void {
    this.log(req, status);
    const payload = JSON.stringify(body);
    res.writeHead(status, {
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(payload),
    });
    res.end(payload);
  }
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function capitalize(s: string): string {
  return s.length > 0 ? s[0]!.toUpperCase() + s.slice(1) : s;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}
