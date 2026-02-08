# @hexmon_tech/adapter-openfga

OpenFGA adapter skeleton with mockable client interface; no runtime OpenFGA SDK dependency required.

## Install

```bash
pnpm add @hexmon_tech/adapter-openfga
```

## Minimal Usage

```ts
import { OpenFgaRebacAdapter } from '@hexmon_tech/adapter-openfga';

const adapter = new OpenFgaRebacAdapter(mockClient, {
  storeId: 'store-id',
  authorizationModelId: 'model-id',
});
```

## API Overview

- Adapter: `OpenFgaRebacAdapter`
- Client contract: `OpenFgaClient`
- Request/response shapes: `OpenFga*Request`, `OpenFga*Response`

## Compatibility

- Node `>=18`
- Offline test-friendly (mock client only)

## Verify

```bash
pnpm --filter @hexmon_tech/adapter-openfga typecheck
pnpm --filter @hexmon_tech/adapter-openfga test
pnpm --filter @hexmon_tech/adapter-openfga build
```
