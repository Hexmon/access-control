# @acx/integrations-next-node

Authorization wrappers for Next.js Node runtime route handlers and server actions.

`@acx/integrations-next-node` is **not** intended for Edge middleware/runtime.

## App Router Route Handler (Node runtime)

```ts
import { withAuthz } from '@acx/integrations-next-node';

export const POST = withAuthz(
  async (req: Request) => {
    return new Response(null, { status: 204 });
  },
  {
    engine,
    action: 'post:update',
    getPrincipal: async (req) => getPrincipalFromSession(req),
    getResource: async (_req) => ({ type: 'post', id: 'post-1' }),
    getContext: async (req) => ({ tenantId: req.headers.get('x-tenant-id') ?? undefined }),
  },
);
```

## Server Action (Node runtime)

```ts
'use server';

import { withAuthz } from '@acx/integrations-next-node';

export const updatePostTitle = withAuthz(
  async (postId: string, title: string) => {
    await db.post.update({ where: { id: postId }, data: { title } });
    return { ok: true };
  },
  {
    engine,
    action: 'post:update',
    getPrincipal: async () => getPrincipalFromSession(),
    getResource: async (postId) => ({ type: 'post', id: postId }),
    getContext: async () => ({ tenantId: 'tenant-1' }),
  },
);
```
