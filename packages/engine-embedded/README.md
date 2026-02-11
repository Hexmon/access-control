# @hexmon_tech/acccess-control-engine-embedded

In-process authorization engine for compiled policies with deny-by-default, deny-overrides-allow, tracing, and TTL cache.

## Install

```bash
pnpm add @hexmon_tech/acccess-control-engine-embedded
```

## Minimal Usage

```ts
import { compilePolicySet } from '@hexmon_tech/acccess-control-compiler';
import { EmbeddedEngine } from '@hexmon_tech/acccess-control-engine-embedded';

const { ir } = compilePolicySet(policySet);
const engine = new EmbeddedEngine({ mode: 'multi-tenant' });
engine.setPolicy(ir);

const decision = await engine.authorize(input);
```

## API Overview

- Class: `EmbeddedEngine`
- Methods: `setPolicy`, `authorize`, `batchAuthorize`, `explain`, `getMetrics`
- Options: `mode`, `fieldViolation`, cache config (`enabled`, `maxSize`, `ttlMs`)

## Compatibility

- Node `>=18`
- Deterministic candidate ordering and cache invalidation on `setPolicy`

## Verify

```bash
pnpm --filter @hexmon_tech/acccess-control-engine-embedded typecheck
pnpm --filter @hexmon_tech/acccess-control-engine-embedded test
pnpm --filter @hexmon_tech/acccess-control-engine-embedded build
node packages/engine-embedded/bench/run.mjs
```
