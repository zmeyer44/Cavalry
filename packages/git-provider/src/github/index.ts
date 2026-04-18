import { App } from '@octokit/app';
import { Octokit } from '@octokit/core';
import { RequestError } from '@octokit/request-error';
import type {
  Commit,
  GitProvider,
  Installation,
  InstallationToken,
  OpenPullRequestParams,
  ProviderName,
  PullRequestResult,
  RepoSummary,
  Tag,
  TreeEntry,
  WebhookVerifyResult,
} from '../types';
import type { GitHubAppConfig } from '../config';

/**
 * Thin GitProvider implementation backed by @octokit/app. Heavy API surface
 * stays in octokit; this file just maps octokit responses to our narrow types.
 *
 * Installation tokens are cached by @octokit/app's token cache, so we don't
 * manage expiry ourselves — every call to getInstallationOctokit reuses a
 * valid token where possible and refreshes when within the clock skew.
 */
export class GitHubProvider implements GitProvider {
  readonly provider: ProviderName = 'github';
  private readonly app: App;
  private readonly config: GitHubAppConfig;

  constructor(config: GitHubAppConfig) {
    this.config = config;
    const CustomOctokit = config.apiBaseUrl
      ? Octokit.defaults({ baseUrl: config.apiBaseUrl })
      : undefined;
    this.app = new App({
      appId: config.appId,
      privateKey: config.privateKey,
      webhooks: { secret: config.webhookSecret },
      oauth: config.clientId
        ? {
            clientId: config.clientId,
            clientSecret: config.clientSecret ?? '',
          }
        : { clientId: '', clientSecret: '' },
      ...(CustomOctokit ? { Octokit: CustomOctokit } : {}),
    });
  }

  async verifyWebhookSignature(
    headers: Headers | Record<string, string | string[] | undefined>,
    rawBody: Buffer,
  ): Promise<WebhookVerifyResult> {
    const get = (name: string): string | undefined => {
      if (typeof (headers as Headers).get === 'function') {
        return (headers as Headers).get(name) ?? undefined;
      }
      const h = headers as Record<string, string | string[] | undefined>;
      const lower = name.toLowerCase();
      const value =
        h[name] ??
        h[lower] ??
        h[name.toUpperCase()];
      if (Array.isArray(value)) return value[0];
      return value;
    };

    const signature = get('x-hub-signature-256');
    const deliveryId = get('x-github-delivery');
    const eventType = get('x-github-event');

    if (!signature || !deliveryId || !eventType) {
      return { ok: false, status: 400, reason: 'missing signature or event headers' };
    }

    const bodyText = rawBody.toString('utf8');
    const verified = await this.app.webhooks.verify(bodyText, signature);
    if (!verified) {
      return { ok: false, status: 401, reason: 'invalid signature' };
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(bodyText) as Record<string, unknown>;
    } catch {
      return { ok: false, status: 400, reason: 'invalid json body' };
    }

    return { ok: true, deliveryId, eventType, payload };
  }

  async listInstallations(): Promise<Installation[]> {
    const out: Installation[] = [];
    // @octokit/app exposes an async iterator for installations
    for await (const { installation } of this.app.eachInstallation.iterator()) {
      out.push(this.mapInstallation(installation));
    }
    return out;
  }

  async getInstallationToken(installationId: string): Promise<InstallationToken> {
    const response = await this.app.octokit.request(
      'POST /app/installations/{installation_id}/access_tokens',
      { installation_id: Number(installationId) },
    );
    return {
      token: response.data.token,
      expiresAt: new Date(response.data.expires_at),
    };
  }

  async *listRepositoriesForInstallation(
    installationId: string,
  ): AsyncIterable<RepoSummary> {
    for await (const { repository } of this.app.eachRepository.iterator({
      installationId: Number(installationId),
    })) {
      yield {
        owner: repository.owner.login,
        repo: repository.name,
        defaultBranch: repository.default_branch ?? 'main',
        private: Boolean(repository.private),
        description: repository.description ?? undefined,
      };
    }
  }

  async readFile(params: {
    installationId: string;
    owner: string;
    repo: string;
    path: string;
    ref: string;
  }): Promise<Buffer | null> {
    const octokit = await this.app.getInstallationOctokit(
      Number(params.installationId),
    );
    try {
      const response = await octokit.request(
        'GET /repos/{owner}/{repo}/contents/{path}',
        {
          owner: params.owner,
          repo: params.repo,
          path: params.path,
          ref: params.ref,
          mediaType: { format: 'raw' },
        },
      );
      // With mediaType: 'raw', response.data is a string (file contents).
      const data = response.data as unknown;
      if (typeof data === 'string') return Buffer.from(data, 'utf8');
      if (data instanceof ArrayBuffer) return Buffer.from(data);
      if (Buffer.isBuffer(data)) return data;
      // Fallback: object with base64-encoded content
      if (data && typeof data === 'object' && 'content' in data) {
        const content = (data as { content?: string; encoding?: string }).content;
        if (content) return Buffer.from(content, 'base64');
      }
      return null;
    } catch (err) {
      if (err instanceof RequestError && err.status === 404) return null;
      throw err;
    }
  }

  async *listTree(params: {
    installationId: string;
    owner: string;
    repo: string;
    ref: string;
    path?: string;
    recursive?: boolean;
  }): AsyncIterable<TreeEntry> {
    const octokit = await this.app.getInstallationOctokit(
      Number(params.installationId),
    );

    // Resolve the ref → commit sha → tree sha if we need recursive listing
    // at a subdirectory. For a simple listing at repo root at a ref, use the
    // git trees API directly which supports `?recursive=1`.
    const commit = await octokit.request(
      'GET /repos/{owner}/{repo}/commits/{ref}',
      { owner: params.owner, repo: params.repo, ref: params.ref },
    );
    const rootTreeSha = commit.data.commit.tree.sha;

    let targetTreeSha = rootTreeSha;
    if (params.path) {
      // Walk the path segments to find the subtree sha.
      const segments = params.path.split('/').filter(Boolean);
      let currentSha = rootTreeSha;
      for (const seg of segments) {
        const tree = await octokit.request(
          'GET /repos/{owner}/{repo}/git/trees/{tree_sha}',
          { owner: params.owner, repo: params.repo, tree_sha: currentSha },
        );
        const match = tree.data.tree.find(
          (entry) => entry.path === seg && entry.type === 'tree',
        );
        if (!match?.sha) return;
        currentSha = match.sha;
      }
      targetTreeSha = currentSha;
    }

    const tree = await octokit.request(
      'GET /repos/{owner}/{repo}/git/trees/{tree_sha}',
      {
        owner: params.owner,
        repo: params.repo,
        tree_sha: targetTreeSha,
        recursive: params.recursive ? '1' : undefined,
      },
    );

    for (const entry of tree.data.tree) {
      if (!entry.path || !entry.type || !entry.sha) continue;
      yield {
        path: entry.path,
        type: entry.type as TreeEntry['type'],
        sha: entry.sha,
        size: entry.size,
      };
    }
  }

  async *listTags(params: {
    installationId: string;
    owner: string;
    repo: string;
  }): AsyncIterable<Tag> {
    const octokit = await this.app.getInstallationOctokit(
      Number(params.installationId),
    );
    // /tags returns commit SHA directly; annotated tags are pre-peeled.
    // Manual pagination loop via Link header — keeps us off @octokit/plugin-paginate-rest.
    let page = 1;
    const perPage = 100;
    for (;;) {
      const response = await octokit.request('GET /repos/{owner}/{repo}/tags', {
        owner: params.owner,
        repo: params.repo,
        per_page: perPage,
        page,
      });
      for (const tag of response.data) {
        if (!tag.name || !tag.commit?.sha) continue;
        yield { name: tag.name, commitSha: tag.commit.sha };
      }
      if (response.data.length < perPage) return;
      page += 1;
    }
  }

  async getCommit(params: {
    installationId: string;
    owner: string;
    repo: string;
    sha: string;
  }): Promise<Commit | null> {
    const octokit = await this.app.getInstallationOctokit(
      Number(params.installationId),
    );
    try {
      const response = await octokit.request(
        'GET /repos/{owner}/{repo}/commits/{ref}',
        { owner: params.owner, repo: params.repo, ref: params.sha },
      );
      const c = response.data.commit;
      return {
        sha: response.data.sha,
        message: c.message,
        author: {
          name: c.author?.name ?? '',
          email: c.author?.email ?? '',
          date: c.author?.date ? new Date(c.author.date) : new Date(0),
        },
      };
    } catch (err) {
      if (err instanceof RequestError && err.status === 404) return null;
      throw err;
    }
  }

  async openPullRequest(args: {
    installationId: string;
    params: OpenPullRequestParams;
  }): Promise<PullRequestResult> {
    const octokit = await this.app.getInstallationOctokit(
      Number(args.installationId),
    );
    const response = await octokit.request('POST /repos/{owner}/{repo}/pulls', {
      owner: args.params.owner,
      repo: args.params.repo,
      head: args.params.head,
      base: args.params.base,
      title: args.params.title,
      body: args.params.body,
    });
    return { url: response.data.html_url, number: response.data.number };
  }

  private mapInstallation(installation: {
    id: number;
    account: { login?: string; type?: string } | null;
    permissions?: Record<string, unknown>;
    suspended_at?: string | null;
  }): Installation {
    return {
      id: String(installation.id),
      externalId: String(installation.id),
      provider: 'github',
      accountLogin: installation.account?.login ?? '',
      accountType:
        installation.account?.type === 'Organization' ? 'organization' : 'user',
      permissions: (installation.permissions ?? {}) as Record<string, unknown>,
      suspendedAt: installation.suspended_at
        ? new Date(installation.suspended_at)
        : null,
    };
  }
}

export function createGitHubProvider(config: GitHubAppConfig): GitProvider {
  return new GitHubProvider(config);
}
