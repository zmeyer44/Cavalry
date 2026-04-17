export default function ApiRef() {
  return (
    <article>
      <h1>Gateway REST API</h1>
      <p>
        The Cavalry gateway exposes a small, stable HTTP API consumed by the CLI and
        by AI agents via MCP. All endpoints live under <code>/v1/</code> and
        authenticate with a Bearer token.
      </p>

      <h2>Authentication</h2>
      <pre>
        <code>Authorization: Bearer cav_...</code>
      </pre>
      <p>
        Tokens are created in the web UI under{' '}
        <code>/[org]/settings/tokens</code>. Each token is scoped (
        <code>skills:read</code>, <code>skills:write</code>,{' '}
        <code>skills:install</code>) and shown once at creation.
      </p>

      <h2>Errors</h2>
      <p>
        Errors use{' '}
        <a href="https://datatracker.ietf.org/doc/html/rfc7807">RFC 7807</a>{' '}
        problem+json:
      </p>
      <pre>
        <code>{`{
  "type": "https://cavalry.sh/errors/policy-violation",
  "title": "policy_violation",
  "status": 403,
  "detail": "blocked by \\"no-tessl\\"",
  "policyId": "pol_...",
  "policyName": "no-tessl",
  "decision": "deny"
}`}</code>
      </pre>

      <h2>Endpoints</h2>

      <h3>Private registry</h3>
      <ul>
        <li>
          <code>GET /v1/skills/:namespace/:name</code> — metadata + version list
        </li>
        <li>
          <code>GET /v1/skills/:namespace/:name/:version</code> — manifest
        </li>
        <li>
          <code>GET /v1/skills/:namespace/:name/:version/artifact</code> — streams
          the gzipped tarball. <strong>Policy-enforced.</strong>
        </li>
        <li>
          <code>POST /v1/skills/:namespace/:name/versions</code> — multipart publish
          (manifest + artifact)
        </li>
      </ul>

      <h3>Proxy (upstream registries)</h3>
      <ul>
        <li>
          <code>GET /v1/proxy/:registry/:namespace/:name</code>
        </li>
        <li>
          <code>GET /v1/proxy/:registry/:namespace/:name/:version</code>
        </li>
        <li>
          <code>GET /v1/proxy/:registry/:namespace/:name/:version/artifact</code> —{' '}
          <strong>Policy-enforced.</strong>
        </li>
      </ul>
      <p>
        The gateway caches artifacts in content-addressed storage; subsequent
        requests return <code>x-cavalry-cache: HIT</code>.
      </p>

      <h3>Governance</h3>
      <ul>
        <li>
          <code>GET /v1/policies</code> — read-only projection used by{' '}
          <code>cavalry policy list</code>
        </li>
        <li>
          <code>POST /mcp</code> — JSON-RPC 2.0 MCP endpoint (see{' '}
          <a href="/mcp">MCP reference</a>)
        </li>
      </ul>

      <h3>Health</h3>
      <ul>
        <li>
          <code>GET /healthz</code> — liveness
        </li>
        <li>
          <code>GET /readyz</code> — DB connectivity + config
        </li>
        <li>
          <code>GET /metrics</code> — Prometheus format (request count, duration,
          cache hit ratio, policy decisions)
        </li>
      </ul>

      <h2>Install response headers</h2>
      <table>
        <thead>
          <tr>
            <th>Header</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>x-cavalry-skill-ref</code>
            </td>
            <td>
              Canonical install reference (e.g.{' '}
              <code>acme/kafka-wrapper@1.0.0</code>)
            </td>
          </tr>
          <tr>
            <td>
              <code>x-cavalry-artifact-hash</code>
            </td>
            <td>sha256 of the streamed tarball</td>
          </tr>
          <tr>
            <td>
              <code>x-cavalry-cache</code>
            </td>
            <td>
              <code>HIT</code> or <code>MISS</code> (proxy only)
            </td>
          </tr>
        </tbody>
      </table>
    </article>
  );
}
