# @hexmon_tech/integrations-express

Express middleware and error handling helpers for authorization checks.

## Install

```bash
pnpm add @hexmon_tech/integrations-express
```

## Minimal Usage

```ts
import { requireAuthz, createAuthzErrorHandler } from '@hexmon_tech/integrations-express';

app.patch(
  '/posts/:id',
  requireAuthz({
    engine,
    action: 'post:update',
    principal: (req) => req.user,
    resource: (req) => ({ type: 'post', id: req.params.id }),
    context: (req) => ({ tenantId: req.headers['x-tenant-id'] as string }),
  }),
  handler,
);

app.use(createAuthzErrorHandler({ missingTenantStatus: 401 }));
```

## API Overview

- Middleware: `requireAuthz(config)`
- Error mapping: `createAuthzErrorHandler(options)`
- Request augmentation: `req.authzDecision?: Decision`

## Compatibility

- Node `>=18`
- Peer dependency: `express`

## Verify

```bash
pnpm --filter @hexmon_tech/integrations-express typecheck
pnpm --filter @hexmon_tech/integrations-express test
pnpm --filter @hexmon_tech/integrations-express build
```
