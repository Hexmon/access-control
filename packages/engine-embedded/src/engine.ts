import type {
  AuthorizationEngine,
  AuthorizationInput,
  AuthorizationOptions,
  Decision,
  DecisionMeta,
  DecisionTrace,
  Obligation,
  Reason,
  TraceEvent,
} from '@hexmon_tech/core';
import { assertTenant, createTraceId, normalizeFields } from '@hexmon_tech/core';
import { EngineError } from '@hexmon_tech/core';
import type { PolicyIR } from '@hexmon_tech/compiler';
import { hashObject } from '@hexmon_tech/compiler';
import type { CompiledRule, ConditionInput } from '@hexmon_tech/compiler';

import { buildRuleIndex, getCandidates, RuleIndex } from './indexes';
import { buildRoleGraph, buildRoleRuleIndexes, resolveEffectiveRoles, RoleGraph } from './roles';

export interface EmbeddedEngineOptions {
  mode?: 'single-tenant' | 'multi-tenant';
  fieldViolation?: 'deny' | 'omit';
  cache?: {
    enabled?: boolean;
    maxSize?: number;
    ttlMs?: number;
  };
  engineName?: string;
}

export interface EngineMetrics {
  evaluations: number;
  cacheHits: number;
  cacheMisses: number;
}

interface CachedDecision {
  allow: boolean;
  reasons: Reason[];
  obligations: Obligation[];
}

export class EmbeddedEngine implements AuthorizationEngine {
  public readonly engine: string;
  public readonly capabilities = { explain: true } as const;

  private policy?: PolicyIR;
  private allowIndex: RuleIndex = buildRuleIndex([]);
  private denyIndex: RuleIndex = buildRuleIndex([]);
  private roleIndexes = new Map<string, RuleIndex>();
  private roleGraph: RoleGraph = { inherits: new Map() };

  private readonly mode: 'single-tenant' | 'multi-tenant';
  private readonly fieldViolation: 'deny' | 'omit';
  private readonly cache: LruCache<CachedDecision> | null;
  private readonly metrics: EngineMetrics = {
    evaluations: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };

  constructor(options: EmbeddedEngineOptions = {}) {
    this.mode = options.mode ?? 'single-tenant';
    this.fieldViolation = options.fieldViolation ?? 'omit';
    this.engine = options.engineName ?? 'acx-embedded';

    if (options.cache?.enabled === false) {
      this.cache = null;
    } else {
      this.cache = new LruCache<CachedDecision>({
        maxSize: options.cache?.maxSize ?? 500,
        ttlMs: options.cache?.ttlMs ?? 2000,
      });
    }
  }

  /** Update policy IR and invalidate caches. */
  public setPolicy(ir: PolicyIR): void {
    this.policy = ir;
    this.allowIndex = buildRuleIndex(ir.compiledRules.filter((rule) => rule.effect === 'allow'));
    this.denyIndex = buildRuleIndex(ir.compiledRules.filter((rule) => rule.effect === 'deny'));
    this.roleGraph = buildRoleGraph(ir.roles);
    this.roleIndexes = buildRoleRuleIndexes(ir.roles);
    this.cache?.clear();
  }

  /** Get current evaluation and cache metrics. */
  public getMetrics(): EngineMetrics {
    return { ...this.metrics };
  }

  public async authorize(
    input: AuthorizationInput,
    options?: AuthorizationOptions,
  ): Promise<Decision> {
    const { decision } = this.evaluate(input, options, { trace: Boolean(options?.trace) });
    return decision;
  }

  public async batchAuthorize(
    inputs: AuthorizationInput[],
    options?: AuthorizationOptions,
  ): Promise<Decision[]> {
    const results: Decision[] = [];
    for (const input of inputs) {
      results.push(await this.authorize(input, options));
    }
    return results;
  }

  public async explain(
    input: AuthorizationInput,
    options?: AuthorizationOptions,
  ): Promise<{ decision: Decision; trace: DecisionTrace }> {
    const { decision, trace } = this.evaluate(input, options, { trace: true });

    if (!trace) {
      throw new EngineError('Trace capture failed.');
    }

    return { decision, trace };
  }

  private evaluate(
    input: AuthorizationInput,
    options: AuthorizationOptions | undefined,
    traceOptions: { trace: boolean },
  ): { decision: Decision; trace?: DecisionTrace } {
    if (!this.policy) {
      throw new EngineError('Policy IR is not set.');
    }

    const traceId = options?.traceId ?? createTraceId();
    const traceCollector = traceOptions.trace ? new TraceCollector(traceId) : null;

    const tenantInput = input.context
      ? { principal: input.principal, context: input.context }
      : { principal: input.principal };
    const tenantId =
      this.mode === 'multi-tenant'
        ? assertTenant(tenantInput, 'required')
        : assertTenant(tenantInput, 'optional');

    const normalizedFields = normalizeFields(input.action.fields);

    const cacheKey =
      this.cache && !traceOptions.trace ? buildCacheKey(input, tenantId, normalizedFields) : null;

    if (this.cache && cacheKey) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.metrics.cacheHits += 1;
        const decision = buildDecision(
          cached,
          buildMeta(this.policy, traceId, tenantId, options, this.engine),
        );
        return { decision };
      }

      this.metrics.cacheMisses += 1;
    }

    this.metrics.evaluations += 1;

    const effectiveRoles = resolveEffectiveRoles(input.principal.roles, this.roleGraph);
    const evaluationInput: ConditionInput = {
      principal: {
        ...input.principal,
        roles: effectiveRoles,
      },
      resource: input.resource as unknown as Record<string, unknown>,
      context: input.context as unknown as Record<string, unknown>,
    };

    traceCollector?.record('input', 'Authorization request received.', {
      action: input.action.name,
      resourceType: input.resource.type,
      tenantId,
    });

    const denyResult = this.evaluateDenies(
      input,
      evaluationInput,
      normalizedFields,
      traceCollector,
    );

    if (denyResult.decision) {
      const decision = buildDecision(
        denyResult.decision,
        buildMeta(this.policy, traceId, tenantId, options, this.engine),
      );
      if (traceCollector) {
        decision.reasons.push({
          code: 'TRACE',
          message: 'Trace captured.',
          details: traceCollector.toTrace(),
        });
      }
      if (traceCollector) {
        return { decision, trace: traceCollector.toTrace() };
      }
      return { decision };
    }

    const allowResult = this.evaluateAllows(
      input,
      evaluationInput,
      normalizedFields,
      effectiveRoles,
      denyResult,
      traceCollector,
    );

    const decision = buildDecision(
      allowResult,
      buildMeta(this.policy, traceId, tenantId, options, this.engine),
    );

    if (traceCollector) {
      decision.reasons.push({
        code: 'TRACE',
        message: 'Trace captured.',
        details: traceCollector.toTrace(),
      });
    }

    if (this.cache && cacheKey) {
      this.cache.set(cacheKey, {
        allow: decision.allow,
        reasons: decision.reasons,
        obligations: decision.obligations,
      });
    }

    if (traceCollector) {
      return { decision, trace: traceCollector.toTrace() };
    }
    return { decision };
  }

  private evaluateDenies(
    input: AuthorizationInput,
    evaluationInput: ConditionInput,
    normalizedFields: string[],
    traceCollector: TraceCollector | null,
  ): {
    decision?: CachedDecision;
    deniedFields: Set<string>;
    obligations: Obligation[];
  } {
    const deniedFields = new Set<string>();
    const obligations: Obligation[] = [];

    const denyCandidates = getCandidates(this.denyIndex, input.action.name, input.resource.type, [
      'tenant',
      'global',
    ]);

    for (const rule of denyCandidates) {
      if (!rule.predicate(evaluationInput)) {
        continue;
      }

      traceCollector?.record('rule', `Deny rule matched: ${rule.id}.`, { ruleId: rule.id });

      const hasFieldSelectors = Boolean(rule.fieldMatchers.allow || rule.fieldMatchers.deny);

      if (!hasFieldSelectors) {
        obligations.push(...rule.obligations);
        return {
          decision: {
            allow: false,
            reasons: [ruleReason('RULE_DENY', `Denied by rule ${rule.id}.`, rule)],
            obligations,
          },
          deniedFields,
          obligations,
        };
      }

      if (normalizedFields.length === 0) {
        continue;
      }

      const ruleDeniedFields = collectDeniedFieldsForDenyRule(rule, normalizedFields);

      if (ruleDeniedFields.length === 0) {
        continue;
      }

      if (this.fieldViolation === 'deny') {
        return {
          decision: {
            allow: false,
            reasons: [
              ruleReason(
                'FIELD_VIOLATION',
                `Denied due to field restrictions in rule ${rule.id}.`,
                rule,
                { fields: ruleDeniedFields },
              ),
            ],
            obligations: [...rule.obligations],
          },
          deniedFields,
          obligations,
        };
      }

      for (const field of ruleDeniedFields) {
        deniedFields.add(field);
      }
      obligations.push(...rule.obligations);
    }

    return { deniedFields, obligations };
  }

  private evaluateAllows(
    input: AuthorizationInput,
    evaluationInput: ConditionInput,
    normalizedFields: string[],
    effectiveRoles: string[],
    denyResult: { deniedFields: Set<string>; obligations: Obligation[] },
    traceCollector: TraceCollector | null,
  ): CachedDecision {
    const allowCandidates = this.getAllowCandidates(input, effectiveRoles);
    const obligations: Obligation[] = [...denyResult.obligations];

    let matchedRule: CompiledRule | undefined;

    for (const rule of allowCandidates) {
      if (!rule.predicate(evaluationInput)) {
        continue;
      }

      matchedRule = rule;
      traceCollector?.record('rule', `Allow rule matched: ${rule.id}.`, { ruleId: rule.id });
      break;
    }

    if (!matchedRule) {
      return {
        allow: false,
        reasons: [
          {
            code: 'DEFAULT_DENY',
            message: 'No allow rule matched.',
          },
        ],
        obligations: [],
      };
    }

    obligations.push(...matchedRule.obligations);

    const deniedFields = new Set<string>(denyResult.deniedFields);

    if (normalizedFields.length > 0) {
      const allowDeniedFields = collectDeniedFieldsForAllowRule(matchedRule, normalizedFields);
      for (const field of allowDeniedFields) {
        deniedFields.add(field);
      }
    }

    if (deniedFields.size > 0) {
      const sortedDenied = Array.from(deniedFields).sort();

      if (this.fieldViolation === 'deny') {
        return {
          allow: false,
          reasons: [
            ruleReason('FIELD_VIOLATION', 'Denied due to field restrictions.', matchedRule, {
              fields: sortedDenied,
            }),
          ],
          obligations,
        };
      }

      obligations.push({
        type: 'omitFields',
        payload: { fields: sortedDenied },
      });

      return {
        allow: true,
        reasons: [
          ruleReason('RULE_ALLOW', `Allowed by rule ${matchedRule.id}.`, matchedRule),
          {
            code: 'FIELD_OMIT',
            message: 'Fields omitted due to policy restrictions.',
            details: { fields: sortedDenied },
          },
        ],
        obligations,
      };
    }

    return {
      allow: true,
      reasons: [ruleReason('RULE_ALLOW', `Allowed by rule ${matchedRule.id}.`, matchedRule)],
      obligations,
    };
  }

  private getAllowCandidates(input: AuthorizationInput, effectiveRoles: string[]): CompiledRule[] {
    const directAllow = getCandidates(this.allowIndex, input.action.name, input.resource.type, [
      'tenant',
      'global',
    ]);

    const roleAllow: CompiledRule[] = [];
    for (const role of effectiveRoles) {
      const roleIndex = this.roleIndexes.get(role);
      if (!roleIndex) {
        continue;
      }

      const candidates = getCandidates(roleIndex, input.action.name, input.resource.type, [
        'tenant',
        'global',
      ]);

      roleAllow.push(...candidates);
    }

    if (roleAllow.length === 0) {
      return directAllow;
    }

    const merged = new Map<string, CompiledRule>();
    for (const rule of directAllow) {
      merged.set(rule.id, rule);
    }

    for (const rule of roleAllow) {
      merged.set(rule.id, rule);
    }

    return sortCandidates(Array.from(merged.values()));
  }
}

function buildMeta(
  policy: PolicyIR,
  traceId: string,
  tenantId: string | undefined,
  options: AuthorizationOptions | undefined,
  engineName: string,
): DecisionMeta {
  const meta: DecisionMeta = {
    traceId,
    engine: engineName,
    policyVersion: options?.policyVersion ?? policy.policyVersion,
    policyHash: options?.policyHash ?? policy.policyHash,
    evaluatedAt: new Date().toISOString(),
  };

  const resolvedTenantId = options?.tenantId ?? tenantId;
  if (resolvedTenantId) {
    meta.tenantId = resolvedTenantId;
  }

  return meta;
}

function buildDecision(cached: CachedDecision, meta: DecisionMeta): Decision {
  return {
    allow: cached.allow,
    reasons: cached.reasons.map((reason) => ({ ...reason })),
    obligations: cached.obligations.map((obligation) => ({ ...obligation })),
    meta,
  };
}

function ruleReason(
  code: string,
  message: string,
  rule: CompiledRule,
  details?: Record<string, unknown>,
): Reason {
  return {
    code,
    message,
    details: {
      ruleId: rule.id,
      effect: rule.effect,
      priority: rule.priority,
      ...details,
    },
  };
}

function collectDeniedFieldsForDenyRule(rule: CompiledRule, fields: string[]): string[] {
  const denied = new Set<string>();

  if (rule.fieldMatchers.deny) {
    for (const field of fields) {
      if (rule.fieldMatchers.deny.match(field)) {
        denied.add(field);
      }
    }
  }

  if (rule.fieldMatchers.allow) {
    for (const field of fields) {
      if (!rule.fieldMatchers.allow.match(field)) {
        denied.add(field);
      }
    }
  }

  return Array.from(denied).sort();
}

function collectDeniedFieldsForAllowRule(rule: CompiledRule, fields: string[]): string[] {
  const denied = new Set<string>();

  if (rule.fieldMatchers.allow) {
    for (const field of fields) {
      if (!rule.fieldMatchers.allow.match(field)) {
        denied.add(field);
      }
    }
  }

  if (rule.fieldMatchers.deny) {
    for (const field of fields) {
      if (rule.fieldMatchers.deny.match(field)) {
        denied.add(field);
      }
    }
  }

  return Array.from(denied).sort();
}

function sortCandidates(rules: CompiledRule[]): CompiledRule[] {
  return rules.sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }

    if (a.id < b.id) {
      return -1;
    }

    if (a.id > b.id) {
      return 1;
    }

    return 0;
  });
}

function buildCacheKey(
  input: AuthorizationInput,
  tenantId: string | undefined,
  normalizedFields: string[],
): string {
  const fieldsHash = hashObject(normalizedFields);
  const contextHash = hashObject(pickCacheContext(input.context));
  const principalHash = hashObject({
    type: input.principal.type,
    roles: input.principal.roles,
    groups: input.principal.groups,
    attrs: input.principal.attrs,
  });
  const resourceHash = hashObject({
    attrs: input.resource.attrs,
    parent: input.resource.parent,
  });

  return hashObject({
    tenantId: tenantId ?? '',
    principalId: input.principal.id,
    actionName: input.action.name,
    resourceType: input.resource.type,
    resourceId: input.resource.id ?? '',
    fieldsHash,
    contextHash,
    principalHash,
    resourceHash,
  });
}

function pickCacheContext(context: AuthorizationInput['context']): Record<string, unknown> {
  if (!context) {
    return {};
  }

  return { ...context };
}

class LruCache<T> {
  private readonly maxSize: number;
  private readonly ttlMs: number;
  private readonly map = new Map<string, { value: T; expiresAt: number }>();

  constructor(options: { maxSize: number; ttlMs: number }) {
    this.maxSize = options.maxSize;
    this.ttlMs = options.ttlMs;
  }

  get(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }

    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    }

    this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs });

    if (this.map.size > this.maxSize) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey) {
        this.map.delete(oldestKey);
      }
    }
  }

  clear(): void {
    this.map.clear();
  }
}

class TraceCollector {
  private readonly events: TraceEvent[] = [];
  private counter = 0;

  constructor(private readonly traceId: string) {}

  record(type: TraceEvent['type'], message: string, data?: Record<string, unknown>): void {
    const event: TraceEvent = {
      id: `${this.traceId}:${(this.counter += 1)}`,
      at: new Date().toISOString(),
      type,
      message,
    };

    if (data) {
      event.data = data;
    }

    this.events.push(event);
  }

  toTrace(): DecisionTrace {
    return {
      traceId: this.traceId,
      events: [...this.events],
    };
  }
}
