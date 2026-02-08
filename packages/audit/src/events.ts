/** JSON-compatible primitive values. */
export type JsonPrimitive = string | number | boolean | null;

/** JSON-compatible values used by audit payloads. */
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

/** JSON-compatible object type. */
export interface JsonObject {
  [key: string]: JsonValue;
}

/** Supported audit event type identifiers. */
export type AuditEventType =
  | 'PolicyPublished'
  | 'PolicyValidated'
  | 'RoleAssigned'
  | 'RoleRevoked'
  | 'RelationshipTupleWritten'
  | 'AuthorizationDecision';

/** Stable actor shape for audit attribution. */
export interface AuditActor {
  id: string;
  type: 'user' | 'service' | 'system';
  attrs?: JsonObject;
}

/** Shared envelope for all audit events. */
export interface AuditEventBase<TType extends AuditEventType, TPayload extends JsonObject> {
  eventType: TType;
  eventVersion: string;
  occurredAt: string;
  traceId?: string;
  tenantId?: string;
  actor?: AuditActor;
  payload: TPayload;
  metadata?: JsonObject;
}

/** Policy publication event. */
export type PolicyPublishedEvent = AuditEventBase<
  'PolicyPublished',
  {
    policyVersion: string;
    policyHash?: string;
    changeSummary?: string;
    source?: string;
  }
>;

/** Policy validation event. */
export type PolicyValidatedEvent = AuditEventBase<
  'PolicyValidated',
  {
    policyVersion?: string;
    policyHash?: string;
    valid: boolean;
    errorCount: number;
    warningCount: number;
    issues?: Array<{
      code: string;
      message: string;
      path?: string;
      severity?: 'error' | 'warning';
      details?: JsonValue;
    }>;
  }
>;

/** Role assignment event. */
export type RoleAssignedEvent = AuditEventBase<
  'RoleAssigned',
  {
    userId: string;
    role: string;
    assignedBy?: string;
    reason?: string;
    requestId?: string;
  }
>;

/** Role revocation event. */
export type RoleRevokedEvent = AuditEventBase<
  'RoleRevoked',
  {
    userId: string;
    role: string;
    revokedBy?: string;
    reason?: string;
    requestId?: string;
  }
>;

/** ReBAC relationship tuple mutation event. */
export type RelationshipTupleWrittenEvent = AuditEventBase<
  'RelationshipTupleWritten',
  {
    operation: 'write' | 'delete';
    tuple: {
      objectType: string;
      objectId: string;
      relation: string;
      subjectType: string;
      subjectId: string;
      subjectRelation?: string;
    };
  }
>;

/** Authorization decision event (optionally sampled by caller). */
export type AuthorizationDecisionEvent = AuditEventBase<
  'AuthorizationDecision',
  {
    sampled?: boolean;
    principal: {
      id: string;
      type: 'user' | 'service';
    };
    action: {
      name: string;
      fields?: string[];
    };
    resource: {
      type: string;
      id?: string;
    };
    decision: {
      allow: boolean;
      reasons: Array<{
        code: string;
        message: string;
        details?: JsonValue;
      }>;
      obligations: Array<{
        type: string;
        payload?: JsonValue;
      }>;
      engine: string;
      policyVersion?: string;
      policyHash?: string;
      evaluatedAt: string;
    };
  }
>;

/** Discriminated union for all supported audit events. */
export type AuditEvent =
  | PolicyPublishedEvent
  | PolicyValidatedEvent
  | RoleAssignedEvent
  | RoleRevokedEvent
  | RelationshipTupleWrittenEvent
  | AuthorizationDecisionEvent;
