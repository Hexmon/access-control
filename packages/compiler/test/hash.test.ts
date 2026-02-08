import { describe, expect, it } from 'vitest';

import { hashObject } from '../src/hash';

describe('hash stability', () => {
  it('produces stable hashes regardless of key order', () => {
    const policyA = {
      policyVersion: '1.0.0',
      rules: [
        {
          id: 'rule-1',
          effect: 'allow',
          actions: ['post:read'],
          resourceTypes: ['post'],
        },
      ],
    };

    const policyB = {
      rules: [
        {
          resourceTypes: ['post'],
          actions: ['post:read'],
          effect: 'allow',
          id: 'rule-1',
        },
      ],
      policyVersion: '1.0.0',
    };

    expect(hashObject(policyA)).toBe(hashObject(policyB));
  });
});
