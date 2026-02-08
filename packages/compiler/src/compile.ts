import type { PolicySet, PolicyEffect, TenantScope } from '@hexmon_tech/policy-dsl';

import { evaluateCondition } from './conditions/eval';
import type {
  ActionMatcher,
  CompiledRule,
  ConditionInput,
  PolicyIR,
  ResourceTypeMatcher,
} from './ir';
import { compileFieldSelectors } from './fields/compileSelectors';
import { hashObject } from './hash';

export interface CompileOptions {
  mode?: 'single-tenant' | 'multi-tenant';
}

export type DiagnosticLevel = 'warning' | 'error';

export interface Diagnostic {
  level: DiagnosticLevel;
  code: string;
  message: string;
  ruleId?: string;
}

interface RuleMeta {
  id: string;
  effect: PolicyEffect;
  priority: number;
  tenantScope: TenantScope;
  hasCondition: boolean;
  actionMatchers: ActionMatcher[];
  resourceTypeMatchers: ResourceTypeMatcher[];
}

/** Compile a PolicySet into an engine-ready policy IR. */
export function compilePolicySet(
  policySet: PolicySet,
  options: CompileOptions = {},
): { ir: PolicyIR; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  const compiledRules: CompiledRule[] = [];
  const ruleMeta: RuleMeta[] = [];

  for (const rule of policySet.rules) {
    const { compiled: fieldMatchers, diagnostics: fieldDiagnostics } = compileFieldSelectors(
      rule.fields,
    );

    for (const fieldDiagnostic of fieldDiagnostics) {
      diagnostics.push({
        level: 'error',
        code: fieldDiagnostic.code,
        message: fieldDiagnostic.message,
        ruleId: rule.id,
      });
    }

    if (options.mode === 'multi-tenant' && !rule.tenantScope) {
      diagnostics.push({
        level: 'warning',
        code: 'MISSING_TENANT_SCOPE',
        message: 'Rule is missing tenantScope in multi-tenant mode.',
        ruleId: rule.id,
      });
    }

    const priority = rule.priority ?? 0;
    const tenantScope = rule.tenantScope ?? 'tenant';
    const actionMatchers = compileActionMatchers(rule.actions);
    const resourceTypeMatchers = compileResourceTypeMatchers(rule.resourceTypes);
    const obligations = rule.obligations ?? [];

    const condition = rule.when;
    const predicate = condition
      ? (input: ConditionInput) => evaluateCondition(condition, input)
      : () => true;

    compiledRules.push({
      id: rule.id,
      effect: rule.effect,
      priority,
      tenantScope,
      actionMatchers,
      resourceTypeMatchers,
      fieldMatchers,
      predicate,
      obligations,
    });

    ruleMeta.push({
      id: rule.id,
      effect: rule.effect,
      priority,
      tenantScope,
      hasCondition: Boolean(rule.when),
      actionMatchers,
      resourceTypeMatchers,
    });
  }

  diagnostics.push(...detectConflicts(ruleMeta));
  diagnostics.push(...detectUnreachable(ruleMeta));

  const ir: PolicyIR = {
    policyVersion: policySet.policyVersion,
    policyHash: hashObject(policySet),
    compiledRules,
  };

  if (policySet.roles) {
    ir.roles = policySet.roles;
  }

  return { ir, diagnostics };
}

/** Match a concrete action against matchers. */
export function matchesAction(action: string, matchers: ActionMatcher[]): boolean {
  return matchers.some((matcher) => {
    if (matcher.type === 'exact') {
      return matcher.value === action;
    }

    return action.startsWith(matcher.value);
  });
}

/** Match a concrete resource type against matchers. */
export function matchesResourceType(
  resourceType: string,
  matchers: ResourceTypeMatcher[],
): boolean {
  return matchers.some((matcher) => {
    if (matcher.type === 'any') {
      return true;
    }

    return matcher.value === resourceType;
  });
}

function compileActionMatchers(actions: string[]): ActionMatcher[] {
  const normalized = Array.from(new Set(actions)).sort();

  return normalized.map((action) => {
    if (action.endsWith('*')) {
      return { type: 'prefix', value: action.slice(0, -1) };
    }

    return { type: 'exact', value: action };
  });
}

function compileResourceTypeMatchers(resourceTypes: string[]): ResourceTypeMatcher[] {
  const normalized = Array.from(new Set(resourceTypes)).sort();

  return normalized.map((resourceType) => {
    if (resourceType === '*') {
      return { type: 'any' };
    }

    return { type: 'exact', value: resourceType };
  });
}

function detectConflicts(rules: RuleMeta[]): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (let i = 0; i < rules.length; i += 1) {
    const ruleA = rules[i];
    if (!ruleA) {
      continue;
    }
    for (let j = i + 1; j < rules.length; j += 1) {
      const ruleB = rules[j];
      if (!ruleB) {
        continue;
      }

      if (ruleA.effect === ruleB.effect) {
        continue;
      }

      if (ruleA.tenantScope !== ruleB.tenantScope) {
        continue;
      }

      if (ruleA.hasCondition || ruleB.hasCondition) {
        continue;
      }

      if (!hasOverlap(ruleA.actionMatchers, ruleB.actionMatchers, overlapActions)) {
        continue;
      }

      if (
        !hasOverlap(ruleA.resourceTypeMatchers, ruleB.resourceTypeMatchers, overlapResourceTypes)
      ) {
        continue;
      }

      diagnostics.push({
        level: 'error',
        code: 'CONFLICTING_RULES',
        message: `Rules ${ruleA.id} and ${ruleB.id} conflict without conditions.`,
        ruleId: ruleB.id,
      });
    }
  }

  return diagnostics;
}

function detectUnreachable(rules: RuleMeta[]): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const sorted = [...rules].sort((a, b) => {
    if (a.priority === b.priority) {
      return 0;
    }

    return b.priority - a.priority;
  });

  for (let i = 0; i < sorted.length; i += 1) {
    const higher = sorted[i];
    if (!higher) {
      continue;
    }
    for (let j = i + 1; j < sorted.length; j += 1) {
      const lower = sorted[j];
      if (!lower) {
        continue;
      }

      if (higher.effect !== lower.effect) {
        continue;
      }

      if (higher.tenantScope !== lower.tenantScope) {
        continue;
      }

      if (higher.hasCondition || lower.hasCondition) {
        continue;
      }

      if (!hasOverlap(higher.actionMatchers, lower.actionMatchers, overlapActions)) {
        continue;
      }

      if (
        !hasOverlap(higher.resourceTypeMatchers, lower.resourceTypeMatchers, overlapResourceTypes)
      ) {
        continue;
      }

      diagnostics.push({
        level: 'warning',
        code: 'UNREACHABLE_RULE',
        message: `Rule ${lower.id} is unreachable due to ${higher.id}.`,
        ruleId: lower.id,
      });
    }
  }

  return diagnostics;
}

function hasOverlap<T>(left: T[], right: T[], overlaps: (a: T, b: T) => boolean): boolean {
  for (const item of left) {
    for (const other of right) {
      if (overlaps(item, other)) {
        return true;
      }
    }
  }

  return false;
}

function overlapActions(a: ActionMatcher, b: ActionMatcher): boolean {
  if (a.type === 'exact' && b.type === 'exact') {
    return a.value === b.value;
  }

  if (a.type === 'exact' && b.type === 'prefix') {
    return a.value.startsWith(b.value);
  }

  if (a.type === 'prefix' && b.type === 'exact') {
    return b.value.startsWith(a.value);
  }

  return a.value.startsWith(b.value) || b.value.startsWith(a.value);
}

function overlapResourceTypes(a: ResourceTypeMatcher, b: ResourceTypeMatcher): boolean {
  if (a.type === 'any' || b.type === 'any') {
    return true;
  }

  return a.value === b.value;
}
