export default function Quickstart() {
  return (
    <article>
      <h1>Quickstart</h1>
      <p>
        Run the full Cavalry stack locally in about five minutes. You'll finish with a running web
        UI, a gateway you can install skills through, and a CLI authenticated against both.
      </p>

      <h2>Requirements</h2>
      <ul>
        <li>Node.js 20+</li>
        <li>pnpm 9+</li>
        <li>Docker + docker-compose</li>
        <li>PostgreSQL client tools (optional, for debugging)</li>
      </ul>

      <h2>1. Clone and install</h2>
      <pre>
        <code>{`git clone https://github.com/zmeyer44/Cavalry
cd cavalry
cp .env.example .env
pnpm install`}</code>
      </pre>

      <h2>2. Boot Postgres + MinIO</h2>
      <pre>
        <code>{`docker compose up -d
pnpm db:migrate`}</code>
      </pre>

      <h2>3. Start the stack</h2>
      <p>In one terminal per service:</p>
      <pre>
        <code>{`pnpm --filter @cavalry/web dev       # http://localhost:3000
pnpm --filter @cavalry/gateway dev   # http://localhost:3001
pnpm --filter @cavalry/worker dev    # background jobs`}</code>
      </pre>

      <h2>4. Create your org</h2>
      <p>
        Open <a href="http://localhost:3000">http://localhost:3000</a>, sign up, and pick an org
        slug. You'll land in the onboarding wizard — step through it (or skip) to set a default
        policy, connect a registry, and invite teammates.
      </p>

      <h2>5. Publish and install a skill</h2>
      <pre>
        <code>{`# In the web UI: create an API token under Settings → API tokens
cavalry login --url http://localhost:3001 --token <paste>
cavalry init
cavalry publish .
cavalry install my-namespace/my-skill`}</code>
      </pre>

      <h2>6. Try a policy</h2>
      <p>
        Create a <code>blocklist</code> policy in <code>/[org]/policies</code> with pattern{' '}
        <code>tessl:*</code>, then try to install anything from Tessl. You'll see the RFC 7807
        problem+json response with the matching policy's name.
      </p>

      <h2>What now?</h2>
      <ul>
        <li>
          Connect a <a href="/git-repos">skill repo</a> so your internal skills sync automatically
          from git.
        </li>
        <li>
          Set up an <a href="/siem">audit webhook</a> to forward events to Splunk or Datadog.
        </li>
        <li>
          Read the <a href="/architecture">architecture</a> overview to understand how everything
          fits together.
        </li>
      </ul>
    </article>
  );
}
