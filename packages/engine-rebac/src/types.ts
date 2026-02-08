/** Object reference for relationship tuples. */
export interface RelationshipObject {
  type: string;
  id: string;
}

/** Subject reference for relationship tuples. */
export interface RelationshipSubject {
  type: string;
  id: string;
  relation?: string;
}

/** Relationship tuple persisted by ReBAC adapters. */
export interface RelationshipTuple {
  object: RelationshipObject;
  relation: string;
  subject: RelationshipSubject;
  tenantId?: string;
}

/** Shared call options for ReBAC adapter operations. */
export interface RebacCallOptions {
  traceId?: string;
  tenantId?: string;
}

/** Input for ReBAC permission checks. */
export interface RebacCheckInput {
  object: RelationshipObject;
  relation: string;
  subject: RelationshipSubject;
  tenantId?: string;
  contextualTuples?: RelationshipTuple[];
}

/** Result for ReBAC permission checks. */
export interface RebacCheckResult {
  allow: boolean;
  trace?: unknown;
}

/** Input for optional object listing capability. */
export interface RebacListObjectsInput {
  objectType: string;
  relation: string;
  subject: RelationshipSubject;
  tenantId?: string;
  limit?: number;
}

/** Result for optional object listing capability. */
export interface RebacListObjectsResult {
  objects: RelationshipObject[];
  trace?: unknown;
}

/** Input for optional subject listing capability. */
export interface RebacListSubjectsInput {
  object: RelationshipObject;
  relation: string;
  subjectType: string;
  tenantId?: string;
  limit?: number;
}

/** Result for optional subject listing capability. */
export interface RebacListSubjectsResult {
  subjects: RelationshipSubject[];
  trace?: unknown;
}
