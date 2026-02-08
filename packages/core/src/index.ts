import { randomUUID } from 'node:crypto';

import { MissingTenantError } from './errors';
import type { TenantAssertionInput, TenantAssertionMode } from './types';

export * from './capabilities';
export * from './errors';
export * from './types';

/** Create a stable trace id for audit and explain flows. */
export function createTraceId(): string {
  return randomUUID();
}

/** Normalize field names with deterministic sorting and uniqueness. */
export function normalizeFields(fields?: string[]): string[] {
  if (!fields || fields.length === 0) {
    return [];
  }

  const unique = new Set(fields);
  return Array.from(unique).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** Ensure tenant context is present when required. */
export function assertTenant(
  input: TenantAssertionInput,
  mode: TenantAssertionMode = 'required',
): string | undefined {
  const tenantId = input.context?.tenantId ?? input.principal?.tenantId;

  if (!tenantId && mode === 'required') {
    throw new MissingTenantError();
  }

  return tenantId;
}
