# @acx/integrations-express

Express middleware helpers for `@acx/*` authorization engines.

## Usage

```ts
import express from 'express';
import { EmbeddedEngine } from '@acx/engine-embedded';
import {
  createAuthzErrorHandler,
  requireAuthz,
} from '@acx/integrations-express';

const app = express();
const engine = new EmbeddedEngine({ mode: 'multi-tenant' });

app.patch(
  '/posts/:id',
  requireAuthz({
    engine,
    action: 'post:update',
    principal: (req) => req.user,
    resource: (req) => ({ type: 'post', id: req.params.id }),
    fields: (req) => ['title'],
    context: (req) => ({ tenantId: req.headers['x-tenant-id'] as string }),
  }),
  (_req, res) => {
    res.status(204).end();
  },
);

app.use(createAuthzErrorHandler({ missingTenantStatus: 401 }));
```
