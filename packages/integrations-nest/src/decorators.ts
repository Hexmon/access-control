import type { Resource } from '@hexmon_tech/core';
import { SetMetadata } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';

/** Metadata key for action declarations. */
export const AUTHZ_ACTION_METADATA = 'acx:authz:action';

/** Metadata key for resource declarations. */
export const AUTHZ_RESOURCE_METADATA = 'acx:authz:resource';

/** Metadata payload for action decorators. */
export interface AuthzActionMetadata {
  actionName: string;
  fields?: string[];
}

/** Resource resolver for the current request context. */
export type AuthzResourceResolver = (context: ExecutionContext) => Resource | Promise<Resource>;

/** Metadata payload for resource decorators. */
export interface AuthzResourceMetadata {
  type: string;
  resolver: AuthzResourceResolver;
}

/** Declare authorization action metadata for a route handler/class. */
export function AuthzAction(
  actionName: string,
  fields?: string[],
): MethodDecorator & ClassDecorator {
  const metadata: AuthzActionMetadata = {
    actionName,
    ...(fields && fields.length > 0 ? { fields } : {}),
  };

  return SetMetadata(AUTHZ_ACTION_METADATA, metadata);
}

/** Declare authorization resource metadata for a route handler/class. */
export function AuthzResource(
  type: string,
  resolver: AuthzResourceResolver,
): MethodDecorator & ClassDecorator {
  const metadata: AuthzResourceMetadata = {
    type,
    resolver,
  };

  return SetMetadata(AUTHZ_RESOURCE_METADATA, metadata);
}
