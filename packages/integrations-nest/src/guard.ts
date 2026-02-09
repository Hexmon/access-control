import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AcxError,
  EngineError,
  InvalidPolicyError,
  MissingTenantError,
  normalizeFields,
} from '@hexmon_tech/core';

import {
  AUTHZ_ACTION_METADATA,
  AUTHZ_RESOURCE_METADATA,
  type AuthzActionMetadata,
  type AuthzResourceMetadata,
} from './decorators';
import {
  AUTHZ_CONFIG,
  AUTHZ_ENGINE,
  AUTHZ_PRINCIPAL_RESOLVER,
  type AuthzConfig,
  type AuthzEngineProvider,
  type AuthzRequest,
  type PrincipalResolver,
} from './tokens';

/** Nest guard that executes @hexmon_tech authorization before controller handlers. */
@Injectable()
export class AuthzGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(AUTHZ_ENGINE) private readonly engine: AuthzEngineProvider,
    @Inject(AUTHZ_PRINCIPAL_RESOLVER) private readonly principalResolver: PrincipalResolver,
    @Optional() @Inject(AUTHZ_CONFIG) private readonly config?: AuthzConfig,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const actionMetadata = this.reflector.getAllAndOverride<AuthzActionMetadata>(
      AUTHZ_ACTION_METADATA,
      [context.getHandler(), context.getClass()],
    );
    const resourceMetadata = this.reflector.getAllAndOverride<AuthzResourceMetadata>(
      AUTHZ_RESOURCE_METADATA,
      [context.getHandler(), context.getClass()],
    );

    if (!actionMetadata || !resourceMetadata) {
      return true;
    }

    try {
      const principal = await this.principalResolver.resolve(context);
      const resolvedResource = await resourceMetadata.resolver(context);
      const configuredContext = this.config?.getContext
        ? await this.config.getContext(context)
        : undefined;
      const configuredFields = this.config?.getFields ? await this.config.getFields(context) : [];
      const mergedFields = normalizeFields([...(actionMetadata.fields ?? []), ...configuredFields]);

      const decision = await this.engine.authorize({
        principal,
        action: {
          name: actionMetadata.actionName,
          ...(mergedFields.length > 0 ? { fields: mergedFields } : {}),
        },
        resource: {
          ...resolvedResource,
          type: resourceMetadata.type,
        },
        ...(configuredContext ? { context: configuredContext } : {}),
      });

      const request = this.getRequest(context);
      request.authzDecision = decision;

      if (!decision.allow) {
        throw new ForbiddenException('Access denied by authorization policy.');
      }

      return true;
    } catch (error) {
      throw this.mapToNestException(error);
    }
  }

  private getRequest(context: ExecutionContext): AuthzRequest {
    return context.switchToHttp().getRequest<AuthzRequest>();
  }

  private mapToNestException(error: unknown): Error {
    if (error instanceof MissingTenantError) {
      if (this.config?.missingTenantStatus === 401) {
        return new UnauthorizedException('Tenant id is required.');
      }

      return new BadRequestException('Tenant id is required.');
    }

    if (error instanceof ForbiddenException) {
      return error;
    }

    if (error instanceof InvalidPolicyError) {
      return new BadRequestException('Invalid authorization policy.');
    }

    if (error instanceof EngineError) {
      return new InternalServerErrorException('Authorization engine failure.');
    }

    if (error instanceof AcxError) {
      return new ForbiddenException('Authorization failed.');
    }

    if (error instanceof Error) {
      return error;
    }

    return new InternalServerErrorException('Unknown authorization error.');
  }
}
