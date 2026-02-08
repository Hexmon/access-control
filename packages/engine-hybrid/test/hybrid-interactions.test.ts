import type {
  AuthorizationEngine,
  AuthorizationInput,
  AuthorizationOptions,
  Decision,
} from '@acx/core';
import type {
  RebacAdapter,
  RebacCheckInput,
  RebacCheckResult,
  RelationshipTuple,
} from '@acx/engine-rebac';
import { describe, expect, it, vi } from 'vitest';

import { HybridEngine } from '../src/engine';

function decision(allow: boolean): Decision {
  return {
    allow,
    reasons: [
      {
        code: allow ? 'EMBEDDED_ALLOW' : 'EMBEDDED_DENY',
        message: allow ? 'allow' : 'deny',
      },
    ],
    obligations: [],
    meta: {
      traceId: 'trace-1',
      engine: 'embedded-mock',
      evaluatedAt: new Date().toISOString(),
    },
  };
}

function createEmbeddedMock(result: Decision): {
  engine: AuthorizationEngine;
  authorize: ReturnType<typeof vi.fn>;
  batchAuthorize: ReturnType<typeof vi.fn>;
} {
  const authorize = vi.fn(
    async (_input: AuthorizationInput, _options?: AuthorizationOptions): Promise<Decision> => result,
  );
  const batchAuthorize = vi.fn(
    async (inputs: AuthorizationInput[]): Promise<Decision[]> => inputs.map(() => result),
  );

  return {
    engine: {
      engine: 'embedded-mock',
      authorize,
      batchAuthorize,
    },
    authorize,
    batchAuthorize,
  };
}

function createRebacMock(result: RebacCheckResult): {
  adapter: RebacAdapter;
  check: ReturnType<typeof vi.fn>;
} {
  const check = vi.fn(async (_input: RebacCheckInput): Promise<RebacCheckResult> => result);

  return {
    adapter: {
      writeTuples: async (_tuples: RelationshipTuple[]): Promise<void> => {},
      check,
    },
    check,
  };
}

function input(overrides?: Partial<AuthorizationInput>): AuthorizationInput {
  return {
    principal: {
      id: 'u1',
      type: 'user',
      tenantId: 'tenant-1',
    },
    resource: {
      type: 'doc',
      id: 'd1',
    },
    action: {
      name: 'doc:view',
    },
    context: {
      tenantId: 'tenant-1',
    },
    ...overrides,
  };
}

describe('hybrid interactions', () => {
  it('embedded deny remains final deny even when rebac allows', async () => {
    const embedded = createEmbeddedMock(decision(false));
    const rebac = createRebacMock({ allow: true });

    const engine = new HybridEngine({
      embeddedEngine: embedded.engine,
      rebacAdapter: rebac.adapter,
      config: { rebacEnabledActionsByResourceType: { doc: ['doc:*'] } },
    });

    const result = await engine.authorize(input());

    expect(result.allow).toBe(false);
    expect(rebac.check).toHaveBeenCalledTimes(1);
  });

  it('rebac deny blocks allow when rebac is configured', async () => {
    const embedded = createEmbeddedMock(decision(true));
    const rebac = createRebacMock({ allow: false });

    const engine = new HybridEngine({
      embeddedEngine: embedded.engine,
      rebacAdapter: rebac.adapter,
      config: { rebacEnabledActionsByResourceType: { doc: ['doc:view'] } },
    });

    const result = await engine.authorize(input());

    expect(result.allow).toBe(false);
    expect(result.reasons.some((item) => item.code === 'REBAC_DENY')).toBe(true);
  });

  it('falls back to embedded only when check is not configured', async () => {
    const embedded = createEmbeddedMock(decision(true));
    const rebac = createRebacMock({ allow: false });

    const engine = new HybridEngine({
      embeddedEngine: embedded.engine,
      rebacAdapter: rebac.adapter,
      config: { rebacEnabledActionsByResourceType: { doc: ['doc:share'] } },
    });

    const result = await engine.authorize(input());

    expect(result.allow).toBe(true);
    expect(rebac.check).not.toHaveBeenCalled();
    expect((result.meta as { engineParts?: string[] }).engineParts).toEqual(['embedded']);
  });

  it('requires resource.id to run rebac even when config matches', async () => {
    const embedded = createEmbeddedMock(decision(true));
    const rebac = createRebacMock({ allow: false });

    const engine = new HybridEngine({
      embeddedEngine: embedded.engine,
      rebacAdapter: rebac.adapter,
      config: { rebacEnabledActionsByResourceType: { '*': ['doc:*'] } },
    });

    const result = await engine.authorize(
      input({
        resource: { type: 'doc' },
      }),
    );

    expect(result.allow).toBe(true);
    expect(rebac.check).not.toHaveBeenCalled();
  });

  it('writes engineParts in meta when both engines participate', async () => {
    const embedded = createEmbeddedMock(decision(true));
    const rebac = createRebacMock({ allow: true });

    const engine = new HybridEngine({
      embeddedEngine: embedded.engine,
      rebacAdapter: rebac.adapter,
      config: { rebacEnabledActionsByResourceType: { '*': ['doc:*'] } },
    });

    const result = await engine.authorize(input());

    expect(result.allow).toBe(true);
    expect(result.meta.engine).toBe('acx-hybrid');
    expect((result.meta as { engineParts?: string[] }).engineParts).toEqual(['embedded', 'rebac']);
  });
});
