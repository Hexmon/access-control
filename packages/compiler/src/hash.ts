import { createHash } from 'node:crypto';

/** Stable JSON stringify with sorted object keys. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

/** Compute a sha256 hex digest for input text. */
export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** Hash an object using stable JSON stringification. */
export function hashObject(value: unknown): string {
  return sha256(stableStringify(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(record).sort();

    for (const key of keys) {
      sorted[key] = sortValue(record[key]);
    }

    return sorted;
  }

  return value;
}
