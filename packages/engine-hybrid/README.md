# @hexmon_tech/acccess-control-engine-hybrid

Hybrid engine that combines embedded decisions with ReBAC object checks.

## Install

```bash
pnpm add @hexmon_tech/acccess-control-engine-hybrid
```

## Minimal Usage

```ts
import { HybridEngine } from '@hexmon_tech/acccess-control-engine-hybrid';

const engine = new HybridEngine({
  embeddedEngine,
  rebacAdapter,
  config: {
    rebacEnabledActionsByResourceType: {
      post: ['post:*'],
      '*': ['file:read'],
    },
  },
});
```

## API Overview

- Class: `HybridEngine`
- Methods: `authorize`, `batchAuthorize`
- Match helpers: `matchesActionPattern`, `isRebacEnabledFor`

## Compatibility

- Node `>=18`
- Embedded engine remains authoritative for global constraints

## Verify

```bash
pnpm --filter @hexmon_tech/acccess-control-engine-hybrid typecheck
pnpm --filter @hexmon_tech/acccess-control-engine-hybrid test
pnpm --filter @hexmon_tech/acccess-control-engine-hybrid build
```
