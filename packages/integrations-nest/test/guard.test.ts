import type {
  AuthorizationEngine,
  AuthorizationInput,
  AuthorizationOptions,
  Decision,
} from '@hexmon_tech/acccess-control-core';
import { MissingTenantError } from '@hexmon_tech/acccess-control-core';
import {
  BadRequestException,
  ForbiddenException,
  type ExecutionContext,
  type Type,
} from '@nestjs/common';
import { type Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';

import {
  AUTHZ_ACTION_METADATA,
  AUTHZ_RESOURCE_METADATA,
  type AuthzActionMetadata,
  type AuthzResourceMetadata,
} from '../src/decorators';
import { AuthzGuard } from '../src/guard';
import type { PrincipalResolver } from '../src/tokens';

class TestController {}

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

class ReflectorStub {
  constructor(
    private readonly actionMetadata: AuthzActionMetadata,
    private readonly resourceMetadata: AuthzResourceMetadata,
  ) {}

  public getAllAndOverride<T>(metadataKey: string): T | undefined {
    if (metadataKey === AUTHZ_ACTION_METADATA) {
      return this.actionMetadata as unknown as T;
    }

    if (metadataKey === AUTHZ_RESOURCE_METADATA) {
      return this.resourceMetadata as unknown as T;
    }

    return undefined;
  }
}

function createExecutionContext(request: Record<string, unknown>): ExecutionContext {
  const handler = (): void => {};

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
    getHandler: () => handler,
    getClass: () => TestController as Type<unknown>,
    getArgs: () => [request],
    getArgByIndex: (index: number) => (index === 0 ? request : undefined),
    switchToRpc: () => ({
      getData: () => undefined,
      getContext: () => undefined,
    }),
    switchToWs: () => ({
      getClient: () => undefined,
      getData: () => undefined,
      getPattern: () => undefined,
    }),
    getType: () => 'http',
  } as unknown as ExecutionContext;
}

function createEngineMock(allow: boolean): {
  engine: AuthorizationEngine;
  authorize: ReturnType<typeof vi.fn>;
} {
  const authorize = vi.fn(
    async (_input: AuthorizationInput, _options?: AuthorizationOptions): Promise<Decision> =>
      createDecision(allow),
  );

  return {
    engine: {
      engine: 'test-engine',
      authorize,
      batchAuthorize: async (): Promise<Decision[]> => [],
    },
    authorize,
  };
}

describe('AuthzGuard', () => {
  it('allows when engine allows', async () => {
    const { engine } = createEngineMock(true);
    const principalResolver: PrincipalResolver = {
      resolve: async () => ({ id: 'u1', type: 'user', tenantId: 't1' }),
    };

    const guard = new AuthzGuard(
      new ReflectorStub(
        { actionName: 'post:read' },
        { type: 'post', resolver: async () => ({ type: 'post', id: 'p1' }) },
      ) as unknown as Reflector,
      engine,
      principalResolver,
      { missingTenantStatus: 401 },
    );

    const request: Record<string, unknown> = {};
    const context = createExecutionContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.authzDecision).toBeDefined();
  });

  it('throws ForbiddenException when denied', async () => {
    const { engine } = createEngineMock(false);
    const principalResolver: PrincipalResolver = {
      resolve: async () => ({ id: 'u1', type: 'user', tenantId: 't1' }),
    };

    const guard = new AuthzGuard(
      new ReflectorStub(
        { actionName: 'post:delete' },
        { type: 'post', resolver: async () => ({ type: 'post', id: 'p1' }) },
      ) as unknown as Reflector,
      engine,
      principalResolver,
      { missingTenantStatus: 401 },
    );

    const context = createExecutionContext({});

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('maps MissingTenantError to configured exception type', async () => {
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

    const principalResolver: PrincipalResolver = {
      resolve: async () => ({ id: 'u1', type: 'user', tenantId: 't1' }),
    };

    const guard = new AuthzGuard(
      new ReflectorStub(
        { actionName: 'post:read' },
        { type: 'post', resolver: async () => ({ type: 'post', id: 'p1' }) },
      ) as unknown as Reflector,
      engine,
      principalResolver,
      { missingTenantStatus: 400 },
    );

    const context = createExecutionContext({});

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(BadRequestException);
  });
});
