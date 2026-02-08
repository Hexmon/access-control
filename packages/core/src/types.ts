import type { CapabilitySet } from './capabilities';

/** Supported principal types in the system. */
export type PrincipalType = 'user' | 'service';

/** A principal requesting authorization. */
export interface Principal {
  id: string;
  type: PrincipalType;
  tenantId: string;
  roles?: string[];
  groups?: string[];
  attrs?: Record<string, unknown>;
}

/** A parent resource reference for hierarchical policies. */
export interface ResourceParent {
  type: string;
  id: string;
  attrs?: Record<string, unknown>;
}

/** The resource being accessed. */
export interface Resource {
  type: string;
  id?: string;
  attrs?: Record<string, unknown>;
  parent?: ResourceParent;
}

/** Action the principal wants to perform. */
export interface Action {
  name: string;
  fields?: string[];
}

/** Request metadata for contextual authorization. */
export interface RequestContext {
  ip?: string;
  userAgent?: string;
  authStrength?: string;
  deviceTrust?: string;
}

/** Time-related context. */
export interface TimeContext {
  now?: string;
}

/** Workflow context for task or approval-driven flows. */
export interface WorkflowContext {
  status?: string;
  task?: string;
  step?: string;
}

/** Contextual data for policy evaluation. */
export interface Context {
  tenantId?: string;
  request?: RequestContext;
  time?: TimeContext;
  workflow?: WorkflowContext;
  env?: string;
  [key: string]: unknown;
}

/** Input for a single authorization decision. */
export interface AuthorizationInput {
  principal: Principal;
  resource: Resource;
  action: Action;
  context?: Context;
}

/** A reason explaining a decision. */
export interface Reason {
  code: string;
  message: string;
  details?: unknown;
}

/** An obligation the caller must fulfill. */
export interface Obligation {
  type: string;
  payload?: unknown;
}

/** Metadata about how a decision was evaluated. */
export interface DecisionMeta {
  traceId: string;
  engine: string;
  policyVersion?: string;
  policyHash?: string;
  evaluatedAt: string;
  tenantId?: string;
}

/** Result of an authorization decision. */
export interface Decision {
  allow: boolean;
  reasons: Reason[];
  obligations: Obligation[];
  meta: DecisionMeta;
}

/** A single trace event captured during evaluation. */
export interface TraceEvent {
  id: string;
  at: string;
  type: 'input' | 'policy' | 'rule' | 'constraint' | 'obligation' | 'info' | 'error';
  message: string;
  data?: Record<string, unknown>;
}

/** Detailed trace for explain operations. */
export interface DecisionTrace {
  traceId: string;
  events: TraceEvent[];
}

/** Optional settings for authorization requests. */
export interface AuthorizationOptions {
  traceId?: string;
  trace?: boolean;
  policyVersion?: string;
  policyHash?: string;
  tenantId?: string;
}

/** Minimal reference to a resource in list results. */
export interface ResourceRef {
  type: string;
  id: string;
}

/** Minimal reference to a principal in list results. */
export interface PrincipalRef {
  id: string;
  type: PrincipalType;
  tenantId?: string;
}

/** Input for listing resource identifiers authorized for a principal. */
export interface ListObjectsInput {
  principal: Principal;
  action: Action;
  resource: Resource;
  context?: Context;
}

/** Result for listObjects capability. */
export interface ListObjectsResult {
  objects: ResourceRef[];
  meta: DecisionMeta;
  reasons?: Reason[];
}

/** Input for listing subjects authorized to access a resource. */
export interface ListSubjectsInput {
  resource: Resource;
  action: Action;
  subjectType?: PrincipalType;
  context?: Context;
}

/** Result for listSubjects capability. */
export interface ListSubjectsResult {
  subjects: PrincipalRef[];
  meta: DecisionMeta;
  reasons?: Reason[];
}

/** Input for filterQuery capability. */
export interface FilterQueryInput<TQuery = unknown> {
  principal: Principal;
  resourceType: string;
  action: Action;
  context?: Context;
  query: TQuery;
}

/** Result for filterQuery capability. */
export interface FilterQueryResult<TQuery = unknown> {
  query: TQuery;
  meta: DecisionMeta;
  reasons?: Reason[];
}

/** Result for explain capability. */
export interface ExplainResult {
  decision: Decision;
  trace: DecisionTrace;
}

/** Engine interface contract for authorization. */
export interface AuthorizationEngine {
  readonly engine: string;
  readonly capabilities?: CapabilitySet;

  authorize(input: AuthorizationInput, options?: AuthorizationOptions): Promise<Decision>;
  batchAuthorize(inputs: AuthorizationInput[], options?: AuthorizationOptions): Promise<Decision[]>;

  listObjects?(input: ListObjectsInput, options?: AuthorizationOptions): Promise<ListObjectsResult>;
  listSubjects?(
    input: ListSubjectsInput,
    options?: AuthorizationOptions,
  ): Promise<ListSubjectsResult>;
  filterQuery?<TQuery = unknown>(
    input: FilterQueryInput<TQuery>,
    options?: AuthorizationOptions,
  ): Promise<FilterQueryResult<TQuery>>;
  explain?(input: AuthorizationInput, options?: AuthorizationOptions): Promise<ExplainResult>;
}

/** Mode for asserting tenant requirements. */
export type TenantAssertionMode = 'required' | 'optional';

/** Input shape for tenant assertions. */
export interface TenantAssertionInput {
  principal?: Pick<Principal, 'tenantId'>;
  context?: Pick<Context, 'tenantId'>;
}
