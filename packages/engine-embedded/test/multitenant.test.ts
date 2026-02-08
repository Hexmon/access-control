import { describe, expect, it } from 'vitest';

import { compilePolicySet } from '../../compiler/src/compile';
import { ERROR_CODES, MissingTenantError } from '@hexmon_tech/core';
import type { PolicySet } from '@hexmon_tech/policy-dsl';

import { EmbeddedEngine } from '../src/engine';

function createEngine(policy: PolicySet, options: Parameters<typeof EmbeddedEngine>[0] = {}) {
  const { ir } = compilePolicySet(policy);
  const engine = new EmbeddedEngine(options);
  engine.setPolicy(ir);
  return engine;
}

describe('embedded multi-tenant behavior', () => {
  it('throws MissingTenantError in multi-tenant mode when tenant is absent', async () => {
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
      { mode: 'multi-tenant' },
    );

    await expect(
      engine.authorize({
        principal: { id: 'u1', type: 'user', tenantId: '' },
        resource: { type: 'doc', id: 'd1' },
        action: { name: 'doc:read' },
      }),
    ).rejects.toBeInstanceOf(MissingTenantError);

    await expect(
      engine.authorize({
        principal: { id: 'u1', type: 'user', tenantId: '' },
        resource: { type: 'doc', id: 'd1' },
        action: { name: 'doc:read' },
      }),
    ).rejects.toMatchObject({ code: ERROR_CODES.MissingTenant });
  });

  it('accepts tenant from context when principal tenant is empty', async () => {
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
      { mode: 'multi-tenant' },
    );

    const decision = await engine.authorize({
      principal: { id: 'u1', type: 'user', tenantId: '' },
      resource: { type: 'doc', id: 'd1' },
      action: { name: 'doc:read' },
      context: { tenantId: 'tenant-a' },
    });

    expect(decision.allow).toBe(true);
    expect(decision.meta.tenantId).toBe('tenant-a');
  });
});
