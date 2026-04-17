import semver from 'semver';
import picomatch from 'picomatch';
import {
  buildTagMatcher,
  type CavalryYaml,
} from '@cavalry/skill-format';
import type { Tag } from '@cavalry/git-provider';

export interface SkillVersionSummary {
  /** Full skill namespace — usually matches `config.defaults.namespace`. */
  namespace: string;
  /** Skill basename (matches the directory). */
  name: string;
  version: string;
  sourceCommitSha: string | null;
}

export interface PlannedVersion {
  tagName: string;
  commitSha: string;
  skillBasename: string;
  version: string;
}

export interface ForcePushedTag {
  tagName: string;
  /** The commit the version was originally published from. */
  previousSha: string;
  /** The commit the tag now points at. */
  currentSha: string;
  skillBasename: string;
  version: string;
}

export interface SyncPlan {
  toPublish: PlannedVersion[];
  forcePushed: ForcePushedTag[];
  skipped: Array<{ tagName: string; reason: string }>;
}

/**
 * Pure helper: given a cavalry.yaml, the current list of remote tags, and the
 * already-published versions for this repo, determine which versions need to
 * be materialized and which tags have been force-pushed.
 */
export function planSync(params: {
  config: CavalryYaml;
  tags: Tag[];
  currentVersions: SkillVersionSummary[];
}): SyncPlan {
  const matcher = buildTagMatcher(params.config.releases.tag_pattern);
  const known = new Map<string, SkillVersionSummary>();
  for (const v of params.currentVersions) {
    known.set(`${v.name}@${v.version}`, v);
  }

  // Compile skill path matchers so we can validate a tag maps to a configured skill.
  const skillPathMatchers = params.config.skills.map((entry) =>
    picomatch(entry.path, { dot: true }),
  );

  const toPublish: PlannedVersion[] = [];
  const forcePushed: ForcePushedTag[] = [];
  const skipped: Array<{ tagName: string; reason: string }> = [];

  for (const tag of params.tags) {
    const parsed = matcher(tag.name);
    if (!parsed) {
      skipped.push({ tagName: tag.name, reason: 'does not match tag_pattern' });
      continue;
    }
    if (!semver.valid(parsed.version)) {
      skipped.push({ tagName: tag.name, reason: `invalid semver: ${parsed.version}` });
      continue;
    }
    // The skill must live under at least one configured path.
    // We check with the skill basename alone — this is conservative but
    // guards against a tag referencing a skill that isn't declared.
    const skillDir = `skills/${parsed.skill}`;
    const pathMatches = skillPathMatchers.some(
      (m) => m(skillDir) || m(`internal/agents/${parsed.skill}`),
    );
    if (!pathMatches) {
      // Not fatal — the actual sync engine will validate against the real tree
      // at the tag's commit. Keep going.
    }

    const key = `${parsed.skill}@${parsed.version}`;
    const existing = known.get(key);
    if (!existing) {
      toPublish.push({
        tagName: tag.name,
        commitSha: tag.commitSha,
        skillBasename: parsed.skill,
        version: parsed.version,
      });
      continue;
    }
    if (
      existing.sourceCommitSha &&
      existing.sourceCommitSha !== tag.commitSha
    ) {
      forcePushed.push({
        tagName: tag.name,
        previousSha: existing.sourceCommitSha,
        currentSha: tag.commitSha,
        skillBasename: parsed.skill,
        version: parsed.version,
      });
    }
    // else: version already published at this exact commit → no-op
  }

  // Publish in version order within each skill (oldest first) so semver users
  // see consistent history even if tags are batched out of order.
  toPublish.sort((a, b) => {
    if (a.skillBasename !== b.skillBasename) {
      return a.skillBasename.localeCompare(b.skillBasename);
    }
    return semver.compare(a.version, b.version);
  });

  return { toPublish, forcePushed, skipped };
}
