import type {
  OpenFgaCheckRequest,
  OpenFgaCheckResponse,
  OpenFgaListObjectsRequest,
  OpenFgaListObjectsResponse,
  OpenFgaListSubjectsRequest,
  OpenFgaListSubjectsResponse,
  OpenFgaWriteTuplesRequest,
  OpenFgaWriteTuplesResponse,
} from './types';

/** Lightweight, mockable client contract for OpenFGA interactions. */
export interface OpenFgaClient {
  writeTuples(request: OpenFgaWriteTuplesRequest): Promise<OpenFgaWriteTuplesResponse>;
  check(request: OpenFgaCheckRequest): Promise<OpenFgaCheckResponse>;
  listObjects?(request: OpenFgaListObjectsRequest): Promise<OpenFgaListObjectsResponse>;
  listSubjects?(request: OpenFgaListSubjectsRequest): Promise<OpenFgaListSubjectsResponse>;
}
