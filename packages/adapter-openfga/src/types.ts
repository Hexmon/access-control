/** OpenFGA tuple-key request shape. */
export interface OpenFgaTupleKey {
  user: string;
  relation: string;
  object: string;
}

/** OpenFGA tuple write request shape. */
export interface OpenFgaWriteTuplesRequest {
  storeId?: string;
  authorizationModelId?: string;
  tenantId?: string;
  writes: {
    tuple_keys: OpenFgaTupleKey[];
  };
}

/** OpenFGA tuple write response shape. */
export interface OpenFgaWriteTuplesResponse {
  writtenCount?: number;
  raw?: unknown;
}

/** OpenFGA check request shape. */
export interface OpenFgaCheckRequest {
  storeId?: string;
  authorizationModelId?: string;
  tenantId?: string;
  tuple_key: OpenFgaTupleKey;
  contextual_tuples?: {
    tuple_keys: OpenFgaTupleKey[];
  };
}

/** OpenFGA check response shape. */
export interface OpenFgaCheckResponse {
  allowed: boolean;
  trace?: unknown;
  raw?: unknown;
}

/** OpenFGA list-objects request shape. */
export interface OpenFgaListObjectsRequest {
  storeId?: string;
  authorizationModelId?: string;
  tenantId?: string;
  user: string;
  relation: string;
  type: string;
}

/** OpenFGA list-objects response shape. */
export interface OpenFgaListObjectsResponse {
  objects: string[];
  trace?: unknown;
  raw?: unknown;
}

/** OpenFGA list-subjects request shape. */
export interface OpenFgaListSubjectsRequest {
  storeId?: string;
  authorizationModelId?: string;
  tenantId?: string;
  object: string;
  relation: string;
  subjectType: string;
}

/** OpenFGA list-subjects response shape. */
export interface OpenFgaListSubjectsResponse {
  subjects: string[];
  trace?: unknown;
  raw?: unknown;
}
