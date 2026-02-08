import { describe, expect, it } from 'vitest';

import { normalizeFields } from '../src/index';

describe('normalizeFields', () => {
  it('returns sorted unique fields', () => {
    expect(normalizeFields(['b', 'a', 'b', 'c', 'a'])).toEqual(['a', 'b', 'c']);
  });

  it('returns empty array when no fields provided', () => {
    expect(normalizeFields()).toEqual([]);
  });
});
