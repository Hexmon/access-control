import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { CommandContext } from '../src/commands/shared';

export function createTestContext(cwd: string): {
  context: CommandContext;
  stdout: string[];
  stderr: string[];
} {
  const stdout: string[] = [];
  const stderr: string[] = [];

  return {
    context: {
      cwd,
      io: {
        out: (message: string): void => {
          stdout.push(message);
        },
        err: (message: string): void => {
          stderr.push(message);
        },
      },
    },
    stdout,
    stderr,
  };
}

export async function createTempDir(prefix = 'acx-cli-test-'): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), prefix));
}

export function repoRootFromTest(metaUrl: string): string {
  return path.resolve(path.dirname(fileURLToPath(metaUrl)), '../../..');
}
