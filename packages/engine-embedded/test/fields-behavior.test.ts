import { describe, expect, it } from 'vitest';

import { compilePolicySet } from '../../compiler/src/compile';
import type { PolicySet } from '@hexmon_tech/policy-dsl';

import { EmbeddedEngine } from '../src/engine';

function createEngine(policy: PolicySet, options: Parameters<typeof EmbeddedEngine>[0] = {}) {
  const { ir } = compilePolicySet(policy);
  const engine = new EmbeddedEngine(options);
  engine.setPolicy(ir);
  return engine;
}

const principal = {
  id: 'user-1',
  type: 'user' as const,
  tenantId: 'tenant-1',
};

const policy: PolicySet = {
  policyVersion: '1.0.0',
  rules: [
    {
      id: 'allow-update-fields',
      effect: 'allow',
      actions: ['post:update'],
      resourceTypes: ['post'],
      fields: {
        allow: ['title', 'meta.*'],
      },
      obligations: [
        {
          type: 'maskFields',
          payload: { fields: ['meta.secret'] },
        },
      ],
    },
    {
      id: 'deny-sensitive',
      effect: 'deny',
      actions: ['post:update'],
      resourceTypes: ['post'],
      fields: {
        deny: ['salary', 'meta.secret'],
      },
    },
  ],
};

describe('embedded field behavior', () => {
  it('adds omitFields obligations for denied/disallowed fields in omit mode', async () => {
    const engine = createEngine(policy, { fieldViolation: 'omit' });

    const decision = await engine.authorize({
      principal,
      resource: { type: 'post', id: 'p1' },
      action: {
        name: 'post:update',
        fields: ['title', 'meta.public', 'meta.secret', 'salary'],
      },
    });

    expect(decision.allow).toBe(true);
    expect(decision.obligations).toEqual(
      expect.arrayContaining([
        { type: 'maskFields', payload: { fields: ['meta.secret'] } },
        { type: 'omitFields', payload: { fields: ['meta.secret', 'salary'] } },
      ]),
    );
  });

  it('denies when fieldViolation is deny and any field is disallowed', async () => {
    const engine = createEngine(policy, { fieldViolation: 'deny' });

    const decision = await engine.authorize({
      principal,
      resource: { type: 'post', id: 'p1' },
      action: {
        name: 'post:update',
        fields: ['title', 'salary'],
      },
    });

    expect(decision.allow).toBe(false);
    expect(decision.reasons[0]?.code).toBe('FIELD_VIOLATION');
  });

  it('supports wildcard selectors with nested fields', async () => {
    const wildcardEngine = createEngine(
      {
        policyVersion: '1.0.0',
        rules: [
          {
            id: 'allow-meta',
            effect: 'allow',
            actions: ['doc:update'],
            resourceTypes: ['doc'],
            fields: {
              allow: ['meta.*'],
            },
          },
        ],
      },
      { fieldViolation: 'omit' },
    );

    const decision = await wildcardEngine.authorize({
      principal,
      resource: { type: 'doc', id: 'd1' },
      action: {
        name: 'doc:update',
        fields: ['meta.owner', 'meta.createdAt', 'title'],
      },
    });

    expect(decision.allow).toBe(true);
    expect(decision.obligations).toEqual(
      expect.arrayContaining([{ type: 'omitFields', payload: { fields: ['title'] } }]),
    );
  });
});
