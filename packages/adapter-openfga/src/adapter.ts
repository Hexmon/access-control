import type {
  RebacAdapter,
  RebacCallOptions,
  RebacCheckInput,
  RebacCheckResult,
  RebacListObjectsInput,
  RebacListObjectsResult,
  RebacListSubjectsInput,
  RebacListSubjectsResult,
  RelationshipSubject,
  RelationshipTuple,
} from '@hexmon_tech/engine-rebac';

import type { OpenFgaClient } from './client';
import type {
  OpenFgaCheckRequest,
  OpenFgaListObjectsRequest,
  OpenFgaListSubjectsRequest,
  OpenFgaTupleKey,
  OpenFgaWriteTuplesRequest,
} from './types';

/** Options for the OpenFGA adapter wrapper. */
export interface OpenFgaRebacAdapterOptions {
  storeId?: string;
  authorizationModelId?: string;
}

/** Mockable OpenFGA-backed ReBAC adapter skeleton. */
export class OpenFgaRebacAdapter implements RebacAdapter {
  private readonly client: OpenFgaClient;
  private readonly options: OpenFgaRebacAdapterOptions;

  constructor(client: OpenFgaClient, options: OpenFgaRebacAdapterOptions = {}) {
    this.client = client;
    this.options = options;
  }

  public async writeTuples(tuples: RelationshipTuple[], options?: RebacCallOptions): Promise<void> {
    const tenantId = tuples[0]?.tenantId ?? options?.tenantId;
    const request: OpenFgaWriteTuplesRequest = {
      ...this.requestContext(tenantId),
      writes: {
        tuple_keys: tuples.map(toTupleKey),
      },
    };

    await this.client.writeTuples(request);
  }

  public async check(
    input: RebacCheckInput,
    options?: RebacCallOptions,
  ): Promise<RebacCheckResult> {
    const request: OpenFgaCheckRequest = {
      ...this.requestContext(input.tenantId ?? options?.tenantId),
      tuple_key: toTupleKey({
        object: input.object,
        relation: input.relation,
        subject: input.subject,
      }),
    };

    if (input.contextualTuples && input.contextualTuples.length > 0) {
      request.contextual_tuples = {
        tuple_keys: input.contextualTuples.map(toTupleKey),
      };
    }

    const response = await this.client.check(request);
    return {
      allow: response.allowed,
      trace: response.trace ?? response.raw,
    };
  }

  public async listObjects(
    input: RebacListObjectsInput,
    options?: RebacCallOptions,
  ): Promise<RebacListObjectsResult> {
    if (!this.client.listObjects) {
      return { objects: [] };
    }

    const request: OpenFgaListObjectsRequest = {
      ...this.requestContext(input.tenantId ?? options?.tenantId),
      user: toSubject(input.subject),
      relation: input.relation,
      type: input.objectType,
    };

    const response = await this.client.listObjects(request);

    return {
      objects: response.objects
        .map(parseObject)
        .filter((object): object is { type: string; id: string } => object !== null),
      trace: response.trace ?? response.raw,
    };
  }

  public async listSubjects(
    input: RebacListSubjectsInput,
    options?: RebacCallOptions,
  ): Promise<RebacListSubjectsResult> {
    if (!this.client.listSubjects) {
      return { subjects: [] };
    }

    const request: OpenFgaListSubjectsRequest = {
      ...this.requestContext(input.tenantId ?? options?.tenantId),
      object: `${input.object.type}:${input.object.id}`,
      relation: input.relation,
      subjectType: input.subjectType,
    };

    const response = await this.client.listSubjects(request);

    return {
      subjects: response.subjects
        .map(parseSubject)
        .filter((subject): subject is RelationshipSubject => subject !== null),
      trace: response.trace ?? response.raw,
    };
  }

  private requestContext(
    tenantId?: string,
  ): Pick<OpenFgaWriteTuplesRequest, 'storeId' | 'authorizationModelId' | 'tenantId'> {
    const requestContext: Pick<
      OpenFgaWriteTuplesRequest,
      'storeId' | 'authorizationModelId' | 'tenantId'
    > = {};

    if (this.options.storeId !== undefined) {
      requestContext.storeId = this.options.storeId;
    }
    if (this.options.authorizationModelId !== undefined) {
      requestContext.authorizationModelId = this.options.authorizationModelId;
    }
    if (tenantId !== undefined) {
      requestContext.tenantId = tenantId;
    }

    return requestContext;
  }
}

function toTupleKey(tuple: {
  object: { type: string; id: string };
  relation: string;
  subject: RelationshipSubject;
}): OpenFgaTupleKey {
  return {
    object: `${tuple.object.type}:${tuple.object.id}`,
    relation: tuple.relation,
    user: toSubject(tuple.subject),
  };
}

function toSubject(subject: RelationshipSubject): string {
  const base = `${subject.type}:${subject.id}`;
  return subject.relation ? `${base}#${subject.relation}` : base;
}

function parseObject(value: string): { type: string; id: string } | null {
  const separator = value.indexOf(':');
  if (separator <= 0 || separator === value.length - 1) {
    return null;
  }

  return {
    type: value.slice(0, separator),
    id: value.slice(separator + 1),
  };
}

function parseSubject(value: string): RelationshipSubject | null {
  const separator = value.indexOf(':');
  if (separator <= 0 || separator === value.length - 1) {
    return null;
  }

  const type = value.slice(0, separator);
  const rest = value.slice(separator + 1);
  const relationSep = rest.indexOf('#');

  if (relationSep === -1) {
    return {
      type,
      id: rest,
    };
  }

  if (relationSep === 0 || relationSep === rest.length - 1) {
    return null;
  }

  return {
    type,
    id: rest.slice(0, relationSep),
    relation: rest.slice(relationSep + 1),
  };
}
