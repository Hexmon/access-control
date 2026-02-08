import path from 'node:path';
import { writeFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { runValidateCommand } from '../src/commands/validate';
import { createTempDir, createTestContext, repoRootFromTest } from './helpers';

describe('validate command', () => {
  it('validates a valid example policy', async () => {
    const repoRoot = repoRootFromTest(import.meta.url);
    const { context, stdout } = createTestContext(repoRoot);

    const code = await runValidateCommand({
      policyPath: 'examples/policies/basic.policy.json',
      context,
    });

    expect(code).toBe(0);
    expect(stdout.some((line) => line.includes('Validated'))).toBe(true);
  });

  it('returns non-zero for invalid policy', async () => {
    const tempDir = await createTempDir();
    const invalidPath = path.join(tempDir, 'invalid.policy.json');

    await writeFile(
      invalidPath,
      JSON.stringify(
        {
          policyVersion: '1.0.0',
          rules: [
            {
              id: '',
              effect: 'allow',
              actions: [],
              resourceTypes: ['post']
            }
          ]
        },
        null,
        2,
      ),
      'utf8',
    );

    const { context, stderr } = createTestContext(tempDir);

    const code = await runValidateCommand({
      policyPath: invalidPath,
      context,
    });

    expect(code).toBe(1);
    expect(stderr.some((line) => line.includes('Validation failed'))).toBe(true);
  });
});
