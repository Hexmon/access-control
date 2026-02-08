import type { Diagnostic } from '@hexmon_tech/compiler';
import { compilePolicySet } from '@hexmon_tech/compiler';
import type { PolicySet } from '@hexmon_tech/policy-dsl';
import { validatePolicySet } from '@hexmon_tech/policy-dsl';

import { readJson, resolvePath } from '../fs';

export interface CommandIO {
  out(message: string): void;
  err(message: string): void;
}

export interface CommandContext {
  cwd: string;
  io: CommandIO;
}

export interface PreparedPolicy {
  policyPath: string;
  rawPolicy: unknown;
  policySet: PolicySet;
}

export interface ValidationAndCompileResult {
  ok: boolean;
  diagnostics: Diagnostic[];
  policySet?: PolicySet;
}

export async function loadPolicy(
  inputPath: string,
  context: CommandContext,
): Promise<PreparedPolicy> {
  const policyPath = resolvePath(inputPath, context.cwd);
  const rawPolicy = await readJson<unknown>(policyPath);

  return {
    policyPath,
    rawPolicy,
    policySet: rawPolicy as PolicySet,
  };
}

export function validateAndCompile(
  rawPolicy: unknown,
  mode: 'single-tenant' | 'multi-tenant',
): ValidationAndCompileResult {
  const schemaValidation = validatePolicySet(rawPolicy);
  if (!schemaValidation.ok) {
    return {
      ok: false,
      diagnostics: schemaValidation.errors.map((error) => ({
        level: 'error',
        code: `SCHEMA_${error.keyword.toUpperCase()}`,
        message: `${error.path}: ${error.message}`,
      })),
    };
  }

  const { diagnostics } = compilePolicySet(rawPolicy as PolicySet, { mode });
  const hasErrors = diagnostics.some((diagnostic) => diagnostic.level === 'error');

  return {
    ok: !hasErrors,
    diagnostics,
    policySet: rawPolicy as PolicySet,
  };
}

export function printDiagnostics(diagnostics: Diagnostic[], context: CommandContext): void {
  const sorted = [...diagnostics].sort((a, b) => {
    if (a.level !== b.level) {
      return a.level === 'error' ? -1 : 1;
    }

    if (a.code < b.code) {
      return -1;
    }

    if (a.code > b.code) {
      return 1;
    }

    const aRule = a.ruleId ?? '';
    const bRule = b.ruleId ?? '';
    return aRule.localeCompare(bRule);
  });

  for (const diagnostic of sorted) {
    const prefix = diagnostic.level === 'error' ? 'ERROR' : 'WARN';
    const rule = diagnostic.ruleId ? ` [rule:${diagnostic.ruleId}]` : '';
    context.io.err(`${prefix} ${diagnostic.code}${rule} ${diagnostic.message}`);
  }
}

export function createDefaultContext(cwd = process.cwd()): CommandContext {
  return {
    cwd,
    io: {
      out: (message: string): void => {
        process.stdout.write(`${message}\n`);
      },
      err: (message: string): void => {
        process.stderr.write(`${message}\n`);
      },
    },
  };
}
