import pc from 'picocolors';
import { loadUserConfig, saveUserConfig } from '../config';

export interface LoginOptions {
  url?: string;
  token?: string;
}

export async function login(opts: LoginOptions): Promise<void> {
  if (!opts.token) {
    console.error(
      pc.red(
        'Error: cavalry login requires --token (or paste it from the dashboard Settings → API tokens)',
      ),
    );
    process.exit(1);
  }
  const existing = await loadUserConfig();
  const url = opts.url ?? existing.url ?? 'http://localhost:3001';
  await saveUserConfig({ ...existing, url, token: opts.token });
  console.log(pc.green(`✓ Logged in. Gateway: ${url}`));
}

export async function logout(): Promise<void> {
  const existing = await loadUserConfig();
  delete existing.token;
  await saveUserConfig(existing);
  console.log(pc.green('✓ Logged out'));
}
