import { describe, it, expect } from 'vitest';
import { gitHubAppConfigFromEnv, resolvePrivateKey } from './config';

describe('resolvePrivateKey', () => {
  it('returns literal PEM text unchanged', () => {
    const pem = '-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----';
    expect(resolvePrivateKey(pem)).toBe(pem);
  });

  it('throws on empty input', () => {
    expect(() => resolvePrivateKey('')).toThrow();
    expect(() => resolvePrivateKey('   ')).toThrow();
  });
});

describe('gitHubAppConfigFromEnv', () => {
  it('returns null when nothing is configured', () => {
    expect(gitHubAppConfigFromEnv({})).toBeNull();
  });

  it('returns null when any required var is missing', () => {
    expect(
      gitHubAppConfigFromEnv({
        CAVALRY_GITHUB_APP_ID: '123',
        CAVALRY_GITHUB_APP_PRIVATE_KEY: 'pem',
        // missing webhook secret
      }),
    ).toBeNull();
  });

  it('builds a config when all required vars are set', () => {
    const cfg = gitHubAppConfigFromEnv({
      CAVALRY_GITHUB_APP_ID: '123',
      CAVALRY_GITHUB_APP_PRIVATE_KEY: 'pem-text',
      CAVALRY_GITHUB_APP_WEBHOOK_SECRET: 'secret',
      CAVALRY_GITHUB_APP_CLIENT_ID: 'cid',
      CAVALRY_GITHUB_APP_CLIENT_SECRET: 'csec',
    });
    expect(cfg).not.toBeNull();
    expect(cfg?.appId).toBe('123');
    expect(cfg?.privateKey).toBe('pem-text');
    expect(cfg?.clientId).toBe('cid');
  });
});
