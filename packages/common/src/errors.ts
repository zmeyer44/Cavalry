export type CavalryErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'validation_error'
  | 'policy_violation'
  | 'approval_required'
  | 'upstream_error'
  | 'rate_limited'
  | 'internal_error';

export interface CavalryErrorOptions {
  code: CavalryErrorCode;
  message: string;
  status?: number;
  details?: Record<string, unknown>;
  cause?: unknown;
}

const DEFAULT_STATUS: Record<CavalryErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  validation_error: 422,
  policy_violation: 403,
  approval_required: 202,
  upstream_error: 502,
  rate_limited: 429,
  internal_error: 500,
};

export class CavalryError extends Error {
  readonly code: CavalryErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(options: CavalryErrorOptions) {
    super(options.message, options.cause ? { cause: options.cause } : undefined);
    this.name = 'CavalryError';
    this.code = options.code;
    this.status = options.status ?? DEFAULT_STATUS[options.code];
    this.details = options.details;
  }

  toJSON() {
    return {
      type: `https://cavalry.sh/errors/${this.code.replace(/_/g, '-')}`,
      title: this.code,
      status: this.status,
      detail: this.message,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

export class PolicyViolationError extends CavalryError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({ code: 'policy_violation', message, details });
    this.name = 'PolicyViolationError';
  }
}

export class NotFoundError extends CavalryError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({ code: 'not_found', message, details });
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends CavalryError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({ code: 'validation_error', message, details });
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends CavalryError {
  constructor(message = 'Authentication required') {
    super({ code: 'unauthorized', message });
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends CavalryError {
  constructor(message = 'Not allowed') {
    super({ code: 'forbidden', message });
    this.name = 'ForbiddenError';
  }
}
