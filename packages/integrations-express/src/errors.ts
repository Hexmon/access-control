import { AcxError, EngineError, InvalidPolicyError, MissingTenantError } from '@hexmon_tech/core';

import type { AuthzErrorBody, AuthzErrorHandlerOptions, ExpressErrorMiddleware } from './types';

/** Create an Express error handler for acx authorization errors. */
export function createAuthzErrorHandler(
  options: AuthzErrorHandlerOptions = {},
): ExpressErrorMiddleware {
  const missingTenantStatus = options.missingTenantStatus ?? 400;

  return (error, _req, res, _next): void => {
    void _req;
    void _next;
    const mapped = mapError(error, {
      missingTenantStatus,
      exposeMessages: options.exposeMessages ?? false,
    });

    res.status(mapped.status).json(mapped.body);
  };
}

function mapError(
  error: unknown,
  options: { missingTenantStatus: 400 | 401; exposeMessages: boolean },
): { status: 400 | 401 | 403 | 500; body: AuthzErrorBody } {
  if (error instanceof MissingTenantError) {
    return {
      status: options.missingTenantStatus,
      body: buildBody(error.code, error.message, options.exposeMessages),
    };
  }

  if (error instanceof InvalidPolicyError) {
    return {
      status: 400,
      body: buildBody(error.code, error.message, options.exposeMessages),
    };
  }

  if (error instanceof EngineError) {
    return {
      status: 500,
      body: buildBody(error.code, error.message, options.exposeMessages),
    };
  }

  if (error instanceof AcxError) {
    return {
      status: 403,
      body: buildBody(error.code, error.message, options.exposeMessages),
    };
  }

  return {
    status: 500,
    body: buildBody('ACX_ERR_INTERNAL', 'Internal authorization error.', options.exposeMessages),
  };
}

function buildBody(code: string, message: string, exposeMessages: boolean): AuthzErrorBody {
  if (exposeMessages) {
    return { code, message };
  }

  return { code };
}
