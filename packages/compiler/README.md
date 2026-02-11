# @hexmon_tech/acccess-control-compiler

Compiles policy DSL into deterministic IR, performs semantic diagnostics, and computes stable hashes.

## Install

```bash
pnpm add @hexmon_tech/acccess-control-compiler
```

## Minimal Usage

```ts
import { compilePolicySet } from '@hexmon_tech/acccess-control-compiler';

const { ir, diagnostics } = compilePolicySet(policySet, { mode: 'multi-tenant' });
```

## API Overview

- Compile: `compilePolicySet(policy, options)`
- Diagnostics: conflict/unreachable/multi-tenant scoping/field selector checks
- Conditions: `evaluateCondition` + safe `resolveRef`
- Hashing: `stableStringify`, `sha256`, `hashObject`

## Compatibility

- Node `>=18`
- No dynamic code execution

## Verify

```bash
pnpm --filter @hexmon_tech/acccess-control-compiler typecheck
pnpm --filter @hexmon_tech/acccess-control-compiler test
pnpm --filter @hexmon_tech/acccess-control-compiler build
```
