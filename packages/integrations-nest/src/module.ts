import { Module, type DynamicModule } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthzGuard } from './guard';
import {
  AUTHZ_CONFIG,
  AUTHZ_ENGINE,
  AUTHZ_PRINCIPAL_RESOLVER,
  type AuthzConfig,
  type AuthzEngineProvider,
  type PrincipalResolver,
} from './tokens';

/** Root options for AuthzModule registration. */
export interface AuthzModuleOptions {
  engine: AuthzEngineProvider;
  principalResolver: PrincipalResolver;
  config?: AuthzConfig;
}

/** Lightweight Nest module for wiring authorization providers and guard. */
@Module({})
export class AuthzModule {
  public static forRoot(options: AuthzModuleOptions): DynamicModule {
    return {
      module: AuthzModule,
      providers: [
        Reflector,
        AuthzGuard,
        { provide: AUTHZ_ENGINE, useValue: options.engine },
        { provide: AUTHZ_PRINCIPAL_RESOLVER, useValue: options.principalResolver },
        { provide: AUTHZ_CONFIG, useValue: options.config ?? {} },
      ],
      exports: [AuthzGuard, AUTHZ_ENGINE, AUTHZ_PRINCIPAL_RESOLVER, AUTHZ_CONFIG],
    };
  }
}
