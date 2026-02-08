import { describe, expect, it } from 'vitest';

import type { Condition } from '@hexmon_tech/policy-dsl';

import { evaluateCondition } from '../src/conditions/eval';

const input = {
  principal: {
    attrs: {
      department: 'sales',
      tags: ['alpha', 'beta'],
    },
  },
  resource: {
    attrs: {
      ownerId: 'user-1',
    },
  },
  context: {
    request: {
      ip: '10.0.0.5',
    },
  },
};

describe('condition evaluation', () => {
  it('evaluates eq and logical operators', () => {
    const condition: Condition = {
      op: 'and',
      args: [
        {
          op: 'eq',
          left: { ref: 'principal.attrs.department' },
          right: 'sales',
        },
        {
          op: 'not',
          arg: {
            op: 'eq',
            left: { ref: 'resource.attrs.ownerId' },
            right: 'user-2',
          },
        },
      ],
    };

    expect(evaluateCondition(condition, input)).toBe(true);
  });

  it('evaluates in and matches', () => {
    const inCondition: Condition = {
      op: 'in',
      item: 'alpha',
      set: { ref: 'principal.attrs.tags' },
    };

    const matchesCondition: Condition = {
      op: 'matches',
      text: { ref: 'context.request.ip' },
      regex: '^10\\.0\\.0\\.',
    };

    const combined: Condition = {
      op: 'or',
      args: [inCondition, matchesCondition],
    };

    expect(evaluateCondition(combined, input)).toBe(true);
  });
});
