# @hexmon_tech/integrations-nest

NestJS decorators, guard, and module wiring for authorization enforcement.

## Install

```bash
pnpm add @hexmon_tech/integrations-nest
```

## Minimal Usage

```ts
import { UseGuards } from '@nestjs/common';
import { AuthzAction, AuthzGuard, AuthzResource } from '@hexmon_tech/integrations-nest';

@UseGuards(AuthzGuard)
@AuthzAction('post:read')
@AuthzResource('post', (ctx) => ({ type: 'post', id: ctx.switchToHttp().getRequest().params.id }))
class PostController {}
```

## API Overview

- Decorators: `@AuthzAction`, `@AuthzResource`
- Guard: `AuthzGuard`
- Module: `AuthzModule.forRoot(...)`
- Tokens/interfaces: `AUTHZ_ENGINE`, `PrincipalResolver`, `AuthzConfig`

## Compatibility

- Node `>=18`
- Peer dependencies: NestJS core/common/platform-express + reflect-metadata

## Verify

```bash
pnpm --filter @hexmon_tech/integrations-nest typecheck
pnpm --filter @hexmon_tech/integrations-nest test
pnpm --filter @hexmon_tech/integrations-nest build
```
