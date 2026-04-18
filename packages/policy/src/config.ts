import { z } from 'zod';

/**
 * Zod schemas describing each policy type's `config` shape. Used by both the
 * web tRPC router (validate on write) and the engine (validate on evaluate).
 *
 * Patterns are shell-style globs matched against a normalized skill id of the
 * form `<source>:<namespace>/<name>` where `<source>` is one of:
 *   - `internal`   (private org skills, git-backed or direct)
 *   - `tessl`      (Tessl proxy)
 *   - `github`     (public GitHub proxy)
 *   - `http`       (generic HTTP registry)
 *
 * Examples:
 *   `tessl:stripe/*`   — everything under tessl:stripe/
 *   `internal:*`       — all internal skills
 *   `*:badactor/*`     — any source, namespace=badactor
 */

const patternSchema = z.string().min(1).max(255);

export const allowlistConfigSchema = z
  .object({
    patterns: z.array(patternSchema).min(1),
  })
  .strict();

export const blocklistConfigSchema = z
  .object({
    patterns: z.array(patternSchema).min(1),
  })
  .strict();

export const versionPinConfigSchema = z
  .object({
    rules: z
      .array(
        z
          .object({
            pattern: patternSchema,
            /** Valid semver range (e.g. `^18.0.0`, `>=2.0.0 <3`). */
            range: z.string().min(1).max(64),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const requireApprovalConfigSchema = z
  .object({
    patterns: z.array(patternSchema).min(1),
    /** Patterns that are exempt even if the `patterns` array matches. */
    exceptions: z.array(patternSchema).optional(),
  })
  .strict();

export const policyConfigSchemas = {
  allowlist: allowlistConfigSchema,
  blocklist: blocklistConfigSchema,
  version_pin: versionPinConfigSchema,
  require_approval: requireApprovalConfigSchema,
} as const;

export type AllowlistConfig = z.infer<typeof allowlistConfigSchema>;
export type BlocklistConfig = z.infer<typeof blocklistConfigSchema>;
export type VersionPinConfig = z.infer<typeof versionPinConfigSchema>;
export type RequireApprovalConfig = z.infer<typeof requireApprovalConfigSchema>;

/**
 * Type-narrowing parser — throws a ZodError on invalid config shape.
 */
export function parsePolicyConfig(
  type: keyof typeof policyConfigSchemas,
  config: unknown,
):
  | AllowlistConfig
  | BlocklistConfig
  | VersionPinConfig
  | RequireApprovalConfig {
  return policyConfigSchemas[type].parse(config);
}
