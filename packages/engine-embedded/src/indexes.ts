import type { TenantScope } from '@hexmon_tech/policy-dsl';
import type { CompiledRule } from '@hexmon_tech/compiler';

interface ActionIndex {
  exact: Map<string, CompiledRule[]>;
  prefix: Map<string, CompiledRule[]>;
}

interface ResourceIndex {
  exact: Map<string, ActionIndex>;
  any: ActionIndex;
}

export interface RuleIndex {
  tenant: ResourceIndex;
  global: ResourceIndex;
}

/** Build indexes for compiled rules keyed by tenant scope, resource type, and action. */
export function buildRuleIndex(rules: CompiledRule[]): RuleIndex {
  const index: RuleIndex = {
    tenant: createResourceIndex(),
    global: createResourceIndex(),
  };

  for (const rule of rules) {
    const resourceIndex = rule.tenantScope === 'global' ? index.global : index.tenant;

    for (const resourceMatcher of rule.resourceTypeMatchers) {
      const actionIndex =
        resourceMatcher.type === 'any'
          ? resourceIndex.any
          : getOrCreateActionIndex(resourceIndex.exact, resourceMatcher.value ?? '');

      for (const actionMatcher of rule.actionMatchers) {
        if (actionMatcher.type === 'exact') {
          addToIndex(actionIndex.exact, actionMatcher.value, rule);
        } else {
          addToIndex(actionIndex.prefix, actionMatcher.value, rule);
        }
      }
    }
  }

  return index;
}

/** Collect candidate rules from indexes for the given action/resource. */
export function getCandidates(
  index: RuleIndex,
  action: string,
  resourceType: string,
  scopes: TenantScope[] = ['tenant', 'global'],
): CompiledRule[] {
  const candidates = new Map<string, CompiledRule>();

  for (const scope of scopes) {
    const resourceIndex = scope === 'global' ? index.global : index.tenant;

    collectFromResourceIndex(resourceIndex, action, resourceType, candidates);
  }

  return sortCandidates(Array.from(candidates.values()));
}

function createActionIndex(): ActionIndex {
  return {
    exact: new Map(),
    prefix: new Map(),
  };
}

function createResourceIndex(): ResourceIndex {
  return {
    exact: new Map(),
    any: createActionIndex(),
  };
}

function getOrCreateActionIndex(map: Map<string, ActionIndex>, key: string): ActionIndex {
  const existing = map.get(key);
  if (existing) {
    return existing;
  }

  const created = createActionIndex();
  map.set(key, created);
  return created;
}

function addToIndex(map: Map<string, CompiledRule[]>, key: string, rule: CompiledRule): void {
  const bucket = map.get(key);
  if (bucket) {
    bucket.push(rule);
  } else {
    map.set(key, [rule]);
  }
}

function collectFromResourceIndex(
  resourceIndex: ResourceIndex,
  action: string,
  resourceType: string,
  candidates: Map<string, CompiledRule>,
): void {
  const exactIndex = resourceIndex.exact.get(resourceType);
  if (exactIndex) {
    collectFromActionIndex(exactIndex, action, candidates);
  }

  collectFromActionIndex(resourceIndex.any, action, candidates);
}

function collectFromActionIndex(
  actionIndex: ActionIndex,
  action: string,
  candidates: Map<string, CompiledRule>,
): void {
  const exactRules = actionIndex.exact.get(action);
  if (exactRules) {
    for (const rule of exactRules) {
      candidates.set(rule.id, rule);
    }
  }

  for (const [prefix, rules] of actionIndex.prefix.entries()) {
    if (!action.startsWith(prefix)) {
      continue;
    }

    for (const rule of rules) {
      candidates.set(rule.id, rule);
    }
  }
}

function sortCandidates(rules: CompiledRule[]): CompiledRule[] {
  return rules.sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }

    if (a.id < b.id) {
      return -1;
    }

    if (a.id > b.id) {
      return 1;
    }

    return 0;
  });
}
