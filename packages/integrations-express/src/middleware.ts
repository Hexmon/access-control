import type { Action, Decision } from '@hexmon_tech/core';

import type {
  ActionInput,
  ExpressMiddleware,
  ExpressNextFunction,
  ExpressResponse,
  RequireAuthzConfig,
} from './types';

/** Create an Express middleware that enforces authorization checks. */
export function requireAuthz<Req extends Express.Request & Record<string, unknown>>(
  config: RequireAuthzConfig<Req>,
): ExpressMiddleware<Req> {
  return async (req, res, next): Promise<void> => {
    try {
      const principal = await config.principal(req);
      const resource = await config.resource(req);
      const context = config.context ? await config.context(req) : undefined;
      const resolvedAction = await resolveAction(config.action, req);
      const resolvedFields = config.fields ? await config.fields(req) : undefined;

      const action: Action = {
        ...resolvedAction,
        ...(resolvedFields && resolvedFields.length > 0 ? { fields: resolvedFields } : {}),
      };

      const decision = await config.engine.authorize({
        principal,
        resource,
        action,
        ...(context ? { context } : {}),
      });

      req.authzDecision = decision;

      if (decision.allow) {
        next();
        return;
      }

      await handleDeny(config, req, res, next, decision);
    } catch (error) {
      if (config.passErrorToNext !== false) {
        next(error);
        return;
      }

      res.status(500).json({ code: 'ACX_ERR_INTERNAL' });
    }
  };
}

async function resolveAction<Req extends Express.Request & Record<string, unknown>>(
  actionInput: ActionInput | ((req: Req) => ActionInput | Promise<ActionInput>),
  req: Req,
): Promise<Action> {
  const resolved = typeof actionInput === 'function' ? await actionInput(req) : actionInput;

  if (typeof resolved === 'string') {
    return { name: resolved };
  }

  return {
    ...resolved,
  };
}

async function handleDeny<Req extends Express.Request & Record<string, unknown>>(
  config: RequireAuthzConfig<Req>,
  req: Req,
  res: ExpressResponse,
  next: ExpressNextFunction,
  decision: Decision,
): Promise<void> {
  if (config.onDeny) {
    await config.onDeny({ req, res, next, decision });
    return;
  }

  res.status(403).json({ code: 'ACX_ERR_FORBIDDEN' });
}
