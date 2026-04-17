import { z } from 'zod';
import semver from 'semver';
import { NAMESPACE_PATTERN, SKILL_NAME_PATTERN } from '@cavalry/common';

const identifierSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(SKILL_NAME_PATTERN, 'must match ^[a-z0-9][a-z0-9-]*$');

const namespaceSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(NAMESPACE_PATTERN, 'must match ^[a-z0-9][a-z0-9-]*$');

const versionSchema = z.string().refine((v) => semver.valid(v) !== null, {
  message: 'must be a valid semver version (e.g. 1.2.3)',
});

export const TARGETS = [
  'claude-code',
  'cursor',
  'codex',
  'windsurf',
  'aider',
  'generic',
] as const;

export const skillManifestSchema = z.object({
  name: identifierSchema,
  namespace: namespaceSchema,
  version: versionSchema,
  description: z.string().min(1).max(2000).optional(),
  author: z.string().max(255).optional(),
  license: z.string().max(64).optional(),
  targets: z.array(z.enum(TARGETS)).min(1).max(16).default(['generic']),
  entrypoints: z
    .object({
      skill: z.string().min(1).max(255),
      rules: z.array(z.string().min(1).max(255)).optional(),
    })
    .strict(),
  dependencies: z.record(z.string(), z.string()).optional(),
  metadata: z
    .object({
      tags: z.array(z.string()).optional(),
      owner: z.string().optional(),
    })
    .catchall(z.unknown())
    .optional(),
});

export type SkillManifest = z.infer<typeof skillManifestSchema>;

export interface ParseResult<T> {
  ok: true;
  value: T;
}

export interface ParseError {
  ok: false;
  error: {
    message: string;
    issues: Array<{ path: string; message: string }>;
  };
}

export function parseManifest(input: unknown): ParseResult<SkillManifest> | ParseError {
  const result = skillManifestSchema.safeParse(input);
  if (result.success) {
    return { ok: true, value: result.data };
  }
  return {
    ok: false,
    error: {
      message: 'Invalid skill manifest',
      issues: result.error.issues.map((i) => ({
        path: i.path.join('.') || '(root)',
        message: i.message,
      })),
    },
  };
}

export function skillRef(manifest: Pick<SkillManifest, 'namespace' | 'name' | 'version'>): string {
  return `${manifest.namespace}/${manifest.name}@${manifest.version}`;
}
