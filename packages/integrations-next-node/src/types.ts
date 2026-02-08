import type {
  AuthorizationEngine,
  Context,
  Decision,
  Principal,
  Resource,
} from '@acx/core';

/** Generic route-handler shape compatible with Node runtime route handlers. */
export type RouteHandler<TArgs extends unknown[] = [Request]> = (
  ...args: TArgs
) => Response | Promise<Response>;

/** Generic server-action handler shape (Node runtime only). */
export type ServerActionHandler<TArgs extends unknown[] = unknown[], TResult = unknown> = (
  ...args: TArgs
) => TResult | Promise<TResult>;

/** Deny callback context. */
export interface WithAuthzDenyContext<TArgs extends unknown[]> {
  args: TArgs;
  decision?: Decision;
  error?: unknown;
}

/** Common authorization-wrapper config for route handlers and server actions. */
export interface WithAuthzConfig<TArgs extends unknown[]> {
  engine: AuthorizationEngine;
  action: string | ((...args: TArgs) => string | Promise<string>);
  getPrincipal: (...args: TArgs) => Principal | Promise<Principal>;
  getResource: (...args: TArgs) => Resource | Promise<Resource>;
  getContext?: (...args: TArgs) => Context | undefined | Promise<Context | undefined>;
  getFields?: (...args: TArgs) => string[] | Promise<string[]>;
  onDeny?: (context: WithAuthzDenyContext<TArgs>) => unknown | Promise<unknown>;
}
