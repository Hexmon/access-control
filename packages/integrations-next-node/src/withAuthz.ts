import type { Action, Decision } from '@acx/core';
import { AcxError, MissingTenantError } from '@acx/core';

import type { RouteHandler, ServerActionHandler, WithAuthzConfig } from './types';

/** Typed error thrown by server-action wrappers when authorization is denied. */
export class AuthzDeniedError extends Error {
  public readonly code = 'ACX_ERR_FORBIDDEN';
  public readonly decision: Decision;

  constructor(decision: Decision, message = 'Authorization denied.') {
    super(message);
    this.name = 'AuthzDeniedError';
    this.decision = decision;
  }
}

/**
 * Wrap a route handler or server action with authorization.
 * This wrapper targets Node runtime handlers and is not intended for Next.js Edge middleware.
 */
export function withAuthz<TArgs extends [Request, ...unknown[]]>(
  handler: RouteHandler<TArgs>,
  config: WithAuthzConfig<TArgs>,
): (...args: TArgs) => Promise<Response>;
export function withAuthz<TArgs extends unknown[], TResult>(
  handler: ServerActionHandler<TArgs, TResult>,
  config: WithAuthzConfig<TArgs>,
): (...args: TArgs) => Promise<TResult>;
export function withAuthz<TArgs extends unknown[], TResult>(
  handler: ((...args: TArgs) => TResult | Promise<TResult>) | ((...args: TArgs) => Response | Promise<Response>),
  config: WithAuthzConfig<TArgs>,
): (...args: TArgs) => Promise<TResult | Response> {
  return async (...args: TArgs): Promise<TResult | Response> => {
    try {
      const principal = await config.getPrincipal(...args);
      const resource = await config.getResource(...args);
      const context = config.getContext ? await config.getContext(...args) : undefined;
      const actionName =
        typeof config.action === 'function'
          ? await config.action(...args)
          : config.action;
      const fields = config.getFields ? await config.getFields(...args) : undefined;

      const action: Action = {
        name: actionName,
        ...(fields && fields.length > 0 ? { fields } : {}),
      };

      const decision = await config.engine.authorize({
        principal,
        action,
        resource,
        ...(context ? { context } : {}),
      });

      if (decision.allow) {
        return await handler(...args);
      }

      if (config.onDeny) {
        return (await config.onDeny({ args, decision })) as TResult | Response;
      }

      return defaultDeny(args, decision);
    } catch (error) {
      if (config.onDeny && (error instanceof MissingTenantError || error instanceof AcxError)) {
        return (await config.onDeny({ args, error })) as TResult | Response;
      }

      if (isRouteInvocation(args)) {
        return mapErrorToResponse(error);
      }

      throw error;
    }
  };
}

function defaultDeny<TArgs extends unknown[]>(args: TArgs, decision: Decision): Response {
  if (isRouteInvocation(args)) {
    return jsonResponse(403, { code: 'ACX_ERR_FORBIDDEN' });
  }

  throw new AuthzDeniedError(decision);
}

function mapErrorToResponse(error: unknown): Response {
  if (error instanceof MissingTenantError) {
    return jsonResponse(400, { code: error.code });
  }

  if (error instanceof AcxError) {
    return jsonResponse(403, { code: error.code });
  }

  return jsonResponse(500, { code: 'ACX_ERR_INTERNAL' });
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function isRouteInvocation(args: unknown[]): args is [Request, ...unknown[]] {
  const first = args[0];
  return first instanceof Request;
}
