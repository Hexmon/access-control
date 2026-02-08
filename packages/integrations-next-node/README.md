# @hexmon_tech/integrations-next-node

Authorization wrappers for Next.js Node runtime route handlers and server actions.

## Install

```bash
pnpm add @hexmon_tech/integrations-next-node
```

## Minimal Usage

```ts
import { withAuthz } from '@hexmon_tech/integrations-next-node';

export const POST = withAuthz(async (req: Request) => new Response(null, { status: 204 }), {
  engine,
  action: 'post:update',
  getPrincipal: async (req) => principalFromRequest(req),
  getResource: async () => ({ type: 'post', id: 'p1' }),
  getContext: async (req) => ({ tenantId: req.headers.get('x-tenant-id') ?? undefined }),
});
```

## API Overview

- Wrapper: `withAuthz(handler, config)`
- Errors: `AuthzDeniedError`, `NotImplementedError`
- Helper placeholder: `getPrincipalFromRequest`

## Compatibility

- Node `>=18`
- Next.js Node runtime only (not Edge runtime)

## Verify

```bash
pnpm --filter @hexmon_tech/integrations-next-node typecheck
pnpm --filter @hexmon_tech/integrations-next-node test
pnpm --filter @hexmon_tech/integrations-next-node build
```
