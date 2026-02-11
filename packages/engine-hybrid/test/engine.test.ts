import type {
  AuthorizationEngine,
  AuthorizationInput,
  AuthorizationOptions,
  Decision,
} from '@hexmon_tech/acccess-control-core';
import type {
  RebacAdapter,
  RebacCheckInput,
  RebacCheckResult,
  RelationshipTuple,
} from '@hexmon_tech/acccess-control-engine-rebac';
import { describe, expect, it, vi } from 'vitest';

import { HybridEngine } from '../src/engine';

function createDecision(allow: boolean): Decision {
  return {
    allow,
    reasons: [
      {
        code: allow ? 'EMBEDDED_ALLOW' : 'EMBEDDED_DENY',
        message: allow ? 'Embedded allowed.' : 'Embedded denied.',
      },
    ],
    obligations: allow ? [{ type: 'log' }] : [],
    meta: {
      traceId: 'trace-1',
      engine: 'embedded-mock',
      evaluatedAt: new Date().toISOString(),
      policyVersion: '1.0.0',
      policyHash: 'hash-1',
      tenantId: 'tenant-1',
    },
  };
}

function createEmbeddedMock(decision: Decision): {
  engine: AuthorizationEngine;
  authorize: ReturnType<typeof vi.fn>;
  batchAuthorize: ReturnType<typeof vi.fn>;
} {
  const authorize = vi.fn(
    async (_input: AuthorizationInput, _options?: AuthorizationOptions): Promise<Decision> =>
      decision,
  );
  const batchAuthorize = vi.fn(
    async (inputs: AuthorizationInput[], _options?: AuthorizationOptions): Promise<Decision[]> =>
      inputs.map(() => decision),
  );

  const engine: AuthorizationEngine = {
    engine: 'embedded-mock',
    authorize,
    batchAuthorize,
  };

  return { engine, authorize, batchAuthorize };
}

function createRebacMock(result: RebacCheckResult): {
  adapter: RebacAdapter;
  check: ReturnType<typeof vi.fn>;
} {
  const check = vi.fn(async (_input: RebacCheckInput): Promise<RebacCheckResult> => result);

  const adapter: RebacAdapter = {
    writeTuples: async (_tuples: RelationshipTuple[]): Promise<void> => {},
    check,
  };

  return { adapter, check };
}

function baseInput(overrides?: Partial<AuthorizationInput>): AuthorizationInput {
  return {
    principal: {
      id: 'u-1',
      type: 'user',
      tenantId: 'tenant-1',
    },
    resource: {
      type: 'doc',
      id: 'd-1',
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

describe('HybridEngine', () => {
  it('embedded denies even if rebac allows (configured check)', async () => {
    const embedded = createEmbeddedMock(createDecision(false));
    const rebac = createRebacMock({ allow: true });

    const engine = new HybridEngine({
      embeddedEngine: embedded.engine,
      rebacAdapter: rebac.adapter,
      config: {
        rebacEnabledActionsByResourceType: {
          doc: ['doc:*'],
        },
      },
    });

    const decision = await engine.authorize(baseInput());

    expect(embedded.authorize).toHaveBeenCalledTimes(1);
    expect(rebac.check).toHaveBeenCalledTimes(1);
    expect(decision.allow).toBe(false);
    expect(decision.reasons.some((reason) => reason.code === 'EMBEDDED_DENY')).toBe(true);
    expect(decision.reasons.some((reason) => reason.code === 'REBAC_ALLOW')).toBe(true);
  });

  it('rebac denies even if embedded allows (configured check)', async () => {
    const embedded = createEmbeddedMock(createDecision(true));
    const rebac = createRebacMock({ allow: false });

    const engine = new HybridEngine({
      embeddedEngine: embedded.engine,
      rebacAdapter: rebac.adapter,
      config: {
        rebacEnabledActionsByResourceType: {
          doc: ['doc:view'],
        },
      },
    });

    const decision = await engine.authorize(baseInput());

    expect(embedded.authorize).toHaveBeenCalledTimes(1);
    expect(rebac.check).toHaveBeenCalledTimes(1);
    expect(decision.allow).toBe(false);
    expect(decision.reasons.some((reason) => reason.code === 'EMBEDDED_ALLOW')).toBe(true);
    expect(decision.reasons.some((reason) => reason.code === 'REBAC_DENY')).toBe(true);
  });

  it('unconfigured check uses embedded only (rebac not called)', async () => {
    const embedded = createEmbeddedMock(createDecision(true));
    const rebac = createRebacMock({ allow: false });

    const engine = new HybridEngine({
      embeddedEngine: embedded.engine,
      rebacAdapter: rebac.adapter,
      config: {
        rebacEnabledActionsByResourceType: {
          doc: ['doc:share'],
        },
      },
    });

    const decision = await engine.authorize(baseInput());

    expect(embedded.authorize).toHaveBeenCalledTimes(1);
    expect(rebac.check).not.toHaveBeenCalled();
    expect(decision.allow).toBe(true);
    expect((decision.meta as { engineParts?: string[] }).engineParts).toEqual(['embedded']);
  });

  it('configured check requires resource.id; if absent then embedded only', async () => {
    const embedded = createEmbeddedMock(createDecision(true));
    const rebac = createRebacMock({ allow: false });

    const engine = new HybridEngine({
      embeddedEngine: embedded.engine,
      rebacAdapter: rebac.adapter,
      config: {
        rebacEnabledActionsByResourceType: {
          '*': ['doc:*'],
        },
      },
    });

    const decision = await engine.authorize(
      baseInput({
        resource: {
          type: 'doc',
        },
      }),
    );

    expect(embedded.authorize).toHaveBeenCalledTimes(1);
    expect(rebac.check).not.toHaveBeenCalled();
    expect(decision.allow).toBe(true);
    expect((decision.meta as { engineParts?: string[] }).engineParts).toEqual(['embedded']);
  });

  it('decision.meta indicates both engines participated when configured and id present', async () => {
    const embedded = createEmbeddedMock(createDecision(true));
    const rebac = createRebacMock({ allow: true, trace: { source: 'rebac' } });

    const engine = new HybridEngine({
      embeddedEngine: embedded.engine,
      rebacAdapter: rebac.adapter,
      config: {
        rebacEnabledActionsByResourceType: {
          '*': ['doc:*'],
        },
      },
    });

    const decision = await engine.authorize(baseInput());

    expect(rebac.check).toHaveBeenCalledTimes(1);
    expect(decision.allow).toBe(true);
    expect(decision.meta.engine).toBe('hexmon_tech-hybrid');
    expect((decision.meta as { engineParts?: string[] }).engineParts).toEqual([
      'embedded',
      'rebac',
    ]);
  });
});
