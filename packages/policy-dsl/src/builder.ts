import type {
  PolicyConstraints,
  PolicyRule,
  PolicySet,
  RoleDefinition,
} from './types';

/** Fluent builder for PolicySet documents. */
export interface PolicySetBuilder {
  rule(rule: PolicyRule): PolicySetBuilder;
  role(role: RoleDefinition): PolicySetBuilder;
  constraints(constraints: PolicyConstraints): PolicySetBuilder;
  build(): PolicySet;
}

class PolicySetBuilderImpl implements PolicySetBuilder {
  private readonly version: string;
  private readonly rules: PolicyRule[] = [];
  private readonly roles: RoleDefinition[] = [];
  private constraintsValue: PolicyConstraints | undefined;

  constructor(version: string) {
    if (!version || version.trim().length === 0) {
      throw new Error('policyVersion is required.');
    }
    this.version = version;
  }

  rule(rule: PolicyRule): PolicySetBuilder {
    this.rules.push(rule);
    return this;
  }

  role(role: RoleDefinition): PolicySetBuilder {
    this.roles.push(role);
    return this;
  }

  constraints(constraints: PolicyConstraints): PolicySetBuilder {
    this.constraintsValue = constraints;
    return this;
  }

  build(): PolicySet {
    if (this.rules.length === 0) {
      throw new Error('At least one rule is required.');
    }

    const policySet: PolicySet = {
      policyVersion: this.version,
      rules: [...this.rules],
    };

    if (this.roles.length > 0) {
      policySet.roles = [...this.roles];
    }

    if (this.constraintsValue) {
      policySet.constraints = this.constraintsValue;
    }

    return policySet;
  }
}

/** Create a policy set builder with a version identifier. */
export function policySet(version: string): PolicySetBuilder {
  return new PolicySetBuilderImpl(version);
}
