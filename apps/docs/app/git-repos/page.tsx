export default function GitRepos() {
  return (
    <article>
      <h1>Skill repos (git-backed)</h1>
      <p>
        Customer-owned git repositories are first-class skill sources. Git remains
        the source of truth; Cavalry indexes, syncs, and serves — it never writes
        content to your repo on the content path.
      </p>

      <h2>Setup (GitHub)</h2>
      <ol>
        <li>
          Register a per-deployment GitHub App (see{' '}
          <a href="https://docs.github.com/en/apps">GitHub Apps docs</a>). Permissions:{' '}
          <code>Contents: Read</code>, <code>Metadata: Read</code>,{' '}
          <code>Pull requests: Read &amp; write</code>. Subscribe to{' '}
          <code>push</code>, <code>create</code>, <code>delete</code>,{' '}
          <code>installation</code>, <code>installation_repositories</code>.
        </li>
        <li>
          Set <code>CAVALRY_GITHUB_APP_ID</code>,{' '}
          <code>CAVALRY_GITHUB_APP_PRIVATE_KEY</code>,{' '}
          <code>CAVALRY_GITHUB_APP_WEBHOOK_SECRET</code>,{' '}
          <code>CAVALRY_GITHUB_APP_SLUG</code>.
        </li>
        <li>
          Point the App's webhook URL at{' '}
          <code>&lt;CAVALRY_WEB_URL&gt;/api/webhooks/github</code>.
        </li>
        <li>
          In the UI at <code>/[org]/skill-repos/connect</code>, click "Install on
          GitHub", install on your org, pick a repo, confirm.
        </li>
      </ol>

      <h2>cavalry.yaml</h2>
      <p>
        The repo must have a <code>cavalry.yaml</code> on its default branch. Minimal:
      </p>
      <pre>
        <code>{`version: 1
skills:
  - path: "skills/*"
releases:
  tag_pattern: "{skill}/v{version}"
defaults:
  namespace: acme-platform
  targets: ["claude-code", "cursor"]`}</code>
      </pre>
      <p>
        Tagging <code>kafka-wrapper/v1.0.0</code> publishes version 1.0.0 of{' '}
        <code>acme-platform/kafka-wrapper</code>.
      </p>

      <h2>Guarantees</h2>
      <ul>
        <li>Published <code>skill_versions</code> are immutable once inserted.</li>
        <li>
          Force-pushed tags raise{' '}
          <code>skill_repo.force_push_detected</code>, flip the repo to{' '}
          <code>degraded</code>, and never overwrite existing versions.
        </li>
        <li>
          Missed webhooks are caught by the scheduled reconciler (every{' '}
          <code>CAVALRY_SYNC_RECONCILE_INTERVAL_SECONDS</code>).
        </li>
        <li>
          Disconnecting a repo archives its skills; existing versions remain
          installable for audit continuity.
        </li>
      </ul>
    </article>
  );
}
