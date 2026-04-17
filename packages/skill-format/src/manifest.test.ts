import { describe, expect, it } from 'vitest';
import { parseManifest, skillRef } from './manifest';

const valid = {
  name: 'kafka-wrapper',
  namespace: 'acme-platform',
  version: '1.2.0',
  description: 'Teaches agents to use Acme Kafka wrapper',
  license: 'UNLICENSED',
  targets: ['claude-code', 'cursor'],
  entrypoints: { skill: 'SKILL.md', rules: ['rules/errors.md'] },
  metadata: { tags: ['internal'], owner: 'platform@acme.com' },
};

describe('parseManifest', () => {
  it('accepts a valid manifest', () => {
    const r = parseManifest(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.name).toBe('kafka-wrapper');
  });

  it('defaults targets to [generic] when omitted', () => {
    const { targets: _targets, ...base } = valid;
    const r = parseManifest(base);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.targets).toEqual(['generic']);
  });

  it('rejects invalid semver', () => {
    const r = parseManifest({ ...valid, version: 'not-semver' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.issues[0]?.path).toBe('version');
    }
  });

  it('rejects invalid namespace', () => {
    const r = parseManifest({ ...valid, namespace: 'Bad_Namespace' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.issues[0]?.path).toBe('namespace');
  });

  it('rejects unknown entrypoints keys (strict)', () => {
    const r = parseManifest({
      ...valid,
      entrypoints: { skill: 'SKILL.md', extra: 'ignored.md' },
    });
    expect(r.ok).toBe(false);
  });

  it('rejects unknown targets', () => {
    const r = parseManifest({ ...valid, targets: ['claude-code', 'my-tool'] });
    expect(r.ok).toBe(false);
  });

  it('rejects empty entrypoints.skill', () => {
    const r = parseManifest({ ...valid, entrypoints: { skill: '' } });
    expect(r.ok).toBe(false);
  });

  it('reports all issues', () => {
    const r = parseManifest({
      ...valid,
      name: 'Bad Name',
      version: 'oops',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const paths = r.error.issues.map((i) => i.path);
      expect(paths).toContain('name');
      expect(paths).toContain('version');
    }
  });
});

describe('skillRef', () => {
  it('formats ns/name@version', () => {
    expect(skillRef({ namespace: 'acme', name: 'foo', version: '1.0.0' })).toBe(
      'acme/foo@1.0.0',
    );
  });
});
