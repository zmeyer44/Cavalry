import { describe, it, expect } from 'vitest';
import { evaluate } from './evaluate';
import type { PolicyContext, PolicyRow } from './types';

const CTX_BASE: PolicyContext = {
  action: 'install',
  org: { id: 'o1' },
  workspace: null,
  actor: { userId: 'u1', tokenId: null },
  skill: {
    ref: 'tessl:stripe/stripe@2.0.0',
    namespace: 'stripe',
    name: 'stripe',
    version: '2.0.0',
    source: 'tessl',
  },
};

function ctx(override: Partial<PolicyContext['skill']> = {}): PolicyContext {
  return { ...CTX_BASE, skill: { ...CTX_BASE.skill, ...override } };
}

function makePolicy(partial: Partial<PolicyRow> & Pick<PolicyRow, 'type' | 'config'>): PolicyRow {
  return {
    id: partial.id ?? 'p1',
    orgId: partial.orgId ?? 'o1',
    scopeType: partial.scopeType ?? 'org',
    scopeId: partial.scopeId ?? null,
    name: partial.name ?? 'test-policy',
    priority: partial.priority ?? 0,
    enabled: partial.enabled ?? true,
    createdAt: partial.createdAt ?? new Date('2026-01-01T00:00:00Z'),
    type: partial.type,
    config: partial.config,
  };
}

describe('evaluate · empty or no applicable policies', () => {
  it('returns allow when no policies', () => {
    const r = evaluate([], ctx());
    expect(r.decision).toEqual({ type: 'allow' });
    expect(r.evaluations).toHaveLength(0);
  });

  it('skips disabled policies', () => {
    const r = evaluate(
      [
        makePolicy({
          type: 'blocklist',
          config: { patterns: ['tessl:*'] },
          enabled: false,
        }),
      ],
      ctx(),
    );
    expect(r.decision.type).toBe('allow');
    expect(r.evaluations).toHaveLength(0);
  });

  it('skips policies from a different org', () => {
    const r = evaluate(
      [
        makePolicy({
          orgId: 'o2',
          type: 'blocklist',
          config: { patterns: ['tessl:*'] },
        }),
      ],
      ctx(),
    );
    expect(r.decision.type).toBe('allow');
  });

  it('skips workspace-scoped policies when workspace differs', () => {
    const r = evaluate(
      [
        makePolicy({
          scopeType: 'workspace',
          scopeId: 'ws-a',
          type: 'blocklist',
          config: { patterns: ['tessl:*'] },
        }),
      ],
      { ...ctx(), workspace: { id: 'ws-b' } },
    );
    expect(r.decision.type).toBe('allow');
  });

  it('applies workspace-scoped policies when workspace matches', () => {
    const r = evaluate(
      [
        makePolicy({
          scopeType: 'workspace',
          scopeId: 'ws-a',
          type: 'blocklist',
          config: { patterns: ['tessl:*'] },
        }),
      ],
      { ...ctx(), workspace: { id: 'ws-a' } },
    );
    expect(r.decision.type).toBe('deny');
  });
});

describe('evaluate · blocklist', () => {
  it('denies a matching skill with policy reason', () => {
    const policy = makePolicy({
      id: 'block-1',
      name: 'no-tessl',
      type: 'blocklist',
      config: { patterns: ['tessl:*'] },
    });
    const r = evaluate([policy], ctx());
    expect(r.decision).toMatchObject({
      type: 'deny',
      policyId: 'block-1',
      policyName: 'no-tessl',
    });
    expect(r.evaluations[0]).toMatchObject({ matched: true, result: 'deny' });
  });

  it('allows when blocklist pattern does not match', () => {
    const r = evaluate(
      [
        makePolicy({
          type: 'blocklist',
          config: { patterns: ['github:*'] },
        }),
      ],
      ctx(),
    );
    expect(r.decision.type).toBe('allow');
    expect(r.evaluations[0]).toMatchObject({ matched: false });
  });
});

describe('evaluate · allowlist', () => {
  it('allows a skill on the list', () => {
    const r = evaluate(
      [
        makePolicy({
          type: 'allowlist',
          config: { patterns: ['tessl:stripe/*'] },
        }),
      ],
      ctx(),
    );
    expect(r.decision.type).toBe('allow');
  });

  it('denies a skill NOT on the list', () => {
    const r = evaluate(
      [
        makePolicy({
          id: 'al-1',
          name: 'prod-allow',
          type: 'allowlist',
          config: { patterns: ['internal:*', 'tessl:stripe/*'] },
        }),
      ],
      ctx({ source: 'github_public', namespace: 'randos', name: 'thing' }),
    );
    expect(r.decision).toMatchObject({
      type: 'deny',
      policyId: 'al-1',
      policyName: 'prod-allow',
      reason: expect.stringContaining('allowlist'),
    });
  });
});

describe('evaluate · version_pin', () => {
  const pinPolicy = makePolicy({
    type: 'version_pin',
    config: {
      rules: [{ pattern: 'tessl:react/*', range: '^18.0.0' }],
    },
  });

  it('allows a version inside the range', () => {
    const r = evaluate(
      [pinPolicy],
      ctx({ namespace: 'react', name: 'react', version: '18.3.0' }),
    );
    expect(r.decision.type).toBe('allow');
  });

  it('denies a version outside the range', () => {
    const r = evaluate(
      [pinPolicy],
      ctx({ namespace: 'react', name: 'react', version: '17.0.0' }),
    );
    expect(r.decision.type).toBe('deny');
    if (r.decision.type !== 'deny') return;
    expect(r.decision.reason).toMatch(/does not satisfy/);
  });

  it('ignores pin for patterns that do not apply', () => {
    const r = evaluate(
      [pinPolicy],
      ctx({ namespace: 'stripe', name: 'stripe' }),
    );
    expect(r.decision.type).toBe('allow');
  });

  it('allows latest (null version) — pin cannot judge without a version', () => {
    const r = evaluate(
      [pinPolicy],
      ctx({ namespace: 'react', name: 'react', version: null }),
    );
    expect(r.decision.type).toBe('allow');
  });

  it('denies an invalid version string', () => {
    const r = evaluate(
      [pinPolicy],
      ctx({ namespace: 'react', name: 'react', version: 'not-a-version' }),
    );
    expect(r.decision.type).toBe('deny');
  });

  it('accepts `v1.2.3` by stripping the v prefix', () => {
    const r = evaluate(
      [pinPolicy],
      ctx({ namespace: 'react', name: 'react', version: 'v18.2.0' }),
    );
    expect(r.decision.type).toBe('allow');
  });
});

describe('evaluate · require_approval', () => {
  const reqPolicy = makePolicy({
    id: 'appr-1',
    name: 'sensitive',
    type: 'require_approval',
    config: { patterns: ['*'], exceptions: ['internal:*'] },
  });

  it('requires approval for matching skills', () => {
    const r = evaluate([reqPolicy], ctx());
    expect(r.decision).toMatchObject({
      type: 'require_approval',
      policyName: 'sensitive',
    });
  });

  it('skips when the skill is on the exceptions list', () => {
    const r = evaluate([reqPolicy], ctx({ source: 'internal' }));
    expect(r.decision.type).toBe('allow');
  });
});

describe('evaluate · priority ordering', () => {
  it('higher-priority non-allow wins over lower-priority', () => {
    const block = makePolicy({
      id: 'block',
      type: 'blocklist',
      config: { patterns: ['tessl:stripe/*'] },
      priority: 100,
    });
    const allowAll = makePolicy({
      id: 'allow-all',
      type: 'allowlist',
      config: { patterns: ['**'] },
      priority: 1,
    });
    const r = evaluate([allowAll, block], ctx());
    expect(r.decision.type).toBe('deny');
    if (r.decision.type !== 'deny') return;
    expect(r.decision.policyId).toBe('block');
  });

  it('at equal priority, later-created policy wins', () => {
    const older = makePolicy({
      id: 'older',
      name: 'older',
      type: 'blocklist',
      config: { patterns: ['tessl:*'] },
      createdAt: new Date('2026-01-01T00:00:00Z'),
      priority: 10,
    });
    const newer = makePolicy({
      id: 'newer',
      name: 'newer',
      type: 'require_approval',
      config: { patterns: ['tessl:*'] },
      createdAt: new Date('2026-02-01T00:00:00Z'),
      priority: 10,
    });
    const r = evaluate([older, newer], ctx());
    expect(r.decision.type).toBe('require_approval');
    if (r.decision.type !== 'require_approval') return;
    expect(r.decision.policyId).toBe('newer');
  });

  it('records every applicable policy evaluation even after a terminal decision', () => {
    const policies = [
      makePolicy({ id: 'a', type: 'blocklist', config: { patterns: ['tessl:*'] }, priority: 50 }),
      makePolicy({ id: 'b', type: 'blocklist', config: { patterns: ['tessl:stripe/*'] }, priority: 10 }),
    ];
    const r = evaluate(policies, ctx());
    expect(r.evaluations).toHaveLength(2);
    expect(r.evaluations.map((e) => e.policyId).sort()).toEqual(['a', 'b']);
  });
});

describe('evaluate · multi-policy interaction', () => {
  it('allowlist allows a skill that a blocklist would otherwise miss', () => {
    const allow = makePolicy({
      id: 'allow',
      type: 'allowlist',
      config: { patterns: ['tessl:stripe/*'] },
      priority: 0,
    });
    const r = evaluate([allow], ctx());
    expect(r.decision.type).toBe('allow');
  });

  it('require_approval is returned when the only match is an approval rule', () => {
    const p = makePolicy({
      type: 'require_approval',
      config: { patterns: ['tessl:*'] },
    });
    const r = evaluate([p], ctx());
    expect(r.decision.type).toBe('require_approval');
  });
});
