import pc from 'picocolors';
import { request } from 'undici';
import { resolveConfig } from '../config';

export async function whoami(opts: { url?: string; token?: string }): Promise<void> {
  const cfg = await resolveConfig(opts);
  if (!cfg.token) {
    console.error(pc.red('Not logged in. Run `cavalry login --token <...>`.'));
    process.exit(1);
  }
  const res = await request(`${cfg.url.replace(/\/$/, '')}/healthz`, {
    headers: { authorization: `Bearer ${cfg.token}` },
  });
  if (res.statusCode >= 400) {
    console.error(pc.red(`Gateway unhealthy: HTTP ${res.statusCode}`));
    process.exit(1);
  }
  console.log(pc.bold('Gateway:'), cfg.url);
  console.log(pc.bold('Token:  '), pc.dim(`${cfg.token.slice(0, 12)}…`));
  console.log(pc.green('✓ Authenticated'));
}
