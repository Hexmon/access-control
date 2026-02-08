import type { RebacAdapter } from './adapter';
import type {
  RebacCallOptions,
  RebacCheckInput,
  RebacCheckResult,
  RelationshipTuple,
} from './types';

/**
 * In-memory ReBAC adapter for tests/dev.
 * Supports direct tuple checks only (no graph traversal).
 */
export class InMemoryRebacAdapter implements RebacAdapter {
  private readonly tuples = new Map<string, RelationshipTuple>();

  public async writeTuples(
    tuples: RelationshipTuple[],
    options?: RebacCallOptions,
  ): Promise<void> {
    const fallbackTenantId = options?.tenantId;

    for (const tuple of tuples) {
      const normalized = normalizeTuple(tuple, fallbackTenantId);
      this.tuples.set(tupleKey(normalized), normalized);
    }
  }

  public async check(
    input: RebacCheckInput,
    options?: RebacCallOptions,
  ): Promise<RebacCheckResult> {
    const resolvedTenantId = input.tenantId ?? options?.tenantId;

    const baseCheckTuple: Omit<RelationshipTuple, 'tenantId'> = {
      object: input.object,
      relation: input.relation,
      subject: input.subject,
    };
    const checkTuple: RelationshipTuple = resolvedTenantId
      ? { ...baseCheckTuple, tenantId: resolvedTenantId }
      : baseCheckTuple;

    if (this.tuples.has(tupleKey(checkTuple))) {
      return { allow: true };
    }

    for (const contextualTuple of input.contextualTuples ?? []) {
      const normalized = normalizeTuple(contextualTuple, resolvedTenantId);
      if (tupleKey(normalized) === tupleKey(checkTuple)) {
        return { allow: true };
      }
    }

    return { allow: false };
  }
}

function normalizeTuple(
  tuple: RelationshipTuple,
  fallbackTenantId: string | undefined,
): RelationshipTuple {
  if (tuple.tenantId) {
    return tuple;
  }

  if (!fallbackTenantId) {
    return tuple;
  }

  return {
    ...tuple,
    tenantId: fallbackTenantId,
  };
}

function tupleKey(tuple: RelationshipTuple): string {
  return [
    tuple.tenantId ?? '',
    tuple.object.type,
    tuple.object.id,
    tuple.relation,
    tuple.subject.type,
    tuple.subject.id,
    tuple.subject.relation ?? '',
  ].join('|');
}
