import type { RoleDefinition, RolePermission } from '@hexmon_tech/policy-dsl';
import type { CompiledRule, ConditionInput } from '@hexmon_tech/compiler';

import { evaluateCondition } from '@hexmon_tech/compiler';
import { compileFieldSelectors } from '@hexmon_tech/compiler';

import type { RuleIndex } from './indexes';
import { buildRuleIndex } from './indexes';

export interface RoleGraph {
  inherits: Map<string, string[]>;
}

export interface RoleRules {
  graph: RoleGraph;
  indexes: Map<string, RuleIndex>;
}

/** Build role resolution graph from policy roles. */
export function buildRoleGraph(roles?: RoleDefinition[]): RoleGraph {
  const inherits = new Map<string, string[]>();

  for (const role of roles ?? []) {
    inherits.set(role.name, role.inherits ? [...role.inherits] : []);
  }

  return { inherits };
}

/** Resolve effective roles including inherited permissions. */
export function resolveEffectiveRoles(
  assignedRoles: string[] | undefined,
  graph: RoleGraph,
): string[] {
  if (!assignedRoles || assignedRoles.length === 0) {
    return [];
  }

  const result = new Set<string>();
  const stack = [...assignedRoles];

  while (stack.length > 0) {
    const role = stack.pop();
    if (!role || result.has(role)) {
      continue;
    }

    result.add(role);
    const inherited = graph.inherits.get(role) ?? [];
    for (const inheritedRole of inherited) {
      if (!result.has(inheritedRole)) {
        stack.push(inheritedRole);
      }
    }
  }

  return Array.from(result).sort();
}

/** Compile role permissions into indexes keyed by role name. */
export function buildRoleRuleIndexes(roles?: RoleDefinition[]): Map<string, RuleIndex> {
  const map = new Map<string, RuleIndex>();

  for (const role of roles ?? []) {
    const rules = compileRolePermissions(role);
    map.set(role.name, buildRuleIndex(rules));
  }

  return map;
}

function compileRolePermissions(role: RoleDefinition): CompiledRule[] {
  return role.permissions.map((permission, index) =>
    compilePermissionRule(role.name, permission, index),
  );
}

function compilePermissionRule(
  roleName: string,
  permission: RolePermission,
  index: number,
): CompiledRule {
  const { compiled: fieldMatchers } = compileFieldSelectors(permission.fields);

  const condition = permission.when;
  const predicate = condition
    ? (input: ConditionInput) => evaluateCondition(condition, input)
    : () => true;

  return {
    id: `role:${roleName}:${index}`,
    effect: 'allow',
    priority: 0,
    tenantScope: 'tenant',
    actionMatchers: compileActionMatchers(permission.actions),
    resourceTypeMatchers: compileResourceTypeMatchers(permission.resourceTypes),
    fieldMatchers,
    predicate,
    obligations: [],
  };
}

function compileActionMatchers(actions: string[]): CompiledRule['actionMatchers'] {
  const normalized = Array.from(new Set(actions)).sort();

  return normalized.map((action) => {
    if (action.endsWith('*')) {
      return { type: 'prefix', value: action.slice(0, -1) };
    }

    return { type: 'exact', value: action };
  });
}

function compileResourceTypeMatchers(
  resourceTypes: string[],
): CompiledRule['resourceTypeMatchers'] {
  const normalized = Array.from(new Set(resourceTypes)).sort();

  return normalized.map((resourceType) => {
    if (resourceType === '*') {
      return { type: 'any' };
    }

    return { type: 'exact', value: resourceType };
  });
}
