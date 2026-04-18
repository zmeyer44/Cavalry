import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface GitHubAppConfig {
  appId: string;
  /** PEM text, or a path prefixed with `@` (e.g. `@/etc/cavalry/github.pem`). */
  privateKey: string;
  webhookSecret: string;
  clientId?: string;
  clientSecret?: string;
  /** Optional enterprise server base URL; unset for github.com. */
  apiBaseUrl?: string;
}

/**
 * Resolve a private key config value: either raw PEM text or `@/path/to/key.pem`.
 * Throws if the value is empty or the referenced file cannot be read.
 */
export function resolvePrivateKey(value: string): string {
  if (!value.trim()) {
    throw new Error('GitHub App private key is empty');
  }
  if (value.startsWith('@')) {
    const path = resolve(value.slice(1));
    return readFileSync(path, 'utf8');
  }
  return value;
}

/**
 * Build a GitHubAppConfig from process.env. Returns null if no App is
 * configured — callers should treat this as "git integration disabled"
 * rather than an error, since self-hosted deployments may skip M3.5.
 */
export function gitHubAppConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): GitHubAppConfig | null {
  const appId = env.CAVALRY_GITHUB_APP_ID;
  const privateKey = env.CAVALRY_GITHUB_APP_PRIVATE_KEY;
  const webhookSecret = env.CAVALRY_GITHUB_APP_WEBHOOK_SECRET;
  if (!appId || !privateKey || !webhookSecret) return null;
  return {
    appId,
    privateKey: resolvePrivateKey(privateKey),
    webhookSecret,
    clientId: env.CAVALRY_GITHUB_APP_CLIENT_ID || undefined,
    clientSecret: env.CAVALRY_GITHUB_APP_CLIENT_SECRET || undefined,
    apiBaseUrl: env.CAVALRY_GITHUB_APP_API_URL || undefined,
  };
}
