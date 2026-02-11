# @hexmon_tech/acccess-control-engine-rebac

ReBAC adapter contract and in-memory adapter for direct tuple checks.

## Install

```bash
pnpm add @hexmon_tech/acccess-control-engine-rebac
```

## Minimal Usage

```ts
import { InMemoryRebacAdapter } from '@hexmon_tech/acccess-control-engine-rebac';

const adapter = new InMemoryRebacAdapter();
await adapter.writeTuples([
  {
    tenantId: 'tenant-a',
    object: { type: 'file', id: 'f1' },
    relation: 'viewer',
    subject: { type: 'user', id: 'u1' },
  },
]);

const result = await adapter.check({
  tenantId: 'tenant-a',
  object: { type: 'file', id: 'f1' },
  relation: 'viewer',
  subject: { type: 'user', id: 'u1' },
});
```

## API Overview

- Types: `RelationshipTuple`, `RebacCheckInput`, `RebacCheckResult`
- Interface: `RebacAdapter`
- Adapter: `InMemoryRebacAdapter`

## Compatibility

- Node `>=18`
- Direct tuple matching only (no graph traversal)

## Verify

```bash
pnpm --filter @hexmon_tech/acccess-control-engine-rebac typecheck
pnpm --filter @hexmon_tech/acccess-control-engine-rebac test
pnpm --filter @hexmon_tech/acccess-control-engine-rebac build
```
