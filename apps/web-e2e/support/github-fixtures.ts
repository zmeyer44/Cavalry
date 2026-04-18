import type { MockFile, MockInstallation, MockRepo } from './mock-github-server';

const CAVALRY_YAML = `version: 1
skills:
  - path: "skills/*"
releases:
  tag_pattern: "{skill}/v{version}"
defaults:
  namespace: acme-platform
  license: UNLICENSED
  targets: ["claude-code"]
`;

const CAVALRY_YAML_INVALID = `version: 2
skills:
  - path: "skills/*"
releases:
  tag_pattern: "v{version}"
defaults:
  namespace: "BAD NAMESPACE"
`;

function skillFiles(skillBasename: string, version: string): MockFile[] {
  const manifest = {
    name: skillBasename,
    namespace: 'acme-platform',
    version,
    description: `${skillBasename} skill`,
    targets: ['claude-code'],
    entrypoints: { skill: 'SKILL.md' },
  };
  return [
    {
      path: `skills/${skillBasename}/skill.json`,
      content: JSON.stringify(manifest, null, 2),
    },
    {
      path: `skills/${skillBasename}/SKILL.md`,
      content: `# ${skillBasename}\n\nTest skill content for ${version}.\n`,
    },
  ];
}

export interface HappyPathFixtureOptions {
  skillBasename?: string;
  version?: string;
  tagCommitSha?: string;
  headSha?: string;
}

/**
 * Build the default mock state for happy-path specs: an org installation on
 * an `acme/platform-skills` repo, default branch `main`, `cavalry.yaml` at
 * HEAD, and one tag (`{skill}/v{version}`) pointing at a commit that has a
 * valid skill tree.
 */
export function buildHappyPathState(opts: HappyPathFixtureOptions = {}): {
  installations: MockInstallation[];
} {
  const skillBasename = opts.skillBasename ?? 'kafka-wrapper';
  const version = opts.version ?? '1.0.0';
  const headSha = opts.headSha ?? 'head1234567890abcdef1234567890abcdef1234';
  const tagCommitSha =
    opts.tagCommitSha ?? 'tag1234567890abcdef1234567890abcdef1234a';

  const repo: MockRepo = {
    owner: 'acme',
    repo: 'platform-skills',
    defaultBranch: 'main',
    private: true,
    description: 'Internal platform skills',
    head: headSha,
    commits: [
      {
        sha: headSha,
        message: 'Initial cavalry.yaml',
        files: [{ path: 'cavalry.yaml', content: CAVALRY_YAML }],
      },
      {
        sha: tagCommitSha,
        message: `${skillBasename}/v${version}`,
        files: [
          { path: 'cavalry.yaml', content: CAVALRY_YAML },
          ...skillFiles(skillBasename, version),
        ],
      },
    ],
    tags: [{ name: `${skillBasename}/v${version}`, commitSha: tagCommitSha }],
  };

  return {
    installations: [
      {
        id: 42,
        accountLogin: 'acme',
        accountType: 'organization',
        permissions: { contents: 'read', metadata: 'read' },
        repos: [repo],
      },
    ],
  };
}

export function buildInvalidYamlState(): { installations: MockInstallation[] } {
  const headSha = 'head1234567890abcdef1234567890abcdef1234';
  const repo: MockRepo = {
    owner: 'acme',
    repo: 'broken-skills',
    defaultBranch: 'main',
    private: true,
    head: headSha,
    commits: [
      {
        sha: headSha,
        message: 'Bad config',
        files: [{ path: 'cavalry.yaml', content: CAVALRY_YAML_INVALID }],
      },
    ],
    tags: [],
  };
  return {
    installations: [
      {
        id: 43,
        accountLogin: 'acme',
        accountType: 'organization',
        permissions: { contents: 'read', metadata: 'read' },
        repos: [repo],
      },
    ],
  };
}

/** Re-point a tag at a new commit (force-push simulation). */
export function forcePushTag(
  state: { installations: MockInstallation[] },
  owner: string,
  repo: string,
  tagName: string,
  newSha: string,
  additionalCommit?: { files: MockFile[] },
): { installations: MockInstallation[] } {
  const out = structuredClone(state);
  for (const inst of out.installations) {
    for (const r of inst.repos) {
      if (r.owner !== owner || r.repo !== repo) continue;
      const tag = r.tags.find((t) => t.name === tagName);
      if (!tag) continue;
      tag.commitSha = newSha;
      if (additionalCommit) {
        r.commits.push({ sha: newSha, files: additionalCommit.files });
      }
    }
  }
  return out;
}
