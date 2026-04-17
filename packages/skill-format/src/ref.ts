import semver from 'semver';
import { NAMESPACE_PATTERN } from '@cavalry/common';

export interface ParsedSkillRef {
  registry: string | null;
  namespace: string;
  name: string;
  version: string | null;
}

const REF_RE = /^(?:(?<registry>[a-z0-9-]+):)?(?<ns>[a-z0-9][a-z0-9-]*)\/(?<name>[a-z0-9][a-z0-9-]*)(?:@(?<version>.+))?$/;

export function parseSkillRef(ref: string): ParsedSkillRef | null {
  const m = ref.match(REF_RE);
  if (!m?.groups) return null;
  const ns = m.groups.ns!;
  const name = m.groups.name!;
  if (!NAMESPACE_PATTERN.test(ns) || !NAMESPACE_PATTERN.test(name)) return null;
  const version = m.groups.version ?? null;
  if (version && version !== 'latest' && !isValidVersionOrRange(version)) {
    return null;
  }
  return {
    registry: m.groups.registry ?? null,
    namespace: ns,
    name,
    version,
  };
}

function isValidVersionOrRange(v: string): boolean {
  return semver.valid(v) !== null || semver.validRange(v) !== null;
}

export function formatSkillRef(parsed: ParsedSkillRef): string {
  const base = `${parsed.namespace}/${parsed.name}`;
  const withRegistry = parsed.registry ? `${parsed.registry}:${base}` : base;
  return parsed.version ? `${withRegistry}@${parsed.version}` : withRegistry;
}
