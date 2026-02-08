import type {
  RebacCallOptions,
  RebacCheckInput,
  RebacCheckResult,
  RebacListObjectsInput,
  RebacListObjectsResult,
  RebacListSubjectsInput,
  RebacListSubjectsResult,
  RelationshipTuple,
} from './types';

/** ReBAC adapter contract used by policy engines and integrations. */
export interface RebacAdapter {
  writeTuples(tuples: RelationshipTuple[], options?: RebacCallOptions): Promise<void>;
  check(input: RebacCheckInput, options?: RebacCallOptions): Promise<RebacCheckResult>;
  listObjects?(
    input: RebacListObjectsInput,
    options?: RebacCallOptions,
  ): Promise<RebacListObjectsResult>;
  listSubjects?(
    input: RebacListSubjectsInput,
    options?: RebacCallOptions,
  ): Promise<RebacListSubjectsResult>;
}
