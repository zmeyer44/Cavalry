export default function Mcp() {
  return (
    <article>
      <h1>MCP endpoint</h1>
      <p>
        The gateway speaks a minimal dialect of the{' '}
        <a href="https://spec.modelcontextprotocol.io">Model Context Protocol</a>{' '}
        over a single HTTP POST. Enough for Claude Code, Cursor, and other agents
        to discover skills through Cavalry's policy layer.
      </p>

      <h2>Endpoint</h2>
      <pre>
        <code>{`POST /mcp
Authorization: Bearer cav_...
Content-Type: application/json`}</code>
      </pre>

      <h2>Supported methods</h2>

      <h3>initialize</h3>
      <pre>
        <code>{`{"jsonrpc":"2.0","id":1,"method":"initialize","params":{
  "protocolVersion":"2025-03-26","capabilities":{}
}}`}</code>
      </pre>
      <p>Returns protocol version + server info + advertised capabilities.</p>

      <h3>tools/list</h3>
      <p>
        Returns two tools: <code>list_skills</code> and <code>get_skill</code>.
      </p>

      <h3>tools/call — list_skills</h3>
      <pre>
        <code>{`{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{
  "name":"list_skills",
  "arguments":{"query":"kafka","limit":25}
}}`}</code>
      </pre>
      <p>
        The gateway evaluates <strong>every</strong> skill through the org's
        policies and drops anything that would be denied. An agent can never
        discover a skill via MCP that would be blocked via HTTP.
      </p>

      <h3>tools/call — get_skill</h3>
      <pre>
        <code>{`{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{
  "name":"get_skill",
  "arguments":{"namespace":"acme","name":"kafka-wrapper"}
}}`}</code>
      </pre>
      <p>
        Returns manifest summary + the policy decision. Denied skills still return
        with <code>decision: "deny"</code> so the agent can surface the reason to
        the user.
      </p>

      <h3>ping</h3>
      <p>Heartbeat; returns an empty result.</p>

      <h2>Notes</h2>
      <ul>
        <li>
          Single POST only; SSE transport lands in a later milestone alongside
          streaming-heavy tools.
        </li>
        <li>Batch requests are supported — send an array of JSON-RPC requests.</li>
        <li>
          Authentication is the same Bearer token used for <code>/v1/*</code>. The
          token's org scopes what the agent sees.
        </li>
      </ul>
    </article>
  );
}
