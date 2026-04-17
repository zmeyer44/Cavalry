export default function Home() {
  return (
    <article>
      <h1>Cavalry</h1>
      <p>
        <strong>
          Governance, observability, and control for AI agent context at enterprise
          scale.
        </strong>
      </p>
      <p>
        Cavalry is a self-hostable control plane for the skills, tiles, rules, and MCP
        servers your engineering organization uses with AI coding agents. It sits
        between your developers and every public or private context source and gives
        platform and security teams:
      </p>
      <ul>
        <li>
          <strong>A proxy gateway</strong> for public registries (Tessl, GitHub,
          generic HTTP) so every install is authenticated, audited, and cached.
        </li>
        <li>
          <strong>A private registry</strong> for org-internal skills, either directly
          published or synced from customer-owned git repositories.
        </li>
        <li>
          <strong>A policy engine</strong> with allowlists, blocklists, version pins,
          and approval gates — enforced at the install hot path.
        </li>
        <li>
          <strong>A complete audit trail</strong> of every install, publish, policy
          decision, and sync, with SIEM webhook delivery.
        </li>
        <li>
          <strong>Integrations</strong> for GitHub Apps (skill repo sync), Slack
          (approval notifications), and OIDC (SSO).
        </li>
      </ul>

      <h2>Where to go next</h2>
      <ul>
        <li>
          <a href="/quickstart">Quickstart</a> — run Cavalry locally in 5 minutes with
          docker-compose.
        </li>
        <li>
          <a href="/architecture">Architecture</a> — how web, gateway, and worker fit
          together.
        </li>
        <li>
          <a href="/policies">Policies</a> — enforce rules on what can be installed.
        </li>
        <li>
          <a href="/cli">CLI reference</a> — every command the <code>cavalry</code>{' '}
          binary supports.
        </li>
        <li>
          <a href="/api">Gateway REST API</a> — the endpoints the CLI and agents call.
        </li>
      </ul>

      <h2>License</h2>
      <p>
        Cavalry is licensed under the{' '}
        <a href="https://mariadb.com/bsl11/">Business Source License 1.1</a>, which
        permits self-hosting and production use but prohibits running a hosted
        competitive service. The license converts to Apache 2.0 three years after each
        release.
      </p>
    </article>
  );
}
