import { describe, expect, it } from 'vitest';
import {
  CavalryError,
  PolicyViolationError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from './errors';

describe('CavalryError', () => {
  it('defaults status from code', () => {
    expect(new NotFoundError('x').status).toBe(404);
    expect(new UnauthorizedError().status).toBe(401);
    expect(new PolicyViolationError('x').status).toBe(403);
    expect(new ValidationError('x').status).toBe(422);
  });

  it('serializes to RFC 7807-shaped JSON', () => {
    const err = new PolicyViolationError('Blocked by allowlist', { policyId: 'p_1' });
    expect(err.toJSON()).toMatchObject({
      type: 'https://cavalry.sh/errors/policy-violation',
      title: 'policy_violation',
      status: 403,
      detail: 'Blocked by allowlist',
      details: { policyId: 'p_1' },
    });
  });

  it('custom status overrides default', () => {
    const err = new CavalryError({ code: 'upstream_error', message: 'x', status: 504 });
    expect(err.status).toBe(504);
  });
});
