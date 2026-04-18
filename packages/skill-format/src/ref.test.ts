import { describe, expect, it } from 'vitest';
import { parseSkillRef, formatSkillRef } from './ref';

describe('parseSkillRef', () => {
  it('parses ns/name', () => {
    expect(parseSkillRef('acme/kafka')).toEqual({
      registry: null,
      namespace: 'acme',
      name: 'kafka',
      version: null,
    });
  });

  it('parses registry:ns/name@version', () => {
    expect(parseSkillRef('tessl:stripe/stripe@^2.0.0')).toEqual({
      registry: 'tessl',
      namespace: 'stripe',
      name: 'stripe',
      version: '^2.0.0',
    });
  });

  it('parses @latest', () => {
    expect(parseSkillRef('acme/foo@latest')?.version).toBe('latest');
  });

  it('rejects invalid name', () => {
    expect(parseSkillRef('acme/Bad_Name')).toBeNull();
  });

  it('rejects invalid version', () => {
    expect(parseSkillRef('acme/foo@not-semver-or-range-#$%^')).toBeNull();
  });

  it('rejects missing namespace', () => {
    expect(parseSkillRef('/foo')).toBeNull();
  });

  it('parses URL-style scheme', () => {
    expect(parseSkillRef('tessl://demo/hello@1.0.0')).toEqual({
      registry: 'tessl',
      namespace: 'demo',
      name: 'hello',
      version: '1.0.0',
    });
  });

  it('parses npm-scope-style', () => {
    expect(parseSkillRef('@tessl/demo/hello@1.0.0')).toEqual({
      registry: 'tessl',
      namespace: 'demo',
      name: 'hello',
      version: '1.0.0',
    });
  });

  it('treats internal: as no registry', () => {
    expect(parseSkillRef('internal:acme/kafka')).toEqual({
      registry: null,
      namespace: 'acme',
      name: 'kafka',
      version: null,
    });
  });

  it('rejects bad registry name in scope form', () => {
    expect(parseSkillRef('@Bad_Name/demo/hello')).toBeNull();
  });
});

describe('formatSkillRef', () => {
  it('round-trips', () => {
    const parsed = parseSkillRef('tessl:stripe/stripe@^2.0.0');
    expect(parsed).not.toBeNull();
    if (parsed) expect(formatSkillRef(parsed)).toBe('tessl:stripe/stripe@^2.0.0');
  });
});
