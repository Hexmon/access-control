import { describe, expect, it } from 'vitest';

import { runDiffCommand } from '../src/commands/diff';
import { createTestContext, repoRootFromTest } from './helpers';

describe('diff command', () => {
  it('prints a summary for example policy differences', async () => {
    const repoRoot = repoRootFromTest(import.meta.url);
    const { context, stdout } = createTestContext(repoRoot);

    const code = await runDiffCommand({
      oldPolicyPath: 'examples/policies/basic.policy.json',
      newPolicyPath: 'examples/policies/multi-tenant.policy.json',
      mode: 'multi-tenant',
      context,
    });

    expect(code).toBe(0);
    expect(stdout.some((line) => line === 'Rules:')).toBe(true);
    expect(stdout.some((line) => line.includes('added rule'))).toBe(true);
    expect(stdout.some((line) => line.includes('removed rule'))).toBe(true);
    expect(stdout.some((line) => line === 'Constraints:')).toBe(true);
  });
});
