import path from 'node:path';

import { stableStringify } from '@hexmon_tech/compiler';
import { compilePolicySet } from '@hexmon_tech/compiler';
import { EmbeddedEngine } from '@hexmon_tech/engine-embedded';
import type { AuthorizationInput, Obligation } from '@hexmon_tech/core';

import { listFilesRecursive, readJson, resolvePath } from '../fs';
import type { CommandContext } from './shared';
import { printDiagnostics, validateAndCompile } from './shared';

export interface GoldenCase {
  name: string;
  input: AuthorizationInput;
  expectedAllow: boolean;
  expectedObligations?: Obligation[];
  expectedErrorCode?: string;
}

export interface TestCommandOptions {
  testsFolder: string;
  policyPath?: string;
  mode?: 'single-tenant' | 'multi-tenant';
  context: CommandContext;
}

/** Execute golden authorization tests from JSON files. */
export async function runTestCommand(options: TestCommandOptions): Promise<number> {
  const mode = options.mode ?? 'single-tenant';
  const testsRoot = resolvePath(options.testsFolder, options.context.cwd);
  const policyPath = options.policyPath
    ? resolvePath(options.policyPath, options.context.cwd)
    : path.join(testsRoot, 'policy.json');

  const rawPolicy = await readJson<unknown>(policyPath);
  const prepared = validateAndCompile(rawPolicy, mode);

  if (prepared.diagnostics.length > 0) {
    printDiagnostics(prepared.diagnostics, options.context);
  }

  if (!prepared.ok || !prepared.policySet) {
    options.context.io.err(`Cannot run tests because policy is invalid: ${policyPath}`);
    return 1;
  }

  const { ir } = compilePolicySet(prepared.policySet, { mode });
  const engine = new EmbeddedEngine({ mode });
  engine.setPolicy(ir);

  const casesDirectory = await resolveCasesDirectory(testsRoot);
  const caseFiles = (await listFilesRecursive(casesDirectory))
    .filter((filePath) => filePath.endsWith('.json'))
    .sort();

  if (caseFiles.length === 0) {
    options.context.io.err(`No JSON test cases found under ${casesDirectory}`);
    return 1;
  }

  let passed = 0;
  let failed = 0;

  for (const caseFile of caseFiles) {
    const parsed = await readJson<GoldenCase>(caseFile);
    const testCase = normalizeCase(parsed, caseFile);

    const result = await runSingleCase(engine, testCase);

    if (result.ok) {
      passed += 1;
      options.context.io.out(`PASS ${testCase.name}`);
      continue;
    }

    failed += 1;
    options.context.io.err(
      `FAIL ${testCase.name} (${path.relative(options.context.cwd, caseFile)})`,
    );
    options.context.io.err(`  ${result.message}`);
  }

  options.context.io.out(`Summary: passed=${passed} failed=${failed} total=${passed + failed}`);

  return failed > 0 ? 1 : 0;
}

async function resolveCasesDirectory(testsRoot: string): Promise<string> {
  const nested = path.join(testsRoot, 'tests');
  try {
    await listFilesRecursive(nested);
    return nested;
  } catch {
    return testsRoot;
  }
}

function normalizeCase(testCase: GoldenCase, fallbackName: string): GoldenCase {
  return {
    ...testCase,
    name: testCase.name && testCase.name.length > 0 ? testCase.name : path.basename(fallbackName),
  };
}

async function runSingleCase(
  engine: EmbeddedEngine,
  testCase: GoldenCase,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const decision = await engine.authorize(testCase.input);

    if (testCase.expectedErrorCode) {
      return {
        ok: false,
        message: `Expected error ${testCase.expectedErrorCode} but got decision allow=${decision.allow}`,
      };
    }

    if (decision.allow !== testCase.expectedAllow) {
      return {
        ok: false,
        message: `Expected allow=${testCase.expectedAllow} but got allow=${decision.allow}`,
      };
    }

    if (testCase.expectedObligations) {
      const expected = stableStringify(testCase.expectedObligations);
      const actual = stableStringify(decision.obligations);
      if (expected !== actual) {
        return {
          ok: false,
          message: `Expected obligations=${expected} but got ${actual}`,
        };
      }
    }

    return { ok: true };
  } catch (error) {
    if (!testCase.expectedErrorCode) {
      if (error instanceof Error) {
        return { ok: false, message: `Unexpected error: ${error.message}` };
      }

      return { ok: false, message: 'Unexpected unknown error.' };
    }

    const code = getErrorCode(error);
    if (code !== testCase.expectedErrorCode) {
      return {
        ok: false,
        message: `Expected error code ${testCase.expectedErrorCode} but got ${code ?? 'unknown'}`,
      };
    }

    return { ok: true };
  }
}

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const code = (error as Record<string, unknown>)['code'];
  return typeof code === 'string' ? code : undefined;
}
