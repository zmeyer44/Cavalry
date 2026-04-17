import picomatch from 'picomatch';
import type { PolicyContext, SkillSource } from './types';

/**
 * Map a PolicyContext source tag to the short prefix used in policy patterns.
 * Kept in one place so every consumer agrees on the spelling.
 */
export function sourcePrefix(source: SkillSource): string {
  switch (source) {
    case 'internal':
      return 'internal';
    case 'tessl':
      return 'tessl';
    case 'github_public':
      return 'github';
    case 'http':
      return 'http';
  }
}

/**
 * Build the canonical match string for a skill context. Patterns are matched
 * against this string using shell-style globs.
 *
 *   `internal:acme-platform/kafka-wrapper`
 *   `tessl:stripe/stripe`
 *   `github:aws/cdk-skill`
 */
export function canonicalSkillId(context: PolicyContext): string {
  return `${sourcePrefix(context.skill.source)}:${context.skill.namespace}/${context.skill.name}`;
}

/**
 * Return true if any of the patterns matches the canonical id. Picomatch is
 * configured with `dot: true` so leading-hyphen namespaces still match, and
 * `bash: true` so brace expansion works for users who want `tessl:{aws,gcp}/*`.
 */
export function matchesAny(patterns: readonly string[], canonical: string): boolean {
  if (patterns.length === 0) return false;
  const isMatch = picomatch(patterns as string[], {
    dot: true,
    bash: true,
    nocase: false,
  });
  return isMatch(canonical);
}
