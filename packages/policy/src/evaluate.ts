import semver from 'semver';
import {
  allowlistConfigSchema,
  blocklistConfigSchema,
  requireApprovalConfigSchema,
  versionPinConfigSchema,
} from './config';
import { canonicalSkillId, matchesAny } from './match';
import type {
  EvaluateResult,
  PolicyContext,
  PolicyDecision,
  PolicyEvaluation,
  PolicyRow,
} from './types';

/**
 * Pure evaluation. Order of operations (§4.8):
 *   1. Filter policies to those that apply (enabled + scope match).
 *   2. Sort by priority desc, then createdAt desc.
 *   3. Walk policies in order; the first non-allow decision wins.
 *   4. If every applicable policy allows (or none apply), return allow.
 *
 * Every applicable policy produces a PolicyEvaluation entry (matched or not).
 * Policies filtered out by scope/enabled do NOT produce evaluation rows — we
 * only persist what was actually considered.
 */
export function evaluate(
  policies: readonly PolicyRow[],
  context: PolicyContext,
): EvaluateResult {
  const applicable = policies
    .filter((p) => p.enabled && scopeApplies(p, context))
    .sort(sortPolicies);

  if (applicable.length === 0) {
    return { decision: { type: 'allow' }, evaluations: [] };
  }

  const canonical = canonicalSkillId(context);
  const evaluations: PolicyEvaluation[] = [];
  let terminalDecision: PolicyDecision | null = null;

  for (const policy of applicable) {
    const outcome = evaluatePolicy(policy, canonical, context);
    evaluations.push({
      policyId: policy.id,
      matched: outcome.matched,
      result: outcome.result,
      reason: outcome.reason,
    });
    if (outcome.matched && outcome.result !== 'allow' && !terminalDecision) {
      // First non-allow decision wins; continue so we still log later matches
      // but don't change the terminal result.
      terminalDecision =
        outcome.result === 'deny'
          ? {
              type: 'deny',
              reason: outcome.reason ?? 'denied by policy',
              policyId: policy.id,
              policyName: policy.name,
            }
          : {
              type: 'require_approval',
              reason: outcome.reason ?? 'approval required',
              policyId: policy.id,
              policyName: policy.name,
            };
    }
  }

  return {
    decision: terminalDecision ?? { type: 'allow' },
    evaluations,
  };
}

interface PolicyOutcome {
  matched: boolean;
  result: 'allow' | 'deny' | 'require_approval';
  reason: string | null;
}

function evaluatePolicy(
  policy: PolicyRow,
  canonical: string,
  context: PolicyContext,
): PolicyOutcome {
  switch (policy.type) {
    case 'allowlist': {
      const cfg = allowlistConfigSchema.parse(policy.config);
      const onList = matchesAny(cfg.patterns, canonical);
      if (onList) {
        return { matched: true, result: 'allow', reason: null };
      }
      // Allowlist denies anything NOT on the list; that counts as matched.
      return {
        matched: true,
        result: 'deny',
        reason: `not on allowlist "${policy.name}"`,
      };
    }
    case 'blocklist': {
      const cfg = blocklistConfigSchema.parse(policy.config);
      if (matchesAny(cfg.patterns, canonical)) {
        return {
          matched: true,
          result: 'deny',
          reason: `blocked by "${policy.name}"`,
        };
      }
      return { matched: false, result: 'allow', reason: null };
    }
    case 'version_pin': {
      const cfg = versionPinConfigSchema.parse(policy.config);
      for (const rule of cfg.rules) {
        if (!matchesAny([rule.pattern], canonical)) continue;
        const version = context.skill.version;
        // If caller didn't commit to a version, we cannot judge. Treat as
        // matched-but-pass so higher-priority blocklists still apply.
        if (version === null) {
          return { matched: true, result: 'allow', reason: null };
        }
        const normalized = version.startsWith('v') ? version.slice(1) : version;
        if (!semver.valid(normalized) && !semver.validRange(normalized)) {
          return {
            matched: true,
            result: 'deny',
            reason: `invalid version "${version}"`,
          };
        }
        if (!semver.satisfies(normalized, rule.range, { includePrerelease: true })) {
          return {
            matched: true,
            result: 'deny',
            reason: `version ${version} does not satisfy ${rule.range} (policy "${policy.name}")`,
          };
        }
        return { matched: true, result: 'allow', reason: null };
      }
      return { matched: false, result: 'allow', reason: null };
    }
    case 'require_approval': {
      const cfg = requireApprovalConfigSchema.parse(policy.config);
      const exceptions = cfg.exceptions ?? [];
      if (matchesAny(exceptions, canonical)) {
        return { matched: false, result: 'allow', reason: null };
      }
      if (matchesAny(cfg.patterns, canonical)) {
        return {
          matched: true,
          result: 'require_approval',
          reason: `approval required by "${policy.name}"`,
        };
      }
      return { matched: false, result: 'allow', reason: null };
    }
  }
}

function scopeApplies(policy: PolicyRow, context: PolicyContext): boolean {
  if (policy.orgId !== context.org.id) return false;
  if (policy.scopeType === 'org') return true;
  // workspace-scoped: require the install to name the same workspace.
  return (
    policy.scopeType === 'workspace' &&
    policy.scopeId !== null &&
    context.workspace?.id === policy.scopeId
  );
}

function sortPolicies(a: PolicyRow, b: PolicyRow): number {
  if (a.priority !== b.priority) return b.priority - a.priority;
  return b.createdAt.getTime() - a.createdAt.getTime();
}
