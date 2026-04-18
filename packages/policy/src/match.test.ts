import { describe, it, expect } from 'vitest';
import { canonicalSkillId, matchesAny, sourcePrefix } from './match';
import type { PolicyContext } from './types';

function ctx(partial: Partial<PolicyContext['skill']>): PolicyContext {
  return {
    action: 'install',
    org: { id: 'o1' },
    workspace: null,
    actor: { userId: 'u1', tokenId: null },
    skill: {
      ref: 'x',
      namespace: 'acme-platform',
      name: 'kafka-wrapper',
      version: '1.0.0',
      source: 'internal',
      ...partial,
    },
  };
}

describe('sourcePrefix', () => {
  it('maps each source to its short prefix', () => {
    expect(sourcePrefix('internal')).toBe('internal');
    expect(sourcePrefix('tessl')).toBe('tessl');
    expect(sourcePrefix('github_public')).toBe('github');
    expect(sourcePrefix('http')).toBe('http');
  });
});

describe('canonicalSkillId', () => {
  it('builds `<source>:<namespace>/<name>`', () => {
    expect(canonicalSkillId(ctx({}))).toBe('internal:acme-platform/kafka-wrapper');
    expect(canonicalSkillId(ctx({ source: 'tessl', namespace: 'stripe', name: 'stripe' }))).toBe(
      'tessl:stripe/stripe',
    );
    expect(
      canonicalSkillId(ctx({ source: 'github_public', namespace: 'aws', name: 'cdk' })),
    ).toBe('github:aws/cdk');
  });
});

describe('matchesAny', () => {
  it('returns false for empty pattern list', () => {
    expect(matchesAny([], 'internal:foo/bar')).toBe(false);
  });
  it('matches exact patterns', () => {
    expect(matchesAny(['internal:foo/bar'], 'internal:foo/bar')).toBe(true);
    expect(matchesAny(['internal:foo/bar'], 'internal:foo/baz')).toBe(false);
  });
  it('supports * as a path segment wildcard', () => {
    expect(matchesAny(['tessl:*'], 'tessl:stripe/stripe')).toBe(true);
    expect(matchesAny(['tessl:stripe/*'], 'tessl:stripe/checkout')).toBe(true);
    expect(matchesAny(['tessl:stripe/*'], 'tessl:other/thing')).toBe(false);
  });
  it('supports ** across segments', () => {
    expect(matchesAny(['**'], 'tessl:stripe/stripe')).toBe(true);
    expect(matchesAny(['tessl:**'], 'tessl:stripe/sub/thing')).toBe(true);
  });
  it('supports namespace wildcards', () => {
    expect(matchesAny(['*:badactor/*'], 'github:badactor/skill')).toBe(true);
    // `*` with bash-mode enabled spans across `/`, which is fine — canonical
    // ids are always exactly one segment deep so this doesn't over-match in
    // practice.
    expect(matchesAny(['*:internal-*'], 'internal:internal-tools/foo')).toBe(true);
    expect(matchesAny(['internal:internal-*/**'], 'internal:internal-tools/foo')).toBe(true);
  });
  it('is case-sensitive', () => {
    expect(matchesAny(['tessl:Stripe/*'], 'tessl:stripe/checkout')).toBe(false);
  });
  it('supports brace expansion', () => {
    expect(matchesAny(['tessl:{aws,gcp}/*'], 'tessl:aws/lambda')).toBe(true);
    expect(matchesAny(['tessl:{aws,gcp}/*'], 'tessl:azure/thing')).toBe(false);
  });
});
