# @acx/integrations-nest

NestJS decorators and guard for `@acx/*` authorization engines.

## Usage

```ts
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  AuthzAction,
  AuthzGuard,
  AuthzModule,
  AuthzResource,
} from '@acx/integrations-nest';

@Controller('posts')
@UseGuards(AuthzGuard)
export class PostController {
  @Get(':id')
  @AuthzAction('post:read')
  @AuthzResource('post', (ctx) => {
    const req = ctx.switchToHttp().getRequest();
    return { type: 'post', id: req.params.id };
  })
  getPost(@Param('id') _id: string) {
    return { ok: true };
  }
}

// App module
AuthzModule.forRoot({
  engine,
  principalResolver: {
    resolve: (ctx) => ctx.switchToHttp().getRequest().user,
  },
  config: {
    missingTenantStatus: 401,
    getContext: (ctx) => ({ tenantId: ctx.switchToHttp().getRequest().headers['x-tenant-id'] }),
  },
});
```
