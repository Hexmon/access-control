import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { runTestCommand } from '../src/commands/test';
import { createTempDir, createTestContext, repoRootFromTest } from './helpers';

describe('test command', () => {
  it('runs passing example golden tests', async () => {
    const repoRoot = repoRootFromTest(import.meta.url);
    const { context, stdout } = createTestContext(repoRoot);

    const code = await runTestCommand({
      testsFolder: 'examples/policy-tests/basic',
      context,
    });

    expect(code).toBe(0);
    expect(stdout.some((line) => line.startsWith('Summary:'))).toBe(true);
  });

  it('returns non-zero when a golden case mismatches', async () => {
    const tempDir = await createTempDir();
    const testsDir = path.join(tempDir, 'tests');
    const policyPath = path.join(tempDir, 'policy.json');
    const casePath = path.join(testsDir, 'mismatch.json');

    await mkdir(testsDir, { recursive: true });

    await writeFile(
      policyPath,
      JSON.stringify(
        {
          policyVersion: '1.0.0',
          rules: [
            {
              id: 'allow-read',
              effect: 'allow',
              actions: ['doc:read'],
              resourceTypes: ['doc']
            }
          ]
        },
        null,
        2,
      ),
      'utf8',
    );

    await writeFile(
      casePath,
      JSON.stringify(
        {
          name: 'mismatch case',
          input: {
            principal: { id: 'u1', type: 'user', tenantId: 't1' },
            resource: { type: 'doc', id: 'd1' },
            action: { name: 'doc:read' },
            context: { tenantId: 't1' }
          },
          expectedAllow: false
        },
        null,
        2,
      ),
      'utf8',
    );

    const { context, stderr } = createTestContext(tempDir);

    const code = await runTestCommand({
      testsFolder: tempDir,
      context,
    });

    expect(code).toBe(1);
    expect(stderr.some((line) => line.startsWith('FAIL'))).toBe(true);
  });

  it('handles expected MissingTenantError in multi-tenant mode', async () => {
    const repoRoot = repoRootFromTest(import.meta.url);
    const { context } = createTestContext(repoRoot);

    const code = await runTestCommand({
      testsFolder: 'examples/policy-tests/multi-tenant',
      mode: 'multi-tenant',
      context,
    });

    expect(code).toBe(0);
  });
});
