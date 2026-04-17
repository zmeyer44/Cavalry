import pc from 'picocolors';
import { resolveConfig } from '../config';
import { GatewayClient } from '../client';

export async function policyList(opts: {
  url?: string;
  token?: string;
  json?: boolean;
}): Promise<void> {
  const cfg = await resolveConfig(opts);
  if (!cfg.token) {
    console.error(pc.red('Not logged in. Run `cavalry login --token <...>`.'));
    process.exit(1);
  }
  const client = new GatewayClient({ url: cfg.url, token: cfg.token });
  const policies = await client.listPolicies();

  if (opts.json) {
    process.stdout.write(JSON.stringify(policies, null, 2) + '\n');
    return;
  }

  if (policies.length === 0) {
    console.log(pc.dim('No active policies. Every install is currently allowed.'));
    return;
  }

  console.log(pc.bold('Active policies (highest priority first):'));
  for (const p of policies) {
    const status = p.enabled ? pc.green('●') : pc.dim('○');
    const scope =
      p.scopeType === 'workspace' && p.scopeId
        ? pc.dim(` · ws:${p.scopeId.slice(0, 8)}`)
        : '';
    console.log(
      `  ${status} ${pc.cyan(p.type.padEnd(18))} ${p.name} ${pc.dim(
        `(priority ${p.priority})`,
      )}${scope}`,
    );
  }
}
