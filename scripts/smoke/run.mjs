import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

function runNode(args, cwd, env = {}) {
  execFileSync('node', args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'inherit',
  });
}

async function main() {
  const cwd = process.cwd();
  const packageContext = resolve(cwd, 'packages/engine-embedded');

  runNode(
    [
      '--input-type=module',
      '-e',
      "import { normalizeFields } from '@hexmon_tech/core'; const out = JSON.stringify(normalizeFields(['b','a','a'])); if (out !== JSON.stringify(['a','b'])) throw new Error('esm core failed');",
    ],
    packageContext,
  );

  runNode(
    [
      '-e',
      "const { normalizeFields } = require('@hexmon_tech/core'); const out = JSON.stringify(normalizeFields(['z','y','y'])); if (out !== JSON.stringify(['y','z'])) throw new Error('cjs core failed');",
    ],
    packageContext,
  );

  const policyPath = resolve(cwd, 'examples/policies/basic.policy.json');

  runNode(
    [
      '--input-type=module',
      '-e',
      "import fs from 'node:fs'; import { validatePolicySet } from '@hexmon_tech/policy-dsl'; import { compilePolicySet } from '@hexmon_tech/compiler'; import { EmbeddedEngine } from '@hexmon_tech/engine-embedded'; const policy = JSON.parse(fs.readFileSync(process.env.ACX_POLICY, 'utf8')); const valid = validatePolicySet(policy); if (!valid.ok) throw new Error('policy invalid'); const { ir, diagnostics } = compilePolicySet(policy, { mode: 'single-tenant' }); if (diagnostics.some((d) => d.level === 'error')) throw new Error('compile errors'); const engine = new EmbeddedEngine({ mode: 'single-tenant' }); engine.setPolicy(ir); const allow = await engine.authorize({ principal: { id: 'u1', type: 'user', tenantId: 'tenant-a' }, resource: { type: 'post', id: 'p1' }, action: { name: 'post:read' }, context: { tenantId: 'tenant-a' } }); const deny = await engine.authorize({ principal: { id: 'u1', type: 'user', tenantId: 'tenant-a' }, resource: { type: 'post', id: 'p1' }, action: { name: 'post:delete' }, context: { tenantId: 'tenant-a' } }); if (!allow.allow || deny.allow) throw new Error('engine smoke failed');",
    ],
    packageContext,
    { ACX_POLICY: policyPath },
  );

  const cliPath = resolve(cwd, 'packages/cli/dist/bin.cjs');
  runNode([cliPath, 'validate', 'examples/policies/basic.policy.json'], cwd);

  const tempDir = mkdtempSync(join(tmpdir(), 'hexmon-cli-smoke-'));
  try {
    const typesOut = join(tempDir, 'policy-types.ts');
    runNode([cliPath, 'types', 'examples/policies/basic.policy.json', '--out', typesOut], cwd);
    runNode(
      [
        cliPath,
        'test',
        'examples/policy-tests/basic',
        '--policy',
        'examples/policies/basic.policy.json',
      ],
      cwd,
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }

  process.stdout.write('smoke:check passed\n');
}

main().catch((error) => {
  process.stderr.write(
    `smoke:check failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
