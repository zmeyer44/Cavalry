export default function CliRef() {
  return (
    <article>
      <h1>CLI reference</h1>
      <p>
        The <code>cavalry</code> binary is distributed as{' '}
        <code>@cavalry/cli</code> on npm. Install globally:
      </p>
      <pre>
        <code>{`npm install -g @cavalry/cli
cavalry --help`}</code>
      </pre>

      <h2>Configuration</h2>
      <p>Resolution order (first match wins):</p>
      <ol>
        <li>
          <code>--url</code> / <code>--token</code> flags
        </li>
        <li>
          <code>./cavalry.json</code> in the current directory or any ancestor
        </li>
        <li>
          <code>CAVALRY_URL</code> / <code>CAVALRY_TOKEN</code> env vars
        </li>
        <li>
          <code>~/.cavalry/config.json</code>
        </li>
      </ol>

      <h2>Commands</h2>

      <h3>login</h3>
      <pre>
        <code>cavalry login --url https://cavalry.company.com --token cav_...</code>
      </pre>
      <p>Saves credentials to <code>~/.cavalry/config.json</code>.</p>

      <h3>logout</h3>
      <pre>
        <code>cavalry logout</code>
      </pre>

      <h3>whoami</h3>
      <p>Shows the active gateway + token prefix.</p>

      <h3>init</h3>
      <p>
        Creates a <code>cavalry.json</code> in the current directory — used by{' '}
        <code>publish</code> for installable project metadata.
      </p>

      <h3>publish [path]</h3>
      <pre>
        <code>cavalry publish ./my-skill</code>
      </pre>
      <p>
        Packs the directory into a tarball and uploads it to your org's private
        registry. Requires a token with scope <code>skills:write</code>.
      </p>

      <h3>install &lt;ref&gt;</h3>
      <pre>
        <code>{`cavalry install acme/kafka-wrapper               # internal
cavalry install tessl:stripe/stripe              # upstream
cavalry install tessl:stripe/stripe@^2.0.0       # semver range`}</code>
      </pre>
      <p>
        Streams the artifact into <code>.cavalry/skills/&lt;ns&gt;/&lt;name&gt;</code>.
        Exit codes:
      </p>
      <ul>
        <li>
          <code>0</code> — installed
        </li>
        <li>
          <code>2</code> — hard deny by policy (see <code>cavalry policy list</code>)
        </li>
        <li>
          <code>3</code> — pending approval (retry after approval is decided)
        </li>
        <li>
          <code>1</code> — other errors (network, invalid ref, etc.)
        </li>
      </ul>

      <h3>policy list</h3>
      <pre>
        <code>cavalry policy list [--json]</code>
      </pre>
      <p>Shows active policies from the gateway's <code>/v1/policies</code> endpoint.</p>

      <h3>doctor</h3>
      <p>Basic config + connectivity check.</p>

      <h2>Environment variables</h2>
      <table>
        <thead>
          <tr>
            <th>Variable</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>CAVALRY_URL</code>
            </td>
            <td>Gateway URL (takes precedence over config)</td>
          </tr>
          <tr>
            <td>
              <code>CAVALRY_TOKEN</code>
            </td>
            <td>API token, hashed at rest server-side</td>
          </tr>
        </tbody>
      </table>
    </article>
  );
}
