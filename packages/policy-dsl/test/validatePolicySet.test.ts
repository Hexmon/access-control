import { describe, expect, it } from 'vitest';

import { validatePolicySet } from '../src/validate';
import type { PolicySet } from '../src/types';

describe('validatePolicySet', () => {
  it('accepts a valid policy set', () => {
    const policy: PolicySet = {
      policyVersion: '1.0.0',
      rules: [
        {
          id: 'rule-1',
          effect: 'allow',
          actions: ['post:update'],
          resourceTypes: ['post'],
          fields: {
            allow: ['title', 'meta.*'],
          },
          when: {
            op: 'eq',
            left: { ref: 'principal.attrs.department' },
            right: 'editorial',
          },
          obligations: [
            {
              type: 'log',
              payload: { event: 'policy_eval' },
            },
          ],
          priority: 10,
          tenantScope: 'tenant',
        },
      ],
    };

    const result = validatePolicySet(policy);
    expect(result.ok).toBe(true);
  });

  it('returns clear errors for invalid policies', () => {
    const result = validatePolicySet({ rules: [] });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const paths = result.errors.map((error) => error.path);
      expect(paths).toContain('/policyVersion');
    }
  });

  it('validates condition AST shape', () => {
    const invalidPolicy = {
      policyVersion: '1.0.0',
      rules: [
        {
          id: 'rule-1',
          effect: 'allow',
          actions: ['post:update'],
          resourceTypes: ['post'],
          when: {
            op: 'eq',
            left: { ref: 'principal.attrs.department' },
          },
        },
      ],
    };

    const result = validatePolicySet(invalidPolicy);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const paths = result.errors.map((error) => error.path);
      expect(paths).toContain('/rules/0/when/right');
    }
  });
});
