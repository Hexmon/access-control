import { describe, expect, it } from 'vitest';

import type { PolicyConstraints } from '@hexmon_tech/acccess-control-policy-dsl';

import { type RoleDirectory, validateRoleAssignment } from '../src/constraints';

interface DirectoryState {
  rolesByUser: Record<string, string[]>;
  roleHoldersCount: Record<string, number>;
}

function createRoleDirectory(state: DirectoryState): RoleDirectory {
  return {
    async listRoles(userId: string): Promise<string[]> {
      return state.rolesByUser[userId] ?? [];
    },
    async countRoleHolders(role: string): Promise<number> {
      return state.roleHoldersCount[role] ?? 0;
    },
    async hasRole(userId: string, role: string): Promise<boolean> {
      const roles = state.rolesByUser[userId] ?? [];
      return roles.includes(role);
    },
  };
}

describe('validateRoleAssignment', () => {
  it('detects mutually exclusive role conflicts', async () => {
    const constraints: PolicyConstraints = {
      mutuallyExclusiveRoles: [['PaymentCreator', 'PaymentApprover']],
    };

    const result = await validateRoleAssignment({
      tenantId: 'tenant-1',
      userId: 'u-1',
      role: 'PaymentCreator',
      policyConstraints: constraints,
      roleDirectory: createRoleDirectory({
        rolesByUser: { 'u-1': ['PaymentApprover'] },
        roleHoldersCount: {},
      }),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((error) => error.code)).toContain('MUTUALLY_EXCLUSIVE_ROLE');
    }
  });

  it('enforces prerequisite role requirements', async () => {
    const constraints: PolicyConstraints = {
      prerequisiteRoles: {
        Manager: ['Employee'],
      },
    };

    const result = await validateRoleAssignment({
      tenantId: 'tenant-1',
      userId: 'u-2',
      role: 'Manager',
      policyConstraints: constraints,
      roleDirectory: createRoleDirectory({
        rolesByUser: { 'u-2': ['Contractor'] },
        roleHoldersCount: {},
      }),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((error) => error.code)).toContain('MISSING_PREREQUISITE_ROLE');
    }
  });

  it('enforces max role holder limits', async () => {
    const constraints: PolicyConstraints = {
      maxRoleHolders: {
        SuperAdmin: 2,
      },
    };

    const result = await validateRoleAssignment({
      tenantId: 'tenant-1',
      userId: 'u-3',
      role: 'SuperAdmin',
      policyConstraints: constraints,
      roleDirectory: createRoleDirectory({
        rolesByUser: { 'u-3': ['Employee'] },
        roleHoldersCount: { SuperAdmin: 2 },
      }),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((error) => error.code)).toContain('MAX_ROLE_HOLDERS_EXCEEDED');
    }
  });
});
