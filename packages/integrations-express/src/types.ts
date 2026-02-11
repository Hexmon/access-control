import type {
  Action,
  AuthorizationEngine,
  Context,
  Decision,
  Principal,
  Resource,
} from '@hexmon_tech/acccess-control-core';

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      authzDecision?: Decision;
    }
  }
}

/** Minimal request shape consumed by the middleware. */
export type ExpressRequest = Express.Request & Record<string, unknown>;

/** Minimal response shape consumed by the middleware. */
export interface ExpressResponse {
  status(code: number): this;
  json(body: unknown): this;
}

/** Minimal next function shape consumed by the middleware. */
export type ExpressNextFunction = (error?: unknown) => void;

/** Middleware function type. */
export type ExpressMiddleware<Req extends ExpressRequest = ExpressRequest> = (
  req: Req,
  res: ExpressResponse,
  next: ExpressNextFunction,
) => Promise<void>;

/** Allowed action resolver input. */
export type ActionInput = Action | string;

/** Middleware config for authorization checks. */
export interface RequireAuthzConfig<Req extends ExpressRequest = ExpressRequest> {
  engine: AuthorizationEngine;
  action: ActionInput | ((req: Req) => ActionInput | Promise<ActionInput>);
  resource: (req: Req) => Resource | Promise<Resource>;
  principal: (req: Req) => Principal | Promise<Principal>;
  fields?: (req: Req) => string[] | Promise<string[]>;
  context?: (req: Req) => Context | undefined | Promise<Context | undefined>;
  onDeny?: (params: {
    req: Req;
    res: ExpressResponse;
    next: ExpressNextFunction;
    decision: Decision;
  }) => void | Promise<void>;
  passErrorToNext?: boolean;
}

/** Authz error handler configuration. */
export interface AuthzErrorHandlerOptions {
  missingTenantStatus?: 400 | 401;
  exposeMessages?: boolean;
}

/** Stable JSON error body sent by integration error handlers. */
export interface AuthzErrorBody {
  code: string;
  message?: string;
}

/** Error middleware function type. */
export type ExpressErrorMiddleware<Req extends ExpressRequest = ExpressRequest> = (
  error: unknown,
  req: Req,
  res: ExpressResponse,
  next: ExpressNextFunction,
) => void;
