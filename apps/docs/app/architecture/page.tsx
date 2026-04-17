export default function Architecture() {
  return (
    <article>
      <h1>Architecture</h1>
      <p>
        Cavalry runs as three long-lived processes backed by Postgres and an S3-
        compatible object store. Each process has a distinct failure-isolation
        profile; you can scale them independently.
      </p>

      <h2>Processes</h2>
      <ul>
        <li>
          <strong>apps/web</strong> — Next.js control plane. Serves the UI, the tRPC
          API, and inbound webhooks (GitHub App, Slack interactions).
        </li>
        <li>
          <strong>apps/gateway</strong> — Hono HTTP service. Every install flows
          through here. Evaluates policy, serves cached artifacts, proxies upstream
          registries, and exposes the MCP endpoint.
        </li>
        <li>
          <strong>services/worker</strong> — pg-boss-backed background runner for git
          syncs, audit webhook delivery, and Slack approval posts.
        </li>
      </ul>

      <h2>Shared infrastructure</h2>
      <ul>
        <li>
          <strong>PostgreSQL 16</strong> — single source of truth for all metadata.
          pg-boss creates its own schema; Cavalry uses the <code>public</code>{' '}
          schema.
        </li>
        <li>
          <strong>S3-compatible storage</strong> — content-addressed tarballs for
          every published and proxied skill. MinIO works locally.
        </li>
      </ul>

      <h2>Data flow: developer installs a skill</h2>
      <ol>
        <li>
          Developer runs <code>cavalry install tessl:stripe/stripe</code>.
        </li>
        <li>
          CLI resolves the token + gateway URL, sends GET to{' '}
          <code>/v1/proxy/tessl/stripe/stripe/:version/artifact</code>.
        </li>
        <li>
          Gateway authenticates the token, loads the org's policies, and calls the
          pure policy engine. On deny it returns 403 with problem+json; on pending
          approval it creates an approval row and returns 202; on allow it proceeds.
        </li>
        <li>
          Cache hit? Serve from storage. Cache miss? Fetch upstream, content-address,
          store, record install + audit event.
        </li>
        <li>
          CLI streams the tar.gz into <code>.cavalry/skills/&lt;ns&gt;/&lt;name&gt;</code>{' '}
          and verifies the sha256.
        </li>
      </ol>

      <h2>Data flow: git-backed skill sync</h2>
      <ol>
        <li>Platform team installs the Cavalry GitHub App on their org.</li>
        <li>
          They connect a repo as a skill source; Cavalry probes <code>cavalry.yaml</code>{' '}
          and kicks off an initial sync.
        </li>
        <li>
          Developer pushes a tag matching the configured pattern (
          <code>{'{skill}/v{version}'}</code> by default).
        </li>
        <li>
          Webhook verifies the HMAC signature, dedupes by delivery id, and enqueues a
          git-sync job.
        </li>
        <li>
          Worker: acquires a Postgres advisory lock, reads the skill directory via
          the provider API (no clone), builds a deterministic tarball, inserts an
          immutable skill_version row, emits <code>skill.published</code>.
        </li>
        <li>
          Force-pushed tags are detected and raise a{' '}
          <code>skill_repo.force_push_detected</code> security event. The existing
          version is never re-derived.
        </li>
      </ol>

      <h2>Security boundaries</h2>
      <ul>
        <li>
          <strong>Cavalry never writes to customer git repositories on the content
          path.</strong> Any UI-driven edit opens a pull request.
        </li>
        <li>
          <strong>Installs are always served from content-addressed storage.</strong>{' '}
          A git or upstream outage does not affect previously-synced installs.
        </li>
        <li>
          <strong>skill_versions are immutable.</strong> Once inserted, they are
          never updated. Force-pushes raise an alert instead of rewriting history.
        </li>
        <li>
          <strong>Secrets (registry tokens, Slack bot tokens, webhook signing keys)
          are envelope-encrypted at rest</strong> via AES-256-GCM keyed off{' '}
          <code>CAVALRY_ENCRYPTION_KEY</code>.
        </li>
      </ul>
    </article>
  );
}
