import semver from 'semver';
import { NAMESPACE_PATTERN } from '@cavalry/common';

export interface ParsedSkillRef {
  registry: string | null;
  namespace: string;
  name: string;
  version: string | null;
}

// Accepted forms (registry is the configured registry NAME in the org):
//   ns/name[@version]                    → internal/private
//   internal:ns/name[@version]           → explicit internal
//   <registry>:ns/name[@version]         → e.g. tessl:demo/hello@1.0.0
//   <registry>://ns/name[@version]       → e.g. tessl://demo/hello@1.0.0
//   @<registry>/ns/name[@version]        → e.g. @tessl/demo/hello@1.0.0
const REGISTRY_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export function parseSkillRef(ref: string): ParsedSkillRef | null {
  let registry: string | null = null;
  let rest = ref;

  // @<registry>/ns/name[@version]
  if (rest.startsWith('@')) {
    const slashIdx = rest.indexOf('/');
    if (slashIdx <= 1) return null;
    registry = rest.slice(1, slashIdx);
    rest = rest.slice(slashIdx + 1);
  } else {
    // <registry>://... or <registry>:...
    const schemeMatch = rest.match(/^([a-z0-9-]+):(\/\/)?(.*)$/);
    if (schemeMatch) {
      registry = schemeMatch[1] ?? null;
      rest = schemeMatch[3] ?? '';
    }
  }

  if (registry !== null && !REGISTRY_PATTERN.test(registry)) return null;

  // rest is now: ns/name[@version]
  const m = rest.match(/^(?<ns>[a-z0-9][a-z0-9-]*)\/(?<name>[a-z0-9][a-z0-9-]*)(?:@(?<version>.+))?$/);
  if (!m?.groups) return null;
  const ns = m.groups.ns!;
  const name = m.groups.name!;
  if (!NAMESPACE_PATTERN.test(ns) || !NAMESPACE_PATTERN.test(name)) return null;
  const version = m.groups.version ?? null;
  if (version && version !== 'latest' && !isValidVersionOrRange(version)) {
    return null;
  }
  return {
    registry: registry === 'internal' ? null : registry,
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
