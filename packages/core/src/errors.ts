export const ERROR_CODES = {
  MissingTenant: 'ACX_ERR_MISSING_TENANT',
  InvalidPolicy: 'ACX_ERR_INVALID_POLICY',
  Engine: 'ACX_ERR_ENGINE',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** Base class for @hexmon_tech errors with stable error codes. */
export class AcxError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(message: string, code: ErrorCode, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.details = details;
  }
}

/** Thrown when tenant context is required but missing. */
export class MissingTenantError extends AcxError {
  constructor(message = 'Tenant id is required for authorization.', details?: unknown) {
    super(message, ERROR_CODES.MissingTenant, details);
  }
}

/** Thrown when policy data is invalid or inconsistent. */
export class InvalidPolicyError extends AcxError {
  constructor(message = 'Policy is invalid.', details?: unknown) {
    super(message, ERROR_CODES.InvalidPolicy, details);
  }
}

/** Thrown when the engine encounters an unexpected failure. */
export class EngineError extends AcxError {
  constructor(message = 'Engine error.', details?: unknown) {
    super(message, ERROR_CODES.Engine, details);
  }
}
