import type {
  AuthorizationEngine,
  Context,
  Decision,
  Principal,
} from '@acx/core';
import type { ExecutionContext } from '@nestjs/common';

/** Engine provider type used by the Nest integration. */
export type AuthzEngineProvider = AuthorizationEngine;

/** Hook for resolving the current principal from Nest execution context. */
export interface PrincipalResolver {
  resolve(context: ExecutionContext): Principal | Promise<Principal>;
}

/** Guard-level configuration hooks. */
export interface AuthzConfig {
  missingTenantStatus?: 400 | 401;
  getContext?: (context: ExecutionContext) => Context | undefined | Promise<Context | undefined>;
  getFields?: (context: ExecutionContext) => string[] | Promise<string[]>;
}

/** Request shape used by guard to attach authorization decisions. */
export type AuthzRequest = Record<string, unknown> & {
  authzDecision?: Decision;
};

/** Injection token for authorization engine provider. */
export const AUTHZ_ENGINE = Symbol('ACX_AUTHZ_ENGINE');

/** Injection token for principal resolver provider. */
export const AUTHZ_PRINCIPAL_RESOLVER = Symbol('ACX_AUTHZ_PRINCIPAL_RESOLVER');

/** Injection token for guard config. */
export const AUTHZ_CONFIG = Symbol('ACX_AUTHZ_CONFIG');
