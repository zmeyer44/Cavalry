/**
 * Types shared across the policy engine.
 *
 * The engine is pure: callers load policies + build a context, call evaluate(),
 * and act on the returned decision. No IO or DB access happens here.
 */

export type PolicyAction = 'install' | 'publish' | 'read';

export type SkillSource = 'internal' | 'tessl' | 'github_public' | 'http';

export interface PolicyContext {
  action: PolicyAction;
  org: { id: string };
  workspace: { id: string } | null;
  actor: { userId: string | null; tokenId: string | null };
  skill: {
    /** Full reference string, e.g. `tessl:stripe/stripe@^2.0.0`. */
    ref: string;
    namespace: string;
    name: string;
    /** Exact version if known; null when the caller is asking for latest. */
    version: string | null;
    source: SkillSource;
  };
}

export type PolicyType =
  | 'allowlist'
  | 'blocklist'
  | 'version_pin'
  | 'require_approval';

export interface PolicyRow {
  id: string;
  orgId: string;
  scopeType: 'org' | 'workspace';
  scopeId: string | null;
  name: string;
  type: PolicyType;
  /** Shape depends on `type`; validated by {@link policyConfigSchemas}. */
  config: unknown;
  priority: number;
  enabled: boolean;
  createdAt: Date;
}

export type PolicyDecision =
  | { type: 'allow' }
  | {
      type: 'deny';
      reason: string;
      policyId: string;
      policyName: string;
    }
  | {
      type: 'require_approval';
      reason: string;
      policyId: string;
      policyName: string;
    };

/**
 * Per-policy evaluation result retained for the policy_evaluations table.
 * The engine returns these alongside the final decision so the gateway can
 * persist a complete audit trail of what matched and what didn't.
 */
export interface PolicyEvaluation {
  policyId: string;
  matched: boolean;
  result: 'allow' | 'deny' | 'require_approval';
  reason: string | null;
}

export interface EvaluateResult {
  decision: PolicyDecision;
  evaluations: PolicyEvaluation[];
}
