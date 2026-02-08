import type { PolicyConstraints } from '@hexmon_tech/policy-dsl';

/** Read-only role directory used to validate role assignment constraints. */
export interface RoleDirectory {
  listRoles(userId: string, tenantId: string): Promise<string[]>;
  countRoleHolders(role: string, tenantId: string): Promise<number>;
  hasRole(userId: string, role: string, tenantId: string): Promise<boolean>;
}

/** Stable error shape for role assignment validation. */
export interface ConstraintError {
  code:
    | 'MUTUALLY_EXCLUSIVE_ROLE'
    | 'MISSING_PREREQUISITE_ROLE'
    | 'MAX_ROLE_HOLDERS_EXCEEDED'
    | 'ROLE_DIRECTORY_ERROR';
  message: string;
  details?: unknown;
}

/** Input for role assignment validation checks. */
export interface ValidateRoleAssignmentInput {
  tenantId: string;
  userId: string;
  role: string;
  policyConstraints?: PolicyConstraints;
  roleDirectory: RoleDirectory;
}

export type ValidateRoleAssignmentResult = { ok: true } | { ok: false; errors: ConstraintError[] };

/** Validate role assignment against configured policy constraints. */
export async function validateRoleAssignment(
  input: ValidateRoleAssignmentInput,
): Promise<ValidateRoleAssignmentResult> {
  const constraints = input.policyConstraints;

  if (!constraints) {
    return { ok: true };
  }

  try {
    const assignedRoles = await input.roleDirectory.listRoles(input.userId, input.tenantId);
    const assignedSet = new Set(assignedRoles);
    const hasTargetRole = assignedSet.has(input.role)
      ? true
      : await input.roleDirectory.hasRole(input.userId, input.role, input.tenantId);

    const errors: ConstraintError[] = [];

    errors.push(...validateMutuallyExclusive(input.role, assignedSet, constraints));
    errors.push(...validatePrerequisites(input.role, assignedSet, constraints));
    errors.push(
      ...(await validateMaxRoleHolders(
        input.role,
        hasTargetRole,
        constraints,
        input.roleDirectory,
        input.tenantId,
      )),
    );

    if (errors.length > 0) {
      return { ok: false, errors };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          code: 'ROLE_DIRECTORY_ERROR',
          message: 'Failed to query role directory for assignment validation.',
          details: error,
        },
      ],
    };
  }
}

function validateMutuallyExclusive(
  targetRole: string,
  assignedRoles: Set<string>,
  constraints: PolicyConstraints,
): ConstraintError[] {
  const groups = constraints.mutuallyExclusiveRoles ?? [];
  const errors: ConstraintError[] = [];

  for (const group of groups) {
    if (!group.includes(targetRole)) {
      continue;
    }

    const conflicts = group.filter((role) => role !== targetRole && assignedRoles.has(role));
    if (conflicts.length === 0) {
      continue;
    }

    errors.push({
      code: 'MUTUALLY_EXCLUSIVE_ROLE',
      message: `Role ${targetRole} conflicts with existing mutually-exclusive role assignments.`,
      details: {
        role: targetRole,
        conflictingRoles: conflicts,
      },
    });
  }

  return errors;
}

function validatePrerequisites(
  targetRole: string,
  assignedRoles: Set<string>,
  constraints: PolicyConstraints,
): ConstraintError[] {
  const prerequisiteRoles = constraints.prerequisiteRoles?.[targetRole];
  if (!prerequisiteRoles || prerequisiteRoles.length === 0) {
    return [];
  }

  const missing = prerequisiteRoles.filter((role) => !assignedRoles.has(role));
  if (missing.length === 0) {
    return [];
  }

  return [
    {
      code: 'MISSING_PREREQUISITE_ROLE',
      message: `Role ${targetRole} requires prerequisite roles before assignment.`,
      details: {
        role: targetRole,
        missingPrerequisites: missing,
      },
    },
  ];
}

async function validateMaxRoleHolders(
  targetRole: string,
  hasTargetRole: boolean,
  constraints: PolicyConstraints,
  roleDirectory: RoleDirectory,
  tenantId: string,
): Promise<ConstraintError[]> {
  const limit = constraints.maxRoleHolders?.[targetRole];
  if (!limit) {
    return [];
  }

  if (hasTargetRole) {
    return [];
  }

  const holders = await roleDirectory.countRoleHolders(targetRole, tenantId);
  if (holders < limit) {
    return [];
  }

  return [
    {
      code: 'MAX_ROLE_HOLDERS_EXCEEDED',
      message: `Role ${targetRole} reached max holder limit (${limit}).`,
      details: {
        role: targetRole,
        maxRoleHolders: limit,
        currentRoleHolders: holders,
      },
    },
  ];
}
