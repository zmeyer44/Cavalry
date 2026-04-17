import { describe, it, expect } from 'vitest';
import { planSync } from './plan';
import type { CavalryYaml } from '@cavalry/skill-format';

const baseConfig: CavalryYaml = {
  version: 1,
  skills: [{ path: 'skills/*' }],
  releases: { tag_pattern: '{skill}/v{version}' },
  defaults: { namespace: 'acme-platform' },
};

describe('planSync', () => {
  it('publishes new tags that match the pattern', () => {
    const plan = planSync({
      config: baseConfig,
      tags: [
        { name: 'kafka-wrapper/v1.0.0', commitSha: 'sha1' },
        { name: 'kafka-wrapper/v1.1.0', commitSha: 'sha2' },
      ],
      currentVersions: [],
    });
    expect(plan.toPublish).toHaveLength(2);
    expect(plan.toPublish[0]?.version).toBe('1.0.0');
    expect(plan.toPublish[1]?.version).toBe('1.1.0');
    expect(plan.forcePushed).toHaveLength(0);
  });

  it('skips already-published tags pointing at the same commit', () => {
    const plan = planSync({
      config: baseConfig,
      tags: [{ name: 'kafka-wrapper/v1.0.0', commitSha: 'sha1' }],
      currentVersions: [
        {
          namespace: 'acme-platform',
          name: 'kafka-wrapper',
          version: '1.0.0',
          sourceCommitSha: 'sha1',
        },
      ],
    });
    expect(plan.toPublish).toHaveLength(0);
    expect(plan.forcePushed).toHaveLength(0);
  });

  it('flags force-pushed tags without overwriting the version', () => {
    const plan = planSync({
      config: baseConfig,
      tags: [{ name: 'kafka-wrapper/v1.0.0', commitSha: 'sha2' }],
      currentVersions: [
        {
          namespace: 'acme-platform',
          name: 'kafka-wrapper',
          version: '1.0.0',
          sourceCommitSha: 'sha1',
        },
      ],
    });
    expect(plan.toPublish).toHaveLength(0);
    expect(plan.forcePushed).toHaveLength(1);
    expect(plan.forcePushed[0]).toMatchObject({
      tagName: 'kafka-wrapper/v1.0.0',
      previousSha: 'sha1',
      currentSha: 'sha2',
    });
  });

  it('skips non-matching tags with a reason', () => {
    const plan = planSync({
      config: baseConfig,
      tags: [{ name: 'main', commitSha: 'abc' }],
      currentVersions: [],
    });
    expect(plan.skipped).toHaveLength(1);
    expect(plan.skipped[0]?.reason).toMatch(/tag_pattern/);
  });

  it('sorts to-publish list by version within a skill', () => {
    const plan = planSync({
      config: baseConfig,
      tags: [
        { name: 'kafka-wrapper/v2.0.0', commitSha: 's3' },
        { name: 'kafka-wrapper/v1.0.0', commitSha: 's1' },
        { name: 'kafka-wrapper/v1.1.0', commitSha: 's2' },
      ],
      currentVersions: [],
    });
    expect(plan.toPublish.map((p) => p.version)).toEqual(['1.0.0', '1.1.0', '2.0.0']);
  });
});
