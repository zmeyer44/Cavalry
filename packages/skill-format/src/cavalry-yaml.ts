import { z } from 'zod';
import YAML from 'yaml';
import { NAMESPACE_PATTERN } from '@cavalry/common';
import { TARGETS } from './manifest';

/**
 * Accepted file names for the repo-level config, in resolution order.
 * See §11.2 of the PRD.
 */
export const CAVALRY_YAML_FILES = [
  'cavalry.yaml',
  'cavalry.yml',
  '.cavalry/config.yaml',
] as const;

export type CavalryYamlFile = (typeof CAVALRY_YAML_FILES)[number];

const TAG_PATTERN_PLACEHOLDERS = /\{skill\}|\{version\}/g;

const tagPatternSchema = z
  .string()
  .min(1)
  .max(255)
  .refine(
    (value) => {
      const placeholders: string[] = value.match(TAG_PATTERN_PLACEHOLDERS) ?? [];
      return placeholders.includes('{skill}') && placeholders.includes('{version}');
    },
    { message: 'tag_pattern must contain both {skill} and {version} placeholders' },
  );

const skillsEntrySchema = z
  .object({
    path: z.string().min(1).max(500),
  })
  .strict();

const defaultsSchema = z
  .object({
    namespace: z
      .string()
      .min(1)
      .max(64)
      .regex(NAMESPACE_PATTERN, 'must match ^[a-z0-9][a-z0-9-]*$'),
    license: z.string().max(64).optional(),
    owner: z.string().max(255).optional(),
    targets: z.array(z.enum(TARGETS)).min(1).max(16).optional(),
  })
  .strict();

const syncSchema = z
  .object({
    ignore: z.array(z.string().min(1).max(500)).max(256).optional(),
    strict: z.boolean().optional(),
  })
  .strict();

const releasesSchema = z
  .object({
    tag_pattern: tagPatternSchema,
  })
  .strict();

export const cavalryYamlSchema = z
  .object({
    version: z.literal(1),
    skills: z.array(skillsEntrySchema).min(1).max(32),
    releases: releasesSchema,
    defaults: defaultsSchema,
    sync: syncSchema.optional(),
  })
  .strict();

export type CavalryYaml = z.infer<typeof cavalryYamlSchema>;

export interface CavalryYamlParseResult {
  ok: true;
  value: CavalryYaml;
}

export interface CavalryYamlParseError {
  ok: false;
  error: {
    message: string;
    issues: Array<{ path: string; message: string }>;
  };
}

/**
 * Parse a cavalry.yaml file from raw YAML text.
 * Strict: unknown top-level keys are rejected.
 */
export function parseCavalryYaml(
  input: string,
): CavalryYamlParseResult | CavalryYamlParseError {
  let raw: unknown;
  try {
    raw = YAML.parse(input);
  } catch (err) {
    return {
      ok: false,
      error: {
        message: 'Invalid YAML',
        issues: [
          {
            path: '(root)',
            message: err instanceof Error ? err.message : String(err),
          },
        ],
      },
    };
  }

  const result = cavalryYamlSchema.safeParse(raw);
  if (result.success) {
    return { ok: true, value: result.data };
  }
  return {
    ok: false,
    error: {
      message: 'Invalid cavalry.yaml',
      issues: result.error.issues.map((i) => ({
        path: i.path.join('.') || '(root)',
        message: i.message,
      })),
    },
  };
}

/**
 * Escape a string for embedding inside a regex literal.
 */
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a matcher for the config's release tag pattern.
 * Returns the skill basename + version on match, or null.
 */
export function buildTagMatcher(
  tagPattern: string,
): (tag: string) => { skill: string; version: string } | null {
  // Split around {skill} / {version}; preserve order of placeholders so we can
  // map capture groups back to the right pieces.
  const tokens: Array<{ kind: 'literal' | 'skill' | 'version'; value: string }> = [];
  let rest = tagPattern;
  while (rest.length > 0) {
    const skillIdx = rest.indexOf('{skill}');
    const versionIdx = rest.indexOf('{version}');
    const nextIdx =
      skillIdx === -1
        ? versionIdx
        : versionIdx === -1
          ? skillIdx
          : Math.min(skillIdx, versionIdx);

    if (nextIdx === -1) {
      tokens.push({ kind: 'literal', value: rest });
      break;
    }

    if (nextIdx > 0) {
      tokens.push({ kind: 'literal', value: rest.slice(0, nextIdx) });
    }

    if (nextIdx === skillIdx) {
      tokens.push({ kind: 'skill', value: '' });
      rest = rest.slice(nextIdx + '{skill}'.length);
    } else {
      tokens.push({ kind: 'version', value: '' });
      rest = rest.slice(nextIdx + '{version}'.length);
    }
  }

  const order: Array<'skill' | 'version'> = [];
  const regexSource = tokens
    .map((token) => {
      if (token.kind === 'literal') return escapeRegex(token.value);
      order.push(token.kind);
      // skill basename: alphanumerics + hyphens; version: semver-ish (loose — validated by parseManifest downstream)
      return token.kind === 'skill' ? '([a-z0-9][a-z0-9-]*)' : '(v?\\d+\\.\\d+\\.\\d+(?:[-+][0-9A-Za-z.-]+)?)';
    })
    .join('');

  const regex = new RegExp(`^${regexSource}$`);

  return (tag: string) => {
    const match = regex.exec(tag);
    if (!match) return null;
    let skill: string | undefined;
    let version: string | undefined;
    for (let i = 0; i < order.length; i++) {
      const key = order[i];
      const value = match[i + 1];
      if (!value) return null;
      if (key === 'skill') skill = value;
      if (key === 'version') version = value;
    }
    if (!skill || !version) return null;
    // Strip optional leading v from versions like "v1.2.3" → "1.2.3"
    if (version.startsWith('v')) version = version.slice(1);
    return { skill, version };
  };
}
