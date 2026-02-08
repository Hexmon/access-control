import { describe, expect, it } from 'vitest';

import { hashObject, stableStringify } from '../src/hash';

describe('hash stability regression', () => {
  it('is stable for deeply nested object key permutations', () => {
    const a = {
      policyVersion: '1.0.0',
      rules: [
        {
          id: 'rule-1',
          effect: 'allow',
          actions: ['post:update', 'post:read'],
          resourceTypes: ['post'],
          when: {
            op: 'and',
            args: [
              {
                op: 'eq',
                left: { ref: 'principal.attrs.department' },
                right: 'eng',
              },
            ],
          },
        },
      ],
      constraints: {
        maxRoleHolders: {
          SuperAdmin: 2,
        },
      },
    };

    const b = {
      constraints: {
        maxRoleHolders: {
          SuperAdmin: 2,
        },
      },
      rules: [
        {
          resourceTypes: ['post'],
          actions: ['post:update', 'post:read'],
          id: 'rule-1',
          when: {
            args: [
              {
                right: 'eng',
                op: 'eq',
                left: { ref: 'principal.attrs.department' },
              },
            ],
            op: 'and',
          },
          effect: 'allow',
        },
      ],
      policyVersion: '1.0.0',
    };

    expect(stableStringify(a)).toBe(stableStringify(b));
    expect(hashObject(a)).toBe(hashObject(b));
  });

  it('changes when array order changes', () => {
    const a = {
      actions: ['post:read', 'post:update'],
    };
    const b = {
      actions: ['post:update', 'post:read'],
    };

    expect(hashObject(a)).not.toBe(hashObject(b));
  });
});
