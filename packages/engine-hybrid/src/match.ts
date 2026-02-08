/** Action-enablement map keyed by resource type. */
export type RebacEnabledActionsByResourceType = Record<string, string[]>;

/** Match an action pattern against an action name. Supports exact and suffix wildcard. */
export function matchesActionPattern(actionName: string, pattern: string): boolean {
  if (!pattern.includes('*')) {
    return actionName === pattern;
  }

  if (pattern === '*') {
    return true;
  }

  if (!pattern.endsWith('*')) {
    return actionName === pattern;
  }

  const prefix = pattern.slice(0, -1);
  return actionName.startsWith(prefix);
}

/** Return all action patterns for a resource type, including '*' resource fallback. */
export function getActionPatternsForResourceType(
  config: RebacEnabledActionsByResourceType,
  resourceType: string,
): string[] {
  const patterns = [...(config[resourceType] ?? []), ...(config['*'] ?? [])];
  return Array.from(new Set(patterns));
}

/** Determine whether ReBAC is enabled for the resource type + action. */
export function isRebacEnabledFor(
  config: RebacEnabledActionsByResourceType,
  resourceType: string,
  actionName: string,
): boolean {
  const patterns = getActionPatternsForResourceType(config, resourceType);
  return patterns.some((pattern) => matchesActionPattern(actionName, pattern));
}
