import type {
  AuthorizationEngine,
  AuthorizationInput,
  AuthorizationOptions,
  Decision,
  DecisionMeta,
  Obligation,
  Reason,
} from '@hexmon_tech/core';
import { EngineError } from '@hexmon_tech/core';
import type { RebacAdapter, RebacCheckResult } from '@hexmon_tech/engine-rebac';

import { isRebacEnabledFor, type RebacEnabledActionsByResourceType } from './match';

export interface HybridEngineConfig {
  rebacEnabledActionsByResourceType: RebacEnabledActionsByResourceType;
}

export interface HybridEngineOptions {
  embeddedEngine: AuthorizationEngine;
  rebacAdapter: RebacAdapter;
  config: HybridEngineConfig;
  engineName?: string;
}

export type HybridEnginePart = 'embedded' | 'rebac';

export type HybridDecisionMeta = DecisionMeta & {
  engineParts: HybridEnginePart[];
};

export class HybridEngine implements AuthorizationEngine {
  public readonly engine: string;

  private readonly embeddedEngine: AuthorizationEngine;
  private readonly rebacAdapter: RebacAdapter;
  private readonly config: HybridEngineConfig;

  constructor(options: HybridEngineOptions) {
    this.embeddedEngine = options.embeddedEngine;
    this.rebacAdapter = options.rebacAdapter;
    this.config = options.config;
    this.engine = options.engineName ?? 'hexmon_tech-hybrid';
  }

  public async authorize(
    input: AuthorizationInput,
    options?: AuthorizationOptions,
  ): Promise<Decision> {
    const embeddedDecision = await this.embeddedEngine.authorize(input, options);

    if (!this.shouldRunRebac(input)) {
      return this.withHybridMeta(embeddedDecision, ['embedded']);
    }

    const rebacDecision = await this.runRebacCheck(input, options);
    return combineDecisions(this.engine, embeddedDecision, rebacDecision, ['embedded', 'rebac']);
  }

  public async batchAuthorize(
    inputs: AuthorizationInput[],
    options?: AuthorizationOptions,
  ): Promise<Decision[]> {
    if (inputs.length === 0) {
      return [];
    }

    const embeddedDecisions = await this.embeddedEngine.batchAuthorize(inputs, options);

    if (embeddedDecisions.length !== inputs.length) {
      throw new EngineError('Embedded engine returned mismatched batch size.', {
        expected: inputs.length,
        actual: embeddedDecisions.length,
      });
    }

    const rebacResults = new Map<number, RebacCheckResult>();

    for (const [index, input] of inputs.entries()) {
      if (!this.shouldRunRebac(input)) {
        continue;
      }

      const rebacDecision = await this.runRebacCheck(input, options);
      rebacResults.set(index, rebacDecision);
    }

    const decisions: Decision[] = [];

    for (const [index, embeddedDecision] of embeddedDecisions.entries()) {
      const input = inputs[index];

      if (!input) {
        throw new EngineError('Missing authorization input for batch index.', { index });
      }

      const rebacDecision = rebacResults.get(index);
      if (!rebacDecision) {
        decisions.push(this.withHybridMeta(embeddedDecision, ['embedded']));
        continue;
      }

      decisions.push(
        combineDecisions(this.engine, embeddedDecision, rebacDecision, ['embedded', 'rebac']),
      );
    }

    return decisions;
  }

  private shouldRunRebac(input: AuthorizationInput): boolean {
    if (!input.resource.id) {
      return false;
    }

    return isRebacEnabledFor(
      this.config.rebacEnabledActionsByResourceType,
      input.resource.type,
      input.action.name,
    );
  }

  private async runRebacCheck(
    input: AuthorizationInput,
    options?: AuthorizationOptions,
  ): Promise<RebacCheckResult> {
    if (!input.resource.id) {
      throw new EngineError('ReBAC check requires resource.id.');
    }

    const tenantId = options?.tenantId ?? input.context?.tenantId ?? input.principal.tenantId;

    return this.rebacAdapter.check(
      {
        object: {
          type: input.resource.type,
          id: input.resource.id,
        },
        relation: input.action.name,
        subject: {
          type: input.principal.type,
          id: input.principal.id,
        },
        ...(tenantId !== undefined ? { tenantId } : {}),
      },
      {
        ...(options?.traceId !== undefined ? { traceId: options.traceId } : {}),
        ...(tenantId !== undefined ? { tenantId } : {}),
      },
    );
  }

  private withHybridMeta(decision: Decision, engineParts: HybridEnginePart[]): Decision {
    const meta: HybridDecisionMeta = {
      ...decision.meta,
      engine: this.engine,
      engineParts,
    };

    return {
      ...decision,
      reasons: decision.reasons.map((reason: Reason) => ({ ...reason })),
      obligations: decision.obligations.map((obligation: Obligation) => ({ ...obligation })),
      meta,
    };
  }
}

function combineDecisions(
  engineName: string,
  embeddedDecision: Decision,
  rebacDecision: RebacCheckResult,
  engineParts: HybridEnginePart[],
): Decision {
  const allow = embeddedDecision.allow && rebacDecision.allow;

  const rebacReason: Reason = rebacDecision.allow
    ? {
        code: 'REBAC_ALLOW',
        message: 'ReBAC check allowed object access.',
        ...(rebacDecision.trace !== undefined ? { details: { trace: rebacDecision.trace } } : {}),
      }
    : {
        code: 'REBAC_DENY',
        message: 'ReBAC check denied object access.',
        ...(rebacDecision.trace !== undefined ? { details: { trace: rebacDecision.trace } } : {}),
      };

  const meta: HybridDecisionMeta = {
    ...embeddedDecision.meta,
    engine: engineName,
    engineParts,
  };

  const reasons = [
    ...embeddedDecision.reasons.map((reason: Reason) => ({ ...reason })),
    rebacReason,
  ];
  const obligations = embeddedDecision.obligations.map((obligation: Obligation) => ({
    ...obligation,
  }));

  return {
    allow,
    reasons,
    obligations,
    meta,
  };
}
