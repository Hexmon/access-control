/**
 * JSON reference used in policy conditions.
 * Example: { ref: 'principal.attrs.department' }
 */
export interface Ref {
  ref: string;
}

/**
 * Allowed values for condition operands.
 */
export type RefOrValue =
  | Ref
  | string
  | number
  | boolean
  | null
  | Array<RefOrValue>;

/**
 * Logical condition for policy evaluation.
 */
export type Condition =
  | AndCondition
  | OrCondition
  | NotCondition
  | CompareCondition
  | InCondition
  | ContainsCondition
  | MatchesCondition;

/** Logical AND condition. */
export interface AndCondition {
  op: 'and';
  args: Condition[];
}

/** Logical OR condition. */
export interface OrCondition {
  op: 'or';
  args: Condition[];
}

/** Logical NOT condition. */
export interface NotCondition {
  op: 'not';
  arg: Condition;
}

/** Comparison condition. */
export interface CompareCondition {
  op: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte';
  left: RefOrValue;
  right: RefOrValue;
}

/** Set membership condition. */
export interface InCondition {
  op: 'in';
  item: RefOrValue;
  set: Ref | Array<RefOrValue>;
}

/** String containment condition. */
export interface ContainsCondition {
  op: 'contains';
  text: RefOrValue;
  value: RefOrValue;
}

/** Regex match condition. */
export interface MatchesCondition {
  op: 'matches';
  text: RefOrValue;
  regex: string;
}

/** Allowed rule effects. */
export type PolicyEffect = 'allow' | 'deny';

/** Tenant scoping for rules. */
export type TenantScope = 'global' | 'tenant';

/** Field-level allow/deny configuration. */
export interface FieldSelection {
  allow?: string[];
  deny?: string[];
}

/** Obligation emitted by policy evaluation. */
export interface PolicyObligation {
  type: string;
  payload?: Record<string, unknown>;
}

/** Policy rule definition. */
export interface PolicyRule {
  id: string;
  effect: PolicyEffect;
  actions: string[];
  resourceTypes: string[];
  fields?: FieldSelection;
  when?: Condition;
  obligations?: PolicyObligation[];
  priority?: number;
  tenantScope?: TenantScope;
}

/** Role permission definition. */
export interface RolePermission {
  actions: string[];
  resourceTypes: string[];
  fields?: FieldSelection;
  when?: Condition;
}

/** Role definition for RBAC. */
export interface RoleDefinition {
  name: string;
  inherits?: string[];
  permissions: RolePermission[];
}

/** Optional policy constraints. */
export interface PolicyConstraints {
  mutuallyExclusiveRoles?: string[][];
  maxRoleHolders?: Record<string, number>;
  prerequisiteRoles?: Record<string, string[]>;
}

/** Top-level policy set. */
export interface PolicySet {
  policyVersion: string;
  rules: PolicyRule[];
  roles?: RoleDefinition[];
  constraints?: PolicyConstraints;
}
