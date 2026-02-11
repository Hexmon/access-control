import { Command, CommanderError } from 'commander';

import { runDiffCommand } from './commands/diff';
import { runInitCommand } from './commands/init';
import type { CommandContext } from './commands/shared';
import { createDefaultContext } from './commands/shared';
import { runTestCommand } from './commands/test';
import { runTypesCommand } from './commands/types';
import { runValidateCommand } from './commands/validate';

export const EXIT_SUCCESS = 0;
export const EXIT_FAILURE = 1;
export const EXIT_USAGE = 2;

export interface CliRunOptions {
  cwd?: string;
  stdout?: NodeJS.WriteStream;
  stderr?: NodeJS.WriteStream;
}

/** Build the @hexmon_tech command-line program. */
export function createProgram(
  setExitCode: (code: number) => void,
  context: CommandContext,
): Command {
  const program = new Command();

  program
    .name('acx')
    .description('@hexmon_tech policy CLI utilities')
    .showHelpAfterError()
    .exitOverride();

  program
    .command('init')
    .description('Scaffold a starter policy and golden tests')
    .option('--dir <dir>', 'Target directory', '.')
    .option('--force', 'Overwrite existing scaffold files', false)
    .action(async (options: { dir: string; force: boolean }): Promise<void> => {
      setExitCode(
        await runInitCommand({
          dir: options.dir,
          force: options.force,
          context,
        }),
      );
    });

  program
    .command('validate')
    .description('Validate and compile a policy file')
    .argument('<policyFile>', 'Path to policy JSON file')
    .option('--mode <mode>', 'Compilation mode: single-tenant|multi-tenant', 'single-tenant')
    .action(async (policyFile: string, options: { mode: string }): Promise<void> => {
      const mode = parseMode(options.mode);
      setExitCode(
        await runValidateCommand({
          policyPath: policyFile,
          mode,
          context,
        }),
      );
    });

  program
    .command('types')
    .description('Generate TypeScript types from a policy file')
    .argument('<policyFile>', 'Path to policy JSON file')
    .requiredOption('--out <file>', 'Output TS file path')
    .option('--mode <mode>', 'Compilation mode: single-tenant|multi-tenant', 'single-tenant')
    .action(async (policyFile: string, options: { out: string; mode: string }): Promise<void> => {
      const mode = parseMode(options.mode);
      setExitCode(
        await runTypesCommand({
          policyPath: policyFile,
          outPath: options.out,
          mode,
          context,
        }),
      );
    });

  program
    .command('test')
    .description('Run golden policy tests from JSON cases')
    .argument('<testsFolder>', 'Folder containing policy tests')
    .option('--policy <file>', 'Policy file path (defaults to <testsFolder>/policy.json)')
    .option('--mode <mode>', 'Engine mode: single-tenant|multi-tenant', 'single-tenant')
    .action(
      async (testsFolder: string, options: { policy?: string; mode: string }): Promise<void> => {
        const mode = parseMode(options.mode);
        setExitCode(
          await runTestCommand({
            testsFolder,
            mode,
            context,
            ...(options.policy !== undefined ? { policyPath: options.policy } : {}),
          }),
        );
      },
    );

  program
    .command('diff')
    .description('Show a summary of policy changes')
    .argument('<oldPolicy>', 'Old policy JSON file')
    .argument('<newPolicy>', 'New policy JSON file')
    .option('--mode <mode>', 'Compilation mode: single-tenant|multi-tenant', 'single-tenant')
    .action(
      async (oldPolicy: string, newPolicy: string, options: { mode: string }): Promise<void> => {
        const mode = parseMode(options.mode);
        setExitCode(
          await runDiffCommand({
            oldPolicyPath: oldPolicy,
            newPolicyPath: newPolicy,
            mode,
            context,
          }),
        );
      },
    );

  return program;
}

/** Run CLI program and return process-style exit code without exiting process. */
export async function runCli(
  argv: string[] = process.argv,
  options: CliRunOptions = {},
): Promise<number> {
  const cwd = options.cwd ?? process.cwd();
  let exitCode = EXIT_SUCCESS;

  const context = createDefaultContext(cwd);
  if (options.stdout) {
    context.io.out = (message: string): void => {
      options.stdout?.write(`${message}\n`);
    };
  }
  if (options.stderr) {
    context.io.err = (message: string): void => {
      options.stderr?.write(`${message}\n`);
    };
  }

  const program = createProgram((code) => {
    exitCode = code;
  }, context);

  try {
    await program.parseAsync(argv, { from: 'node' });
    return exitCode;
  } catch (error) {
    if (error instanceof CommanderError) {
      context.io.err(error.message);
      return EXIT_USAGE;
    }

    if (error instanceof Error) {
      context.io.err(error.message);
      return EXIT_FAILURE;
    }

    context.io.err('Unknown CLI error.');
    return EXIT_FAILURE;
  }
}

function parseMode(value: string): 'single-tenant' | 'multi-tenant' {
  if (value === 'single-tenant' || value === 'multi-tenant') {
    return value;
  }

  throw new CommanderError(
    EXIT_USAGE,
    'ACX_INVALID_MODE',
    `Invalid --mode value: ${value}. Expected single-tenant or multi-tenant.`,
  );
}

export { runDiffCommand, runInitCommand, runTestCommand, runTypesCommand, runValidateCommand };
