# @hexmon_tech/policy-dsl

Policy DSL package for JSON schema validation and builder APIs.

## Install

```bash
pnpm add @hexmon_tech/policy-dsl
```

## Minimal Usage

```ts
import { policySet, validatePolicySet } from '@hexmon_tech/policy-dsl';

const policy = policySet('1.0.0')
  .rule({ id: 'allow-read', effect: 'allow', actions: ['post:read'], resourceTypes: ['post'] })
  .build();

const result = validatePolicySet(policy);
```

## API Overview

- Types: `PolicySet`, `PolicyRule`, `Condition`, `RoleDefinition`, `PolicyConstraints`
- Validation: `validatePolicySet(policy)`
- Builder: `policySet(version).rule(...).role(...).constraints(...).build()`
- Schema: `policySetSchema`

## Compatibility

- Node `>=18`
- Pure JSON AST condition language (no JS eval)

## Verify

```bash
pnpm --filter @hexmon_tech/policy-dsl typecheck
pnpm --filter @hexmon_tech/policy-dsl test
pnpm --filter @hexmon_tech/policy-dsl build
```
