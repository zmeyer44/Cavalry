/**
 * Types shared across all git providers.
 *
 * The GitProvider interface defined here is intentionally minimal: it covers
 * the subset of upstream operations Cavalry needs on the request path and in
 * the sync engine. Long-lived clones are explicitly out of scope; all reads
 * go through the provider API at specific refs.
 */

export type ProviderName = 'github' | 'gitlab' | 'bitbucket';

export interface Installation {
  id: string;
  externalId: string;
  provider: ProviderName;
  accountLogin: string;
  accountType: 'user' | 'organization';
  /** Snapshot of scopes/permissions granted to this installation. */
  permissions: Record<string, unknown>;
  suspendedAt: Date | null;
}

export interface InstallationToken {
  token: string;
  expiresAt: Date;
}

export interface RepoSummary {
  owner: string;
  repo: string;
  defaultBranch: string;
  private: boolean;
  /** For UI display; not load-bearing. */
  description?: string;
}

export interface TreeEntry {
  /** Path relative to the repo root. */
  path: string;
  /** 'blob' for files, 'tree' for directories, 'commit' for submodule pointers. */
  type: 'blob' | 'tree' | 'commit';
  /** Blob SHA (for files) or tree SHA (for directories). */
  sha: string;
  /** Byte size for blobs; undefined for trees. */
  size?: number;
}

export interface Tag {
  name: string;
  /** The commit SHA the tag points at (peeled if annotated). */
  commitSha: string;
}

export interface Commit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: Date;
  };
}

export interface OpenPullRequestParams {
  owner: string;
  repo: string;
  head: string;
  base: string;
  title: string;
  body?: string;
}

export interface PullRequestResult {
  url: string;
  number: number;
}

export type WebhookVerifyResult =
  | {
      ok: true;
      deliveryId: string;
      eventType: string;
      payload: Record<string, unknown>;
    }
  | {
      ok: false;
      status: 401 | 400;
      reason: string;
    };

export interface GitProvider {
  readonly provider: ProviderName;

  /** Verify a webhook signature and return the parsed event on success. */
  verifyWebhookSignature(
    headers: Headers | Record<string, string | string[] | undefined>,
    rawBody: Buffer,
  ): Promise<WebhookVerifyResult>;

  /** List installations this App can see (admin/setup helper). */
  listInstallations(): Promise<Installation[]>;

  /** Mint (or reuse a cached) short-lived installation token. */
  getInstallationToken(installationId: string): Promise<InstallationToken>;

  /** List repos accessible to the given installation. */
  listRepositoriesForInstallation(
    installationId: string,
  ): AsyncIterable<RepoSummary>;

  /** Read a file at a specific ref. Returns null on 404. */
  readFile(params: {
    installationId: string;
    owner: string;
    repo: string;
    path: string;
    ref: string;
  }): Promise<Buffer | null>;

  /** List tree entries at a ref. Optional path for subtree. */
  listTree(params: {
    installationId: string;
    owner: string;
    repo: string;
    ref: string;
    path?: string;
    recursive?: boolean;
  }): AsyncIterable<TreeEntry>;

  /** List git tags with peeled commit SHAs. */
  listTags(params: {
    installationId: string;
    owner: string;
    repo: string;
  }): AsyncIterable<Tag>;

  /** Read a commit's metadata. */
  getCommit(params: {
    installationId: string;
    owner: string;
    repo: string;
    sha: string;
  }): Promise<Commit | null>;

  /**
   * Open a pull request. Only used by the M6 UI edit flow — kept on the
   * interface now so the permission surface is set at install time.
   */
  openPullRequest(params: {
    installationId: string;
    params: OpenPullRequestParams;
  }): Promise<PullRequestResult>;
}
