import path from 'node:path';

import { ensureDir, pathExists, resolvePath, writeFileAtomic } from '../fs';
import type { CommandContext } from './shared';

export interface InitCommandOptions {
  dir?: string;
  force?: boolean;
  context: CommandContext;
}

/** Scaffold a starter policy and golden-test folder. */
export async function runInitCommand(options: InitCommandOptions): Promise<number> {
  const targetDir = resolvePath(options.dir ?? '.', options.context.cwd);

  const policyPath = path.join(targetDir, 'policy.json');
  const testsRoot = path.join(targetDir, 'policy-tests');
  const testsPolicyPath = path.join(testsRoot, 'policy.json');
  const casesDir = path.join(testsRoot, 'tests');
  const allowCase = path.join(casesDir, 'allow-read.json');
  const denyCase = path.join(casesDir, 'deny-delete.json');

  const plannedFiles = [policyPath, testsPolicyPath, allowCase, denyCase];

  if (!options.force) {
    for (const filePath of plannedFiles) {
      if (await pathExists(filePath)) {
        options.context.io.err(`Refusing to overwrite existing file: ${filePath}`);
        options.context.io.err('Re-run with --force to overwrite scaffold files.');
        return 1;
      }
    }
  }

  await ensureDir(targetDir);
  await ensureDir(testsRoot);
  await ensureDir(casesDir);

  const policyContent = JSON.stringify(createStarterPolicy(), null, 2);

  await writeFileAtomic(policyPath, `${policyContent}\n`);
  await writeFileAtomic(testsPolicyPath, `${policyContent}\n`);
  await writeFileAtomic(allowCase, `${JSON.stringify(createAllowCase(), null, 2)}\n`);
  await writeFileAtomic(denyCase, `${JSON.stringify(createDenyCase(), null, 2)}\n`);

  options.context.io.out(`Scaffolded policy at ${policyPath}`);
  options.context.io.out(`Scaffolded golden tests at ${testsRoot}`);
  options.context.io.out('');
  options.context.io.out('README snippet:');
  options.context.io.out('  hexmon_tech validate policy.json');
  options.context.io.out('  hexmon_tech test policy-tests --mode single-tenant');
  options.context.io.out('  hexmon_tech types policy.json --out src/policy-types.ts');

  return 0;
}

function createStarterPolicy(): Record<string, unknown> {
  return {
    policyVersion: '1.0.0',
    rules: [
      {
        id: 'allow-post-read',
        effect: 'allow',
        actions: ['post:read'],
        resourceTypes: ['post'],
        priority: 20,
      },
      {
        id: 'deny-post-delete',
        effect: 'deny',
        actions: ['post:delete'],
        resourceTypes: ['post'],
        priority: 100,
      },
    ],
  };
}

function createAllowCase(): Record<string, unknown> {
  return {
    name: 'allow read',
    input: {
      principal: { id: 'u1', type: 'user', tenantId: 'tenant-a' },
      resource: { type: 'post', id: 'p1' },
      action: { name: 'post:read' },
      context: { tenantId: 'tenant-a' },
    },
    expectedAllow: true,
  };
}

function createDenyCase(): Record<string, unknown> {
  return {
    name: 'deny delete',
    input: {
      principal: { id: 'u1', type: 'user', tenantId: 'tenant-a' },
      resource: { type: 'post', id: 'p1' },
      action: { name: 'post:delete' },
      context: { tenantId: 'tenant-a' },
    },
    expectedAllow: false,
  };
}
