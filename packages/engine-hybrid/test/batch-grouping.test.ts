import type {
  AuthorizationEngine,
  AuthorizationInput,
  AuthorizationOptions,
  Decision,
} from '@hexmon_tech/core';
import type {
  RebacAdapter,
  RebacCheckInput,
  RebacCheckResult,
  RelationshipTuple,
} from '@hexmon_tech/engine-rebac';
import { describe, expect, it, vi } from 'vitest';

import { HybridEngine } from '../src/engine';

function createEmbeddedBatchMock(): {
  engine: AuthorizationEngine;
  batchAuthorize: ReturnType<typeof vi.fn>;
} {
  const batchAuthorize = vi.fn(
    async (inputs: AuthorizationInput[], _options?: AuthorizationOptions): Promise<Decision[]> =>
      inputs.map((input) => ({
        allow: input.action.name !== 'doc:blocked-by-embedded',
        reasons: [
          {
            code:
              input.action.name === 'doc:blocked-by-embedded' ? 'EMBEDDED_DENY' : 'EMBEDDED_ALLOW',
            message: 'embedded',
          },
        ],
        obligations: [],
        meta: {
          traceId: `trace-${input.resource.id ?? 'none'}`,
          engine: 'embedded-mock',
          evaluatedAt: new Date().toISOString(),
        },
      })),
  );

  const authorize = vi.fn(async (): Promise<Decision> => {
    throw new Error('authorize should not be used in this batch test');
  });

  return {
    engine: {
      engine: 'embedded-mock',
      authorize,
      batchAuthorize,
    },
    batchAuthorize,
  };
}

function createRebacMock(): {
  adapter: RebacAdapter;
  check: ReturnType<typeof vi.fn>;
} {
  const check = vi.fn(async (input: RebacCheckInput): Promise<RebacCheckResult> => {
    if (input.object.id === 'deny-by-rebac') {
      return { allow: false };
    }
    return { allow: true };
  });

  return {
    adapter: {
      writeTuples: async (_tuples: RelationshipTuple[]): Promise<void> => {},
      check,
    },
    check,
  };
}

describe('hybrid batch grouping', () => {
  it('runs rebac only for configured/id-qualified inputs and preserves order', async () => {
    const embedded = createEmbeddedBatchMock();
    const rebac = createRebacMock();

    const engine = new HybridEngine({
      embeddedEngine: embedded.engine,
      rebacAdapter: rebac.adapter,
      config: {
        rebacEnabledActionsByResourceType: {
          doc: ['doc:view'],
        },
      },
    });

    const inputs: AuthorizationInput[] = [
      {
        principal: { id: 'u1', type: 'user', tenantId: 't1' },
        resource: { type: 'doc', id: 'allow-by-all' },
        action: { name: 'doc:view' },
      },
      {
        principal: { id: 'u1', type: 'user', tenantId: 't1' },
        resource: { type: 'doc', id: 'deny-by-rebac' },
        action: { name: 'doc:view' },
      },
      {
        principal: { id: 'u1', type: 'user', tenantId: 't1' },
        resource: { type: 'doc' },
        action: { name: 'doc:view' },
      },
      {
        principal: { id: 'u1', type: 'user', tenantId: 't1' },
        resource: { type: 'doc', id: 'not-configured' },
        action: { name: 'doc:edit' },
      },
      {
        principal: { id: 'u1', type: 'user', tenantId: 't1' },
        resource: { type: 'doc', id: 'embedded-deny' },
        action: { name: 'doc:blocked-by-embedded' },
      },
    ];

    const decisions = await engine.batchAuthorize(inputs);

    expect(embedded.batchAuthorize).toHaveBeenCalledTimes(1);
    expect(rebac.check).toHaveBeenCalledTimes(2);

    expect(decisions).toHaveLength(inputs.length);
    expect(decisions[0]?.allow).toBe(true);
    expect(decisions[1]?.allow).toBe(false);
    expect(decisions[2]?.allow).toBe(true);
    expect(decisions[3]?.allow).toBe(true);
    expect(decisions[4]?.allow).toBe(false);

    expect((decisions[0]?.meta as { engineParts?: string[] }).engineParts).toEqual([
      'embedded',
      'rebac',
    ]);
    expect((decisions[2]?.meta as { engineParts?: string[] }).engineParts).toEqual(['embedded']);
  });
});
