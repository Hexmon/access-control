import { describe, expect, it } from 'vitest';

import type { PolicySet } from '@acx/policy-dsl';

import { compilePolicySet, matchesAction, matchesResourceType } from '../src/compile';
import { compileFieldSelectors } from '../src/fields/compileSelectors';

describe('field selectors edge cases', () => {
  it('normalizes selectors deterministically and reports invalid syntax', () => {
    const { compiled, diagnostics } = compileFieldSelectors({
      allow: ['title', 'title', 'meta.*', 'meta*', 'a.*.b'],
      deny: ['*'],
    });

    expect(compiled.allowList).toEqual(['meta.*', 'title']);
    expect(compiled.denyList).toEqual(['*']);
    expect(diagnostics.map((item) => item.selector).sort()).toEqual(['a.*.b', 'meta*']);
  });

  it('matches star and prefix selectors correctly', () => {
    const { compiled } = compileFieldSelectors({
      allow: ['meta.*', '*'],
      deny: ['salary'],
    });

    expect(compiled.allow?.match('meta.ownerId')).toBe(true);
    expect(compiled.allow?.match('title')).toBe(true);
    expect(compiled.deny?.match('salary')).toBe(true);
    expect(compiled.deny?.match('salary.amount')).toBe(false);
  });
});

describe('wildcard matcher edge cases', () => {
  it('supports action and resource wildcards in compiled rules', () => {
    const policy: PolicySet = {
      policyVersion: '1.0.0',
      rules: [
        {
          id: 'rule-any',
          effect: 'allow',
          actions: ['*'],
          resourceTypes: ['*'],
        },
      ],
    };

    const { ir } = compilePolicySet(policy);
    const matchers = ir.compiledRules[0];

    expect(matchesAction('post:read', matchers.actionMatchers)).toBe(true);
    expect(matchesAction('invoice:approve', matchers.actionMatchers)).toBe(true);
    expect(matchesResourceType('post', matchers.resourceTypeMatchers)).toBe(true);
    expect(matchesResourceType('anything', matchers.resourceTypeMatchers)).toBe(true);
  });
});
