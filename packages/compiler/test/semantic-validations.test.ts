import { describe, expect, it } from 'vitest';

import type { PolicySet } from '@hexmon_tech/policy-dsl';

import { compilePolicySet } from '../src/compile';
import { evaluateCondition } from '../src/conditions/eval';

describe('compiler semantic validations', () => {
  it('emits conflict, unreachable, missing tenant scope, and invalid selector diagnostics', () => {
    const policy: PolicySet = {
      policyVersion: '1.0.0',
      rules: [
        {
          id: 'allow-read',
          effect: 'allow',
          actions: ['doc:read'],
          resourceTypes: ['doc'],
          priority: 30,
        },
        {
          id: 'deny-read',
          effect: 'deny',
          actions: ['doc:read'],
          resourceTypes: ['doc'],
        },
        {
          id: 'allow-read-low-priority',
          effect: 'allow',
          actions: ['doc:read'],
          resourceTypes: ['doc'],
          priority: 1,
          fields: {
            allow: ['meta*'],
          },
        },
      ],
    };

    const { diagnostics } = compilePolicySet(policy, { mode: 'multi-tenant' });
    const codes = diagnostics.map((item) => item.code);

    expect(codes).toContain('CONFLICTING_RULES');
    expect(codes).toContain('UNREACHABLE_RULE');
    expect(codes).toContain('MISSING_TENANT_SCOPE');
    expect(codes).toContain('INVALID_FIELD_SELECTOR');
  });

  it('handles unknown refs in conditions safely without throwing', () => {
    const condition = {
      op: 'eq' as const,
      left: { ref: 'principal.attrs.unknownKey' },
      right: 'expected',
    };

    expect(() =>
      evaluateCondition(condition, {
        principal: { attrs: { knownKey: 'x' } },
        resource: {},
        context: {},
      }),
    ).not.toThrow();

    expect(
      evaluateCondition(condition, {
        principal: { attrs: { knownKey: 'x' } },
        resource: {},
        context: {},
      }),
    ).toBe(false);
  });
});
