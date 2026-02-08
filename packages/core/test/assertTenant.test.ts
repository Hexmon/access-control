import { describe, expect, it } from 'vitest';

import { assertTenant, MissingTenantError } from '../src/index';

describe('assertTenant', () => {
  it('throws MissingTenantError when tenant is required', () => {
    expect(() => assertTenant({}, 'required')).toThrowError(MissingTenantError);
  });

  it('returns tenantId when provided', () => {
    expect(assertTenant({ context: { tenantId: 't-1' } })).toBe('t-1');
  });
});
