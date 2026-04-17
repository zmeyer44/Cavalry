export default function Approvals() {
  return (
    <article>
      <h1>Approvals</h1>
      <p>
        A <code>require_approval</code> policy gates installs on human review. The
        gateway returns HTTP 202 with a problem+json body identifying the approval;
        the CLI exits 3 so scripts can detect pending state.
      </p>

      <h2>Lifecycle</h2>
      <ol>
        <li>
          First attempt: gateway creates an{' '}
          <code>approvals</code> row with status <code>pending</code>, inserts an
          install row with <code>result='pending_approval'</code>, and emits{' '}
          <code>approval.requested</code>.
        </li>
        <li>
          Duplicate attempts while pending return the same approval id (no pile-up
          of duplicate rows).
        </li>
        <li>
          An admin approves or denies in the UI at <code>/[org]/approvals</code> or
          via a Slack button. Slack clicks verify the Slack signing secret plus an
          embedded state token (defense-in-depth against replay).
        </li>
        <li>
          On retry: gateway finds the decided approval and either serves the
          artifact (approved → <code>install.result='allowed'</code> with{' '}
          <code>approvalId</code> stamped in metadata) or returns 403
          policy-violation (denied).
        </li>
      </ol>

      <h2>TTL</h2>
      <p>
        Pending approvals expire after 24 hours. An expired approval is effectively
        "no approval" — the next install attempt creates a fresh one.
      </p>

      <h2>Slack integration</h2>
      <p>
        Set <code>CAVALRY_SLACK_CLIENT_ID</code>,{' '}
        <code>CAVALRY_SLACK_CLIENT_SECRET</code>, and{' '}
        <code>CAVALRY_SLACK_SIGNING_SECRET</code>, then "Add to Slack" from{' '}
        <code>/[org]/settings/integrations</code>. The worker posts approval
        requests to the channel you configure; Approve/Deny buttons drive the same{' '}
        <code>approval.decide</code> path as the UI.
      </p>

      <h2>Exit codes</h2>
      <ul>
        <li>
          <code>0</code> — installed
        </li>
        <li>
          <code>2</code> — hard deny (blocklist, allowlist miss, previously-denied
          approval)
        </li>
        <li>
          <code>3</code> — pending approval (re-run after an admin decides)
        </li>
      </ul>
    </article>
  );
}
