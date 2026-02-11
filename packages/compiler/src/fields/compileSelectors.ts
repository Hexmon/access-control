import type { FieldSelection } from '@hexmon_tech/acccess-control-policy-dsl';

import type { CompiledFieldSelectors, FieldSelectorMatcher } from '../ir';

/** Diagnostic entry for field selector compilation. */
export interface FieldSelectorDiagnostic {
  code: 'INVALID_FIELD_SELECTOR';
  message: string;
  selector: string;
}

/** Compile field selectors into matchers and normalized lists. */
export function compileFieldSelectors(fields?: FieldSelection): {
  compiled: CompiledFieldSelectors;
  diagnostics: FieldSelectorDiagnostic[];
} {
  const diagnostics: FieldSelectorDiagnostic[] = [];

  const allow = compileSelectorList(fields?.allow ?? [], diagnostics);
  const deny = compileSelectorList(fields?.deny ?? [], diagnostics);

  return {
    compiled: {
      allow: allow.matcher,
      deny: deny.matcher,
      allowList: allow.normalized,
      denyList: deny.normalized,
    },
    diagnostics,
  };
}

interface CompiledList {
  matcher: FieldSelectorMatcher | null;
  normalized: string[];
}

interface SelectorPattern {
  type: 'all' | 'prefix' | 'exact';
  value?: string;
}

function compileSelectorList(
  selectors: string[],
  diagnostics: FieldSelectorDiagnostic[],
): CompiledList {
  if (selectors.length === 0) {
    return { matcher: null, normalized: [] };
  }

  const normalized = Array.from(new Set(selectors)).sort();
  const patterns: SelectorPattern[] = [];
  const validSelectors: string[] = [];

  for (const selector of normalized) {
    const parsed = parseSelector(selector);
    if (!parsed.ok) {
      diagnostics.push({
        code: 'INVALID_FIELD_SELECTOR',
        message: parsed.error,
        selector,
      });
      continue;
    }

    patterns.push(parsed.pattern);
    validSelectors.push(selector);
  }

  if (patterns.length === 0) {
    return { matcher: null, normalized: [] };
  }

  return {
    matcher: {
      selectors: [...validSelectors],
      match: (fieldName: string) => matchesSelector(patterns, fieldName),
    },
    normalized: validSelectors,
  };
}

function parseSelector(
  selector: string,
): { ok: true; pattern: SelectorPattern } | { ok: false; error: string } {
  if (selector === '*') {
    return { ok: true, pattern: { type: 'all' } };
  }

  const starIndex = selector.indexOf('*');

  if (starIndex === -1) {
    return { ok: true, pattern: { type: 'exact', value: selector } };
  }

  if (selector.endsWith('.*') && starIndex === selector.length - 1) {
    const prefix = selector.slice(0, -1);
    if (prefix.length === 0 || prefix === '.') {
      return { ok: false, error: 'Invalid field selector prefix.' };
    }

    return { ok: true, pattern: { type: 'prefix', value: prefix } };
  }

  return { ok: false, error: 'Invalid field selector syntax.' };
}

function matchesSelector(patterns: SelectorPattern[], fieldName: string): boolean {
  for (const pattern of patterns) {
    if (pattern.type === 'all') {
      return true;
    }

    if (pattern.type === 'exact' && pattern.value === fieldName) {
      return true;
    }

    if (pattern.type === 'prefix' && pattern.value && fieldName.startsWith(pattern.value)) {
      return true;
    }
  }

  return false;
}
