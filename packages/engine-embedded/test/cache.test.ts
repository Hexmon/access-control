import { describe, expect, it, vi } from 'vitest';

import { compilePolicySet } from '../../compiler/src/compile';
import type { PolicySet } from '@hexmon_tech/acccess-control-policy-dsl';

import { EmbeddedEngine } from '../src/engine';

function createEngine(policy: PolicySet, options: Parameters<typeof EmbeddedEngine>[0] = {}) {
  const { ir } = compilePolicySet(policy);
  const engine = new EmbeddedEngine(options);
  engine.setPolicy(ir);
  return engine;
}

describe('embedded cache behavior', () => {
  it('uses TTL correctly with fake timers and expires entries deterministically', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

      const engine = createEngine(
        {
          policyVersion: '1.0.0',
          rules: [
            {
              id: 'allow-read',
              effect: 'allow',
              actions: ['doc:read'],
              resourceTypes: ['doc'],
            },
          ],
        },
        {
          cache: { ttlMs: 1000, maxSize: 10 },
        },
      );

      const input = {
        principal: { id: 'u1', type: 'user' as const, tenantId: 't1' },
        resource: { type: 'doc', id: 'd1' },
        action: { name: 'doc:read' },
      };

      await engine.authorize(input);
      const m1 = engine.getMetrics();

      await engine.authorize(input);
      const m2 = engine.getMetrics();

      expect(m1.evaluations).toBe(1);
      expect(m2.cacheHits).toBe(1);
      expect(m2.evaluations).toBe(1);

      vi.setSystemTime(new Date('2026-01-01T00:00:00.800Z'));
      await engine.authorize(input);
      const m3 = engine.getMetrics();
      expect(m3.evaluations).toBe(1);

      vi.setSystemTime(new Date('2026-01-01T00:00:01.500Z'));
      await engine.authorize(input);
      const m4 = engine.getMetrics();
      expect(m4.evaluations).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('invalidates cache when policy is replaced', async () => {
    const allowPolicy: PolicySet = {
      policyVersion: '1.0.0',
      rules: [
        {
          id: 'allow-read',
          effect: 'allow',
          actions: ['doc:read'],
          resourceTypes: ['doc'],
        },
      ],
    };

    const denyPolicy: PolicySet = {
      policyVersion: '1.0.1',
      rules: [
        {
          id: 'deny-read',
          effect: 'deny',
          actions: ['doc:read'],
          resourceTypes: ['doc'],
        },
      ],
    };

    const { ir: allowIr } = compilePolicySet(allowPolicy);
    const { ir: denyIr } = compilePolicySet(denyPolicy);

    const engine = new EmbeddedEngine({ cache: { ttlMs: 10_000, maxSize: 10 } });
    engine.setPolicy(allowIr);

    const input = {
      principal: { id: 'u1', type: 'user' as const, tenantId: 't1' },
      resource: { type: 'doc', id: 'd1' },
      action: { name: 'doc:read' },
    };

    const first = await engine.authorize(input);
    expect(first.allow).toBe(true);

    await engine.authorize(input);
    const before = engine.getMetrics();
    expect(before.cacheHits).toBeGreaterThan(0);

    engine.setPolicy(denyIr);

    const second = await engine.authorize(input);
    expect(second.allow).toBe(false);
  });
});
