import { describe, expect, it } from 'vitest';

import { compilePolicySet } from '../../compiler/src/compile';
import type { PolicySet } from '@acx/policy-dsl';

import { EmbeddedEngine } from '../src/engine';

function createEngine(policy: PolicySet, options: Parameters<typeof EmbeddedEngine>[0] = {}) {
  const { ir } = compilePolicySet(policy);
  const engine = new EmbeddedEngine(options);
  engine.setPolicy(ir);
  return engine;
}

describe('batchAuthorize parity', () => {
  it('returns decisions equivalent to authorize for the same inputs', async () => {
    const engine = createEngine({
      policyVersion: '1.0.0',
      rules: [
        {
          id: 'allow-read',
          effect: 'allow',
          actions: ['doc:read'],
          resourceTypes: ['doc'],
        },
        {
          id: 'deny-delete',
          effect: 'deny',
          actions: ['doc:delete'],
          resourceTypes: ['doc'],
        },
      ],
    });

    const inputs = [
      {
        principal: { id: 'u1', type: 'user' as const, tenantId: 't1' },
        resource: { type: 'doc', id: 'd1' },
        action: { name: 'doc:read' },
      },
      {
        principal: { id: 'u1', type: 'user' as const, tenantId: 't1' },
        resource: { type: 'doc', id: 'd2' },
        action: { name: 'doc:delete' },
      },
      {
        principal: { id: 'u1', type: 'user' as const, tenantId: 't1' },
        resource: { type: 'doc', id: 'd3' },
        action: { name: 'doc:update' },
      },
    ];

    const single = await Promise.all(inputs.map((input) => engine.authorize(input)));
    const batch = await engine.batchAuthorize(inputs);

    expect(batch).toHaveLength(single.length);

    const shape = (decision: { allow: boolean; reasons: { code: string }[]; obligations: unknown[] }) => ({
      allow: decision.allow,
      reasonCodes: decision.reasons.map((reason) => reason.code),
      obligations: decision.obligations,
    });

    expect(batch.map(shape)).toEqual(single.map(shape));
  });
});
