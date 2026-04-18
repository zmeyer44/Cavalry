export default function Siem() {
  return (
    <article>
      <h1>Audit event webhooks</h1>
      <p>
        Forward every Cavalry audit event to a SIEM or internal automation. The
        worker delivers asynchronously with HMAC-SHA256 signatures and retries
        failed deliveries with exponential backoff.
      </p>

      <h2>Adding a webhook</h2>
      <ol>
        <li>
          Open <code>/[org]/settings/integrations</code>.
        </li>
        <li>
          Click <em>Add webhook</em>. Pick a format (<code>generic</code>,{' '}
          <code>splunk</code>, or <code>datadog</code>), paste the destination URL,
          and generate a shared secret.
        </li>
        <li>
          Optionally set action filters as space-separated globs (e.g.{' '}
          <code>skill.* approval.*</code>). Empty = deliver everything.
        </li>
      </ol>

      <h2>Payload shapes</h2>

      <h3>Generic</h3>
      <pre>
        <code>{`{ "event": { ...fields } }`}</code>
      </pre>

      <h3>Splunk HEC</h3>
      <pre>
        <code>{`{
  "time": 1744200000,
  "host": "cavalry",
  "source": "cavalry",
  "sourcetype": "cavalry:skill.installed",
  "event": { ...fields }
}`}</code>
      </pre>

      <h3>Datadog logs</h3>
      <pre>
        <code>{`{
  "ddsource": "cavalry",
  "service": "cavalry",
  "ddtags": "org:org_abc,action:skill.installed,actor:user",
  "message": "skill.installed skill_version:sv_abc",
  "event": { ...fields }
}`}</code>
      </pre>

      <h2>Verifying deliveries</h2>
      <p>Each request carries:</p>
      <ul>
        <li>
          <code>X-Cavalry-Signature: sha256=&lt;hex&gt;</code> — HMAC-SHA256 over the
          exact bytes of the request body
        </li>
        <li>
          <code>X-Cavalry-Delivery-Id</code> — delivery row id (dedupe if you want
          to)
        </li>
        <li>
          <code>X-Cavalry-Event-Id</code> — audit event id
        </li>
        <li>
          <code>X-Cavalry-Event-Action</code> — the action literal
        </li>
      </ul>
      <p>
        Verify by recomputing <code>sha256</code> of the raw body with your stored
        secret. Constant-time compare required (Cavalry does this for inbound
        webhook handlers too).
      </p>

      <h2>Retry policy</h2>
      <p>
        Up to 5 attempts with a backoff of 0 · 30s · 2m · 10m · 60m. Each retry
        inserts a new <code>audit_webhook_deliveries</code> row so the history is
        append-only.
      </p>
    </article>
  );
}
