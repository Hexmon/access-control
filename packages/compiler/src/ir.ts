import type { PolicyObligation, PolicyEffect, RoleDefinition, TenantScope } from '@acx/policy-dsl';

/** Matchers for action strings with optional wildcard prefixes. */
export interface ActionMatcher {
  type: 'exact' | 'prefix';
  value: string;
}

/** Matchers for resource types with optional global wildcard. */
export interface ResourceTypeMatcher {
  type: 'exact' | 'any';
  value?: string;
}

/** Field selector matcher output. */
export interface FieldSelectorMatcher {
  selectors: string[];
  match: (fieldName: string) => boolean;
}

/** Compiled field selectors for allow/deny rules. */
export interface CompiledFieldSelectors {
  allow: FieldSelectorMatcher | null;
  deny: FieldSelectorMatcher | null;
  allowList: string[];
  denyList: string[];
}

/** Input shape for compiled condition predicates. */
export interface ConditionInput {
  principal: Record<string, unknown>;
  resource: Record<string, unknown>;
  context?: Record<string, unknown>;
}

/** Predicate function compiled from a condition AST. */
export type ConditionPredicate = (input: ConditionInput) => boolean;

/** Compiled rule ready for evaluation by engines. */
export interface CompiledRule {
  id: string;
  effect: PolicyEffect;
  priority: number;
  tenantScope: TenantScope;
  actionMatchers: ActionMatcher[];
  resourceTypeMatchers: ResourceTypeMatcher[];
  fieldMatchers: CompiledFieldSelectors;
  predicate: ConditionPredicate;
  obligations: PolicyObligation[];
}

/** Compiled policy IR. */
export interface PolicyIR {
  policyVersion: string;
  policyHash: string;
  compiledRules: CompiledRule[];
  roles?: RoleDefinition[];
}
