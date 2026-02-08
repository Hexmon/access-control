import path from 'node:path';
import { access } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { runInitCommand } from '../src/commands/init';
import { createTempDir, createTestContext } from './helpers';

describe('init command', () => {
  it('scaffolds starter policy and tests', async () => {
    const tempDir = await createTempDir();
    const { context } = createTestContext(tempDir);

    const code = await runInitCommand({ context });

    expect(code).toBe(0);

    await expect(access(path.join(tempDir, 'policy.json'))).resolves.not.toThrow();
    await expect(access(path.join(tempDir, 'policy-tests/policy.json'))).resolves.not.toThrow();
    await expect(
      access(path.join(tempDir, 'policy-tests/tests/allow-read.json')),
    ).resolves.not.toThrow();
  });

  it('fails when files exist and force is false', async () => {
    const tempDir = await createTempDir();
    const { context } = createTestContext(tempDir);

    const first = await runInitCommand({ context });
    const second = await runInitCommand({ context });

    expect(first).toBe(0);
    expect(second).toBe(1);
  });
});
