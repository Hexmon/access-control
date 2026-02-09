import { stableStringify } from '@hexmon_tech/compiler';
import type {
  FieldSelection,
  PolicyConstraints,
  PolicyRule,
  PolicySet,
  RoleDefinition,
  RolePermission,
} from '@hexmon_tech/policy-dsl';

import type { CommandContext } from './shared';
import { loadPolicy, printDiagnostics, validateAndCompile } from './shared';

export interface DiffCommandOptions {
  oldPolicyPath: string;
  newPolicyPath: string;
  mode?: 'single-tenant' | 'multi-tenant';
  context: CommandContext;
}

/** Compare two policies and print a human-friendly change summary. */
export async function runDiffCommand(options: DiffCommandOptions): Promise<number> {
  const mode = options.mode ?? 'single-tenant';

  const oldLoaded = await loadPolicy(options.oldPolicyPath, options.context);
  const newLoaded = await loadPolicy(options.newPolicyPath, options.context);

  const oldValidation = validateAndCompile(oldLoaded.rawPolicy, mode);
  const newValidation = validateAndCompile(newLoaded.rawPolicy, mode);

  if (oldValidation.diagnostics.length > 0) {
    options.context.io.err('Diagnostics for old policy:');
    printDiagnostics(oldValidation.diagnostics, options.context);
  }
  if (newValidation.diagnostics.length > 0) {
    options.context.io.err('Diagnostics for new policy:');
    printDiagnostics(newValidation.diagnostics, options.context);
  }

  if (!oldValidation.ok || !oldValidation.policySet) {
    options.context.io.err(`Old policy is invalid: ${oldLoaded.policyPath}`);
    return 1;
  }
  if (!newValidation.ok || !newValidation.policySet) {
    options.context.io.err(`New policy is invalid: ${newLoaded.policyPath}`);
    return 1;
  }

  const summary = buildPolicyDiff(oldValidation.policySet, newValidation.policySet);

  for (const line of summary) {
    options.context.io.out(line);
  }

  return 0;
}

export function buildPolicyDiff(oldPolicy: PolicySet, newPolicy: PolicySet): string[] {
  const lines: string[] = [];

  if (oldPolicy.policyVersion !== newPolicy.policyVersion) {
    lines.push(`Policy version: ${oldPolicy.policyVersion} -> ${newPolicy.policyVersion}`);
    lines.push('');
  }

  lines.push(...diffRules(oldPolicy.rules, newPolicy.rules));
  lines.push('');
  lines.push(...diffRoles(oldPolicy.roles ?? [], newPolicy.roles ?? []));
  lines.push('');
  lines.push(...diffConstraints(oldPolicy.constraints, newPolicy.constraints));

  if (lines.every((line) => line.trim() === '' || line.includes('no changes'))) {
    return ['No policy changes detected.'];
  }

  return lines;
}

function diffRules(oldRules: PolicyRule[], newRules: PolicyRule[]): string[] {
  const lines: string[] = ['Rules:'];
  const oldById = mapById(oldRules);
  const newById = mapById(newRules);

  const added = keysInNewOnly(oldById, newById);
  const removed = keysInNewOnly(newById, oldById);
  const shared = sharedKeys(oldById, newById);

  if (added.length === 0 && removed.length === 0 && shared.length === 0) {
    lines.push('- no changes');
    return lines;
  }

  for (const id of added) {
    lines.push(`+ added rule ${id}`);
  }
  for (const id of removed) {
    lines.push(`- removed rule ${id}`);
  }

  for (const id of shared) {
    const before = normalizeRule(oldById.get(id) as PolicyRule);
    const after = normalizeRule(newById.get(id) as PolicyRule);

    const changed = changedKeys(before, after);
    if (changed.length > 0) {
      lines.push(`~ changed rule ${id}: ${changed.join(', ')}`);
    }
  }

  if (lines.length === 1) {
    lines.push('- no changes');
  }

  return lines;
}

function diffRoles(oldRoles: RoleDefinition[], newRoles: RoleDefinition[]): string[] {
  const lines: string[] = ['Roles:'];
  const oldById = mapByName(oldRoles);
  const newById = mapByName(newRoles);

  const added = keysInNewOnly(oldById, newById);
  const removed = keysInNewOnly(newById, oldById);
  const shared = sharedKeys(oldById, newById);

  for (const name of added) {
    lines.push(`+ added role ${name}`);
  }

  for (const name of removed) {
    lines.push(`- removed role ${name}`);
  }

  for (const name of shared) {
    const before = normalizeRole(oldById.get(name) as RoleDefinition);
    const after = normalizeRole(newById.get(name) as RoleDefinition);
    const changed = changedKeys(before, after);
    if (changed.length > 0) {
      lines.push(`~ changed role ${name}: ${changed.join(', ')}`);
    }
  }

  if (lines.length === 1) {
    lines.push('- no changes');
  }

  return lines;
}

function diffConstraints(
  oldConstraints: PolicyConstraints | undefined,
  newConstraints: PolicyConstraints | undefined,
): string[] {
  const lines: string[] = ['Constraints:'];

  const before = normalizeConstraints(oldConstraints);
  const after = normalizeConstraints(newConstraints);

  if (stableStringify(before) === stableStringify(after)) {
    lines.push('- no changes');
    return lines;
  }

  lines.push('~ changed constraints');

  const changes = changedKeys(before, after);
  for (const key of changes) {
    lines.push(`  - ${key}`);
  }

  return lines;
}

function normalizeRule(rule: PolicyRule): Record<string, unknown> {
  return {
    effect: rule.effect,
    actions: [...rule.actions].sort(),
    resourceTypes: [...rule.resourceTypes].sort(),
    fields: normalizeFields(rule.fields),
    priority: rule.priority ?? 0,
    tenantScope: rule.tenantScope ?? 'tenant',
  };
}

function normalizeRole(role: RoleDefinition): Record<string, unknown> {
  return {
    inherits: [...(role.inherits ?? [])].sort(),
    permissions: role.permissions.map(normalizePermission).sort(compareStringified),
  };
}

function normalizePermission(permission: RolePermission): Record<string, unknown> {
  return {
    actions: [...permission.actions].sort(),
    resourceTypes: [...permission.resourceTypes].sort(),
    fields: normalizeFields(permission.fields),
  };
}

function normalizeConstraints(constraints: PolicyConstraints | undefined): Record<string, unknown> {
  return {
    mutuallyExclusiveRoles: (constraints?.mutuallyExclusiveRoles ?? [])
      .map((item) => [...item].sort())
      .sort(compareArray),
    maxRoleHolders: sortObject(constraints?.maxRoleHolders ?? {}),
    prerequisiteRoles: sortRecordOfArrays(constraints?.prerequisiteRoles ?? {}),
  };
}

function normalizeFields(fields: FieldSelection | undefined): Record<string, string[]> {
  return {
    allow: [...(fields?.allow ?? [])].sort(),
    deny: [...(fields?.deny ?? [])].sort(),
  };
}

function sortObject<T extends Record<string, unknown>>(record: T): T {
  const entries = Object.entries(record).sort(([a], [b]) => a.localeCompare(b));
  return Object.fromEntries(entries) as T;
}

function sortRecordOfArrays(record: Record<string, string[]>): Record<string, string[]> {
  const sortedEntries = Object.entries(record)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => [key, [...value].sort()] as const);

  return Object.fromEntries(sortedEntries);
}

function mapById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function mapByName<T extends { name: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.name, item]));
}

function sharedKeys<T>(left: Map<string, T>, right: Map<string, T>): string[] {
  return [...left.keys()].filter((key) => right.has(key)).sort();
}

function keysInNewOnly<T>(left: Map<string, T>, right: Map<string, T>): string[] {
  return [...right.keys()].filter((key) => !left.has(key)).sort();
}

function changedKeys(before: Record<string, unknown>, after: Record<string, unknown>): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed: string[] = [];

  for (const key of Array.from(keys).sort()) {
    if (stableStringify(before[key]) !== stableStringify(after[key])) {
      changed.push(key);
    }
  }

  return changed;
}

function compareStringified(left: Record<string, unknown>, right: Record<string, unknown>): number {
  return stableStringify(left).localeCompare(stableStringify(right));
}

function compareArray(left: string[], right: string[]): number {
  return stableStringify(left).localeCompare(stableStringify(right));
}
