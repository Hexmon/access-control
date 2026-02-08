# @hexmon_tech/core

Core public contracts for authorization inputs/decisions, engine interfaces, stable error codes, and helper utilities.

## Install

```bash
pnpm add @hexmon_tech/core
```

## Minimal Usage

```ts
import { createTraceId, normalizeFields, assertTenant } from '@hexmon_tech/core';

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
pnpm --filter @hexmon_tech/core typecheck
pnpm --filter @hexmon_tech/core test
pnpm --filter @hexmon_tech/core build
```
