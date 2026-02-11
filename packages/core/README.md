# @hexmon_tech/acccess-control-core

Core public contracts for authorization inputs/decisions, engine interfaces, stable error codes, and helper utilities.

## Install

```bash
pnpm add @hexmon_tech/acccess-control-core
```

## Minimal Usage

```ts
import { createTraceId, normalizeFields, assertTenant } from '@hexmon_tech/acccess-control-core';

const traceId = createTraceId();
const fields = normalizeFields(['title', 'title', 'meta']);
const tenantId = assertTenant({ principal: { tenantId: 'tenant-a' } }, 'required');
```

## API Overview

- Types: `AuthorizationInput`, `Decision`, `AuthorizationEngine`, `Context`, `Reason`, `Obligation`
- Errors: `AcxError`, `MissingTenantError`, `InvalidPolicyError`, `EngineError`
- Capabilities: `Capability`, `CapabilitySet`, `assertCapability`
- Helpers: `createTraceId`, `normalizeFields`, `assertTenant`

## Compatibility

- Node `>=18`
- ESM + CJS + `.d.ts`

## Verify

```bash
pnpm --filter @hexmon_tech/acccess-control-core typecheck
pnpm --filter @hexmon_tech/acccess-control-core test
pnpm --filter @hexmon_tech/acccess-control-core build
```
