import { describe, expect, it } from 'vitest';

import type { PolicySet } from '@hexmon_tech/policy-dsl';

import { compilePolicySet } from '../src/compile';

describe('semantic diagnostics', () => {
  it('returns diagnostics for conflicts, unreachable rules, tenant scope, and field selectors', () => {
    const policy: PolicySet = {
      policyVersion: '1.0.0',
      rules: [
        {
          id: 'allow-1',
          effect: 'allow',
          actions: ['post:read'],
          resourceTypes: ['post'],
          priority: 10,
        },
        {
          id: 'deny-1',
          effect: 'deny',
          actions: ['post:read'],
          resourceTypes: ['post'],
          fields: {
            allow: ['meta*'],
          },
        },
        {
          id: 'allow-2',
          effect: 'allow',
          actions: ['post:read'],
          resourceTypes: ['post'],
          priority: 1,
        },
      ],
    };

    const { diagnostics } = compilePolicySet(policy, { mode: 'multi-tenant' });
    const codes = diagnostics.map((diag) => diag.code);

    expect(codes).toContain('MISSING_TENANT_SCOPE');
    expect(codes).toContain('INVALID_FIELD_SELECTOR');
    expect(codes).toContain('CONFLICTING_RULES');
    expect(codes).toContain('UNREACHABLE_RULE');
  });
});
