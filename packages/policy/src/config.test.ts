import { describe, it, expect } from 'vitest';
import { parsePolicyConfig } from './config';

describe('parsePolicyConfig', () => {
  it('accepts a valid allowlist', () => {
    const cfg = parsePolicyConfig('allowlist', { patterns: ['tessl:stripe/*'] });
    expect(cfg).toEqual({ patterns: ['tessl:stripe/*'] });
  });

  it('rejects empty patterns array', () => {
    expect(() => parsePolicyConfig('allowlist', { patterns: [] })).toThrow();
  });

  it('rejects unknown top-level keys', () => {
    expect(() =>
      parsePolicyConfig('allowlist', { patterns: ['a'], extra: true }),
    ).toThrow();
  });

  it('accepts blocklist', () => {
    const cfg = parsePolicyConfig('blocklist', {
      patterns: ['tessl:badactor/*'],
    });
    expect(cfg).toEqual({ patterns: ['tessl:badactor/*'] });
  });

  it('accepts version_pin', () => {
    const cfg = parsePolicyConfig('version_pin', {
      rules: [{ pattern: 'tessl:react/*', range: '^18.0.0' }],
    });
    expect(cfg).toMatchObject({ rules: [{ range: '^18.0.0' }] });
  });

  it('rejects version_pin with no rules', () => {
    expect(() => parsePolicyConfig('version_pin', { rules: [] })).toThrow();
  });

  it('accepts require_approval with and without exceptions', () => {
    expect(
      parsePolicyConfig('require_approval', { patterns: ['*'] }),
    ).toMatchObject({ patterns: ['*'] });
    expect(
      parsePolicyConfig('require_approval', {
        patterns: ['*'],
        exceptions: ['internal:*'],
      }),
    ).toMatchObject({ exceptions: ['internal:*'] });
  });
});
