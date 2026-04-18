import { describe, it, expect } from 'vitest';
import { parseCavalryYaml, buildTagMatcher } from './cavalry-yaml';

describe('parseCavalryYaml', () => {
  it('accepts a minimal valid config', () => {
    const yaml = `
version: 1
skills:
  - path: "skills/*"
releases:
  tag_pattern: "{skill}/v{version}"
defaults:
  namespace: acme-platform
`;
    const result = parseCavalryYaml(yaml);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.defaults.namespace).toBe('acme-platform');
    expect(result.value.skills[0]?.path).toBe('skills/*');
  });

  it('accepts a full config with sync options', () => {
    const yaml = `
version: 1
skills:
  - path: "skills/*"
  - path: "internal/agents/*"
releases:
  tag_pattern: "{skill}@{version}"
defaults:
  namespace: acme-platform
  license: UNLICENSED
  owner: platform-team@acme.com
  targets: ["claude-code", "cursor"]
sync:
  ignore:
    - "**/.internal/**"
    - "**/DRAFT.md"
  strict: false
`;
    const result = parseCavalryYaml(yaml);
    expect(result.ok).toBe(true);
  });

  it('rejects unknown top-level keys', () => {
    const yaml = `
version: 1
skills:
  - path: "skills/*"
releases:
  tag_pattern: "{skill}/v{version}"
defaults:
  namespace: acme-platform
extra: oops
`;
    const result = parseCavalryYaml(yaml);
    expect(result.ok).toBe(false);
  });

  it('rejects tag_pattern missing placeholders', () => {
    const yaml = `
version: 1
skills:
  - path: "skills/*"
releases:
  tag_pattern: "v{version}"
defaults:
  namespace: acme
`;
    const result = parseCavalryYaml(yaml);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.issues[0]?.message).toMatch(/placeholders/);
  });

  it('rejects wrong version literal', () => {
    const yaml = `
version: 2
skills:
  - path: "skills/*"
releases:
  tag_pattern: "{skill}/v{version}"
defaults:
  namespace: acme
`;
    const result = parseCavalryYaml(yaml);
    expect(result.ok).toBe(false);
  });

  it('rejects invalid namespace pattern', () => {
    const yaml = `
version: 1
skills:
  - path: "skills/*"
releases:
  tag_pattern: "{skill}/v{version}"
defaults:
  namespace: "ACME Platform!"
`;
    const result = parseCavalryYaml(yaml);
    expect(result.ok).toBe(false);
  });
});

describe('buildTagMatcher', () => {
  it('matches the default {skill}/v{version} pattern', () => {
    const match = buildTagMatcher('{skill}/v{version}');
    expect(match('kafka-wrapper/v1.0.0')).toEqual({
      skill: 'kafka-wrapper',
      version: '1.0.0',
    });
    expect(match('main')).toBeNull();
    expect(match('kafka-wrapper/1.0.0')).toBeNull();
  });

  it('matches @ variant', () => {
    const match = buildTagMatcher('{skill}@{version}');
    expect(match('stripe-wrapper@2.3.1')).toEqual({
      skill: 'stripe-wrapper',
      version: '2.3.1',
    });
  });

  it('handles hyphen variant and prerelease versions', () => {
    const match = buildTagMatcher('{skill}-{version}');
    expect(match('kafka-1.0.0-rc.1')).toEqual({ skill: 'kafka', version: '1.0.0-rc.1' });
  });

  it('rejects tags not matching placeholders', () => {
    const match = buildTagMatcher('{skill}/v{version}');
    expect(match('release/v1.0.0')).toEqual({ skill: 'release', version: '1.0.0' });
    expect(match('v1.0.0')).toBeNull();
  });
});
