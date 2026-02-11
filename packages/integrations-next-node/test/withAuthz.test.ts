import type {
  AuthorizationEngine,
  AuthorizationInput,
  AuthorizationOptions,
  Decision,
} from '@hexmon_tech/acccess-control-core';
import { MissingTenantError } from '@hexmon_tech/acccess-control-core';
import { describe, expect, it, vi } from 'vitest';

import { AuthzDeniedError, withAuthz } from '../src/withAuthz';

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

describe('withAuthz', () => {
  it('allow=true returns handler result', async () => {
    const authorize = vi.fn(
      async (_input: AuthorizationInput, _options?: AuthorizationOptions): Promise<Decision> =>
        createDecision(true),
    );

    const engine: AuthorizationEngine = {
      engine: 'test-engine',
      authorize,
      batchAuthorize: async (): Promise<Decision[]> => [],
    };

    const wrapped = withAuthz(async (value: number): Promise<number> => value * 2, {
      engine,
      action: 'calc:run',
      getPrincipal: async () => ({ id: 'u1', type: 'user', tenantId: 't1' }),
      getResource: async () => ({ type: 'calc', id: 'r1' }),
    });

    await expect(wrapped(3)).resolves.toBe(6);
  });

  it('deny returns 403 Response for route handler wrapper', async () => {
    const authorize = vi.fn(
      async (_input: AuthorizationInput, _options?: AuthorizationOptions): Promise<Decision> =>
        createDecision(false),
    );

    const engine: AuthorizationEngine = {
      engine: 'test-engine',
      authorize,
      batchAuthorize: async (): Promise<Decision[]> => [],
    };

    const wrapped = withAuthz(
      async (_req: Request): Promise<Response> => new Response('ok', { status: 200 }),
      {
        engine,
        action: 'post:update',
        getPrincipal: async () => ({ id: 'u1', type: 'user', tenantId: 't1' }),
        getResource: async () => ({ type: 'post', id: 'p1' }),
      },
    );

    const response = await wrapped(new Request('http://localhost/posts/1'));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ code: 'ACX_ERR_FORBIDDEN' });
  });

  it('MissingTenantError handled via onDeny for route and thrown for action wrapper by default', async () => {
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

    const routeWrapped = withAuthz(
      async (_req: Request): Promise<Response> => new Response('ok', { status: 200 }),
      {
        engine,
        action: 'post:read',
        getPrincipal: async () => ({ id: 'u1', type: 'user', tenantId: 't1' }),
        getResource: async () => ({ type: 'post', id: 'p1' }),
        onDeny: async () => new Response(JSON.stringify({ code: 'CUSTOM_DENY' }), { status: 401 }),
      },
    );

    const routeResponse = await routeWrapped(new Request('http://localhost/posts/1'));
    expect(routeResponse.status).toBe(401);
    await expect(routeResponse.json()).resolves.toEqual({ code: 'CUSTOM_DENY' });

    const actionWrapped = withAuthz(async (value: string): Promise<string> => value, {
      engine,
      action: 'post:read',
      getPrincipal: async () => ({ id: 'u1', type: 'user', tenantId: 't1' }),
      getResource: async () => ({ type: 'post', id: 'p1' }),
    });

    await expect(actionWrapped('x')).rejects.toBeInstanceOf(MissingTenantError);
  });

  it('server action deny throws AuthzDeniedError by default', async () => {
    const authorize = vi.fn(
      async (_input: AuthorizationInput, _options?: AuthorizationOptions): Promise<Decision> =>
        createDecision(false),
    );

    const engine: AuthorizationEngine = {
      engine: 'test-engine',
      authorize,
      batchAuthorize: async (): Promise<Decision[]> => [],
    };

    const wrapped = withAuthz(async (value: string): Promise<string> => value, {
      engine,
      action: 'post:delete',
      getPrincipal: async () => ({ id: 'u1', type: 'user', tenantId: 't1' }),
      getResource: async () => ({ type: 'post', id: 'p1' }),
    });

    await expect(wrapped('value')).rejects.toBeInstanceOf(AuthzDeniedError);
  });
});
