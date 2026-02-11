import type {
  AuthorizationEngine,
  AuthorizationInput,
  AuthorizationOptions,
  Decision,
} from '@hexmon_tech/acccess-control-core';
import { MissingTenantError } from '@hexmon_tech/acccess-control-core';
import { describe, expect, it, vi } from 'vitest';

import { createAuthzErrorHandler } from '../src/errors';
import { requireAuthz } from '../src/middleware';
import type { ExpressRequest, ExpressResponse } from '../src/types';

interface MockResponse extends ExpressResponse {
  statusCode?: number;
  body?: unknown;
}

function createDecision(allow: boolean): Decision {
  return {
    allow,
    reasons: [],
    obligations: [],
    meta: {
      traceId: 'trace-1',
      engine: 'test-engine',
      evaluatedAt: new Date().toISOString(),
    },
  };
}

function createResponse(): MockResponse {
  return {
    statusCode: undefined,
    body: undefined,
    status(code: number): MockResponse {
      this.statusCode = code;
      return this;
    },
    json(body: unknown): MockResponse {
      this.body = body;
      return this;
    },
  };
}

describe('requireAuthz', () => {
  it('allow=true calls next and sets req.authzDecision', async () => {
    const authorize = vi.fn(
      async (_input: AuthorizationInput, _options?: AuthorizationOptions): Promise<Decision> =>
        createDecision(true),
    );

    const engine: AuthorizationEngine = {
      engine: 'test-engine',
      authorize,
      batchAuthorize: async (): Promise<Decision[]> => [],
    };

    const middleware = requireAuthz({
      engine,
      action: 'post:read',
      principal: async () => ({ id: 'u1', type: 'user', tenantId: 't1' }),
      resource: async () => ({ type: 'post', id: 'p1' }),
      context: async () => ({ tenantId: 't1' }),
    });

    const req = {} as ExpressRequest;
    const res = createResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(req.authzDecision?.allow).toBe(true);
    expect(res.statusCode).toBeUndefined();
  });

  it('allow=false returns 403 and sets req.authzDecision', async () => {
    const authorize = vi.fn(
      async (_input: AuthorizationInput, _options?: AuthorizationOptions): Promise<Decision> =>
        createDecision(false),
    );

    const engine: AuthorizationEngine = {
      engine: 'test-engine',
      authorize,
      batchAuthorize: async (): Promise<Decision[]> => [],
    };

    const middleware = requireAuthz({
      engine,
      action: 'post:update',
      principal: async () => ({ id: 'u1', type: 'user', tenantId: 't1' }),
      resource: async () => ({ type: 'post', id: 'p1' }),
    });

    const req = {} as ExpressRequest;
    const res = createResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(req.authzDecision?.allow).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ code: 'ACX_ERR_FORBIDDEN' });
  });

  it('MissingTenantError flows to error handler and returns configured status', async () => {
    const authorize = vi.fn(
      async (_input: AuthorizationInput, _options?: AuthorizationOptions): Promise<Decision> => {
        throw new MissingTenantError();
      },
    );

    const engine: AuthorizationEngine = {
      engine: 'test-engine',
      authorize,
      batchAuthorize: async (): Promise<Decision[]> => [],
    };

    const middleware = requireAuthz({
      engine,
      action: 'post:read',
      principal: async () => ({ id: 'u1', type: 'user', tenantId: 't1' }),
      resource: async () => ({ type: 'post', id: 'p1' }),
    });

    const req = {} as ExpressRequest;
    const res = createResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0]?.[0];
    expect(error).toBeInstanceOf(MissingTenantError);

    const errorHandler = createAuthzErrorHandler({ missingTenantStatus: 401 });
    const errorRes = createResponse();

    errorHandler(error, req, errorRes, vi.fn());

    expect(errorRes.statusCode).toBe(401);
    expect(errorRes.body).toEqual({ code: 'ACX_ERR_MISSING_TENANT' });
  });
});
