import type { Condition, Ref, RefOrValue } from '@hexmon_tech/acccess-control-policy-dsl';

import type { ConditionInput } from '../ir';

/** Evaluate a condition AST against input values. */
export function evaluateCondition(condition: Condition, input: ConditionInput): boolean {
  switch (condition.op) {
    case 'and':
      return condition.args.every((arg) => evaluateCondition(arg, input));
    case 'or':
      return condition.args.some((arg) => evaluateCondition(arg, input));
    case 'not':
      return !evaluateCondition(condition.arg, input);
    case 'eq':
      return isEqual(resolveValue(condition.left, input), resolveValue(condition.right, input));
    case 'ne':
      return !isEqual(resolveValue(condition.left, input), resolveValue(condition.right, input));
    case 'gt':
      return compareValues(
        resolveValue(condition.left, input),
        resolveValue(condition.right, input),
        'gt',
      );
    case 'gte':
      return compareValues(
        resolveValue(condition.left, input),
        resolveValue(condition.right, input),
        'gte',
      );
    case 'lt':
      return compareValues(
        resolveValue(condition.left, input),
        resolveValue(condition.right, input),
        'lt',
      );
    case 'lte':
      return compareValues(
        resolveValue(condition.left, input),
        resolveValue(condition.right, input),
        'lte',
      );
    case 'in':
      return inSet(resolveValue(condition.item, input), resolveValue(condition.set, input));
    case 'contains':
      return containsValue(
        resolveValue(condition.text, input),
        resolveValue(condition.value, input),
      );
    case 'matches':
      return matchesRegex(resolveValue(condition.text, input), condition.regex);
    default: {
      const _exhaustive: never = condition;
      void _exhaustive;
      return false;
    }
  }
}

/** Resolve a Ref or primitive value against the input. */
export function resolveValue(value: RefOrValue, input: ConditionInput): unknown {
  if (isRef(value)) {
    return resolveRef(value, input);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => resolveValue(entry, input));
  }

  return value;
}

/** Resolve a ref path against the input. */
export function resolveRef(ref: Ref, input: ConditionInput): unknown {
  const path = ref.ref.split('.').filter((segment) => segment.length > 0);

  if (path.length === 0) {
    return undefined;
  }

  const [root, ...rest] = path;
  let current: unknown;

  if (root === 'principal') {
    current = input.principal;
  } else if (root === 'resource') {
    current = input.resource;
  } else if (root === 'context') {
    current = input.context ?? undefined;
  } else {
    return undefined;
  }

  for (const segment of rest) {
    if (current === null || typeof current !== 'object') {
      return undefined;
    }

    const record = current as Record<string, unknown>;
    current = record[segment];
  }

  return current;
}

function isRef(value: RefOrValue): value is Ref {
  if (!value || typeof value !== 'object') {
    return false;
  }

  if (!('ref' in value)) {
    return false;
  }

  return typeof (value as { ref?: unknown }).ref === 'string';
}

function isEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (typeof left !== 'object' || typeof right !== 'object' || left === null || right === null) {
    return false;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) {
      return false;
    }
    return left.every((item, index) => isEqual(item, right[index]));
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    return false;
  }

  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every(
    (key, index) => key === rightKeys[index] && isEqual(leftRecord[key], rightRecord[key]),
  );
}

function compareValues(left: unknown, right: unknown, op: 'gt' | 'gte' | 'lt' | 'lte'): boolean {
  if (typeof left === 'number' && typeof right === 'number') {
    switch (op) {
      case 'gt':
        return left > right;
      case 'gte':
        return left >= right;
      case 'lt':
        return left < right;
      case 'lte':
        return left <= right;
    }
  }

  if (typeof left === 'string' && typeof right === 'string') {
    switch (op) {
      case 'gt':
        return left > right;
      case 'gte':
        return left >= right;
      case 'lt':
        return left < right;
      case 'lte':
        return left <= right;
    }
  }

  return false;
}

function inSet(item: unknown, setValue: unknown): boolean {
  if (!Array.isArray(setValue)) {
    return false;
  }

  return setValue.some((entry) => isEqual(entry, item));
}

function containsValue(text: unknown, value: unknown): boolean {
  if (typeof text === 'string' && typeof value === 'string') {
    return text.includes(value);
  }

  if (Array.isArray(text)) {
    return text.some((entry) => isEqual(entry, value));
  }

  return false;
}

const MAX_REGEX_LENGTH = 1024;
const regexCache = new Map<string, RegExp | null>();

function matchesRegex(text: unknown, regex: string): boolean {
  if (typeof text !== 'string') {
    return false;
  }

  if (regex.length > MAX_REGEX_LENGTH) {
    return false;
  }

  let cached = regexCache.get(regex);
  if (cached === undefined) {
    try {
      cached = new RegExp(regex);
    } catch {
      cached = null;
    }
    regexCache.set(regex, cached);
  }

  if (cached === null) {
    return false;
  }

  return cached.test(text);
}
