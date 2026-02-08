import type { CommandContext } from './shared';
import { loadPolicy, printDiagnostics, validateAndCompile } from './shared';

export interface ValidateCommandOptions {
  policyPath: string;
  mode?: 'single-tenant' | 'multi-tenant';
  context: CommandContext;
}

/** Validate and compile a policy, printing diagnostics and returning process-style exit code. */
export async function runValidateCommand(options: ValidateCommandOptions): Promise<number> {
  const mode = options.mode ?? 'single-tenant';
  const loaded = await loadPolicy(options.policyPath, options.context);

  const result = validateAndCompile(loaded.rawPolicy, mode);
  if (result.diagnostics.length > 0) {
    printDiagnostics(result.diagnostics, options.context);
  }

  if (!result.ok || !result.policySet) {
    options.context.io.err(`Validation failed for ${loaded.policyPath}`);
    return 1;
  }

  const warningCount = result.diagnostics.filter((item) => item.level === 'warning').length;
  const errorCount = result.diagnostics.filter((item) => item.level === 'error').length;

  options.context.io.out(
    `Validated ${loaded.policyPath} (errors=${errorCount}, warnings=${warningCount})`,
  );

  return errorCount > 0 ? 1 : 0;
}
