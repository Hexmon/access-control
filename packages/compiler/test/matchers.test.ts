import { describe, expect, it } from 'vitest';

import type { PolicySet } from '@hexmon_tech/policy-dsl';

import { compilePolicySet, matchesAction } from '../src/compile';
import { compileFieldSelectors } from '../src/fields/compileSelectors';

describe('action wildcard matching', () => {
  it('matches prefix wildcards', () => {
    const policy: PolicySet = {
      policyVersion: '1.0.0',
      rules: [
        {
          id: 'rule-1',
          effect: 'allow',
          actions: ['post:*', 'comment:read'],
          resourceTypes: ['post'],
        },
      ],
    };

    const { ir } = compilePolicySet(policy);
    const matchers = ir.compiledRules[0].actionMatchers;

    expect(matchesAction('post:update', matchers)).toBe(true);
    expect(matchesAction('post:read', matchers)).toBe(true);
    expect(matchesAction('comment:read', matchers)).toBe(true);
    expect(matchesAction('comment:write', matchers)).toBe(false);
  });
});

describe('field selector matching', () => {
  it('matches exact and prefix selectors', () => {
    const { compiled } = compileFieldSelectors({
      allow: ['title', 'meta.*'],
    });

    expect(compiled.allow?.match('title')).toBe(true);
    expect(compiled.allow?.match('meta.author')).toBe(true);
    expect(compiled.allow?.match('meta')).toBe(false);
    expect(compiled.allow?.match('body')).toBe(false);
  });
});
