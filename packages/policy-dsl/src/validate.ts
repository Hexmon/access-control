import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020';

import policySetSchema from './schema/policyset.schema.json';
import type { PolicySet } from './types';

/** Validation error returned by the policy validator. */
export interface ValidationError {
  path: string;
  message: string;
  keyword: string;
  schemaPath: string;
  params?: Record<string, unknown>;
}

export type ValidationResult = { ok: true } | { ok: false; errors: ValidationError[] };

const ajv = new Ajv({ allErrors: true });
const validatePolicySetFn = ajv.compile(
  policySetSchema as unknown as Record<string, unknown>,
) as ValidateFunction<PolicySet>;

/**
 * Validate a PolicySet against the JSON schema.
 */
export function validatePolicySet(policySet: unknown): ValidationResult {
  const valid = validatePolicySetFn(policySet);

  if (valid) {
    return { ok: true };
  }

  return {
    ok: false,
    errors: formatErrors(validatePolicySetFn.errors),
  };
}

function formatErrors(errors: ErrorObject[] | null | undefined): ValidationError[] {
  if (!errors || errors.length === 0) {
    return [
      {
        path: '/',
        message: 'PolicySet is invalid.',
        keyword: 'invalid',
        schemaPath: '#/',
      },
    ];
  }

  return errors.map((error) => {
    const params = error.params as Record<string, unknown> | undefined;
    let path = error.instancePath || '/';

    if (
      error.keyword === 'required' &&
      params &&
      typeof params['missingProperty'] === 'string'
    ) {
      const missing = params['missingProperty'];
      const prefix = error.instancePath ? error.instancePath : '';
      path = `${prefix}/${missing}` || `/${missing}`;
    }

    const formatted: ValidationError = {
      path: path === '' ? '/' : path,
      message: formatMessage(error),
      keyword: error.keyword,
      schemaPath: error.schemaPath,
    };

    if (params) {
      formatted.params = params;
    }

    return formatted;
  });
}

function formatMessage(error: ErrorObject): string {
  if (error.keyword === 'oneOf') {
    return 'Value does not match any allowed schema.';
  }

  return error.message ?? 'Invalid value.';
}
