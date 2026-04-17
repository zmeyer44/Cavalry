export default function Policies() {
  return (
    <article>
      <h1>Policies</h1>
      <p>
        A policy tells the gateway what to do when a specific{' '}
        <code>&lt;source&gt;:&lt;namespace&gt;/&lt;name&gt;</code> is about to be
        installed. Four types cover the common cases.
      </p>

      <h2>Decision algorithm</h2>
      <ol>
        <li>Filter to policies that are enabled and match the scope (org or workspace).</li>
        <li>Sort by priority descending, then createdAt descending.</li>
        <li>
          Walk in order; the first non-<code>allow</code> decision wins. All
          applicable policies produce an evaluation record (matched or not).
        </li>
        <li>
          If every applicable policy allows (or none apply), the install proceeds.
        </li>
      </ol>

      <h2>Canonical skill id</h2>
      <p>
        Patterns match against the normalized string{' '}
        <code>&lt;source&gt;:&lt;namespace&gt;/&lt;name&gt;</code> where source is one
        of <code>internal</code>, <code>tessl</code>, <code>github</code>, or{' '}
        <code>http</code>.
      </p>

      <h2>Types</h2>

      <h3>allowlist</h3>
      <pre>
        <code>{`{
  "patterns": ["internal:*", "tessl:stripe/*", "tessl:aws/*"]
}`}</code>
      </pre>
      <p>
        Only installs whose id matches one of the patterns are allowed; everything
        else is denied with reason <code>not on allowlist "&lt;policy&gt;"</code>.
      </p>

      <h3>blocklist</h3>
      <pre>
        <code>{`{
  "patterns": ["tessl:badactor/*", "github:*/malicious-*"]
}`}</code>
      </pre>
      <p>Installs matching any pattern are denied.</p>

      <h3>version_pin</h3>
      <pre>
        <code>{`{
  "rules": [
    { "pattern": "tessl:react/*", "range": "^18.0.0" }
  ]
}`}</code>
      </pre>
      <p>
        For installs matching <code>pattern</code>, only versions satisfying{' '}
        <code>range</code> (semver 2.0) are allowed. When the caller doesn't pin a
        version, the pin skips evaluation so higher-priority policies still apply.
      </p>

      <h3>require_approval</h3>
      <pre>
        <code>{`{
  "patterns": ["*"],
  "exceptions": ["internal:*"]
}`}</code>
      </pre>
      <p>
        Installs matching <code>patterns</code> but not{' '}
        <code>exceptions</code> return HTTP 202 with an approval id. The CLI exits
        with code 3; the developer re-runs after an admin decides the approval.
      </p>

      <h2>Glob syntax</h2>
      <p>
        Patterns use shell globs (picomatch <code>bash: true</code>, no nocase).
        Quick reference:
      </p>
      <ul>
        <li>
          <code>*</code> — any characters (including <code>/</code> in this mode)
        </li>
        <li>
          <code>tessl:stripe/*</code> — anything under <code>tessl:stripe/</code>
        </li>
        <li>
          <code>*:badactor/*</code> — any source, namespace <code>badactor</code>
        </li>
        <li>
          <code>tessl:{'{aws,gcp}'}/*</code> — brace expansion
        </li>
      </ul>

      <h2>Preview</h2>
      <p>
        The <code>/[org]/policies</code> page has a Preview pane that evaluates a
        candidate skill reference against your current policy set without creating
        anything. Use it when rolling out new rules.
      </p>
    </article>
  );
}
