import { compilePolicySet } from '@hexmon_tech/compiler';

const SINGLE_ITERATIONS = 3000;
const BATCH_ITERATIONS_SMALL = 500;
const BATCH_ITERATIONS_LARGE = 200;

const policy = {
  policyVersion: '1.0.0',
  rules: [
    {
      id: 'deny-sensitive-delete',
      effect: 'deny',
      actions: ['post:delete'],
      resourceTypes: ['post'],
      priority: 200,
    },
    {
      id: 'allow-owner-update',
      effect: 'allow',
      actions: ['post:update'],
      resourceTypes: ['post'],
      fields: {
        allow: ['title', 'meta.*'],
      },
      when: {
        op: 'eq',
        left: { ref: 'principal.id' },
        right: { ref: 'resource.attrs.ownerId' },
      },
      obligations: [
        {
          type: 'log',
          payload: { channel: 'audit' },
        },
      ],
      priority: 120,
    },
    {
      id: 'allow-trusted-read',
      effect: 'allow',
      actions: ['post:read'],
      resourceTypes: ['post'],
      when: {
        op: 'and',
        args: [
          {
            op: 'matches',
            text: { ref: 'context.request.ip' },
            regex: '^10\\.0\\.',
          },
          {
            op: 'eq',
            left: { ref: 'context.request.deviceTrust' },
            right: 'trusted',
          },
        ],
      },
      priority: 90,
    },
    {
      id: 'allow-workflow-approve',
      effect: 'allow',
      actions: ['payment:approve'],
      resourceTypes: ['payment'],
      when: {
        op: 'and',
        args: [
          { op: 'eq', left: { ref: 'context.workflow.task' }, right: 'approve' },
          { op: 'eq', left: { ref: 'context.workflow.step' }, right: 'manager' },
        ],
      },
      priority: 80,
    },
  ],
};

function nowNs() {
  return process.hrtime.bigint();
}

function toMs(ns) {
  return Number(ns) / 1_000_000;
}

function p95(samplesNs) {
  if (samplesNs.length === 0) {
    return 0;
  }

  const sorted = [...samplesNs].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return toMs(sorted[index]);
}

function buildInputs(count) {
  const inputs = [];

  for (let i = 0; i < count; i += 1) {
    const kind = i % 4;

    if (kind === 0) {
      inputs.push({
        principal: { id: `u-${i % 10}`, type: 'user', tenantId: 'tenant-a' },
        resource: { type: 'post', id: `p-${i}`, attrs: { ownerId: `u-${i % 10}` } },
        action: { name: 'post:update', fields: ['title', 'meta.tag'] },
        context: { tenantId: 'tenant-a' },
      });
      continue;
    }

    if (kind === 1) {
      inputs.push({
        principal: { id: `u-${i % 10}`, type: 'user', tenantId: 'tenant-a' },
        resource: { type: 'post', id: `p-${i}` },
        action: { name: 'post:read' },
        context: {
          tenantId: 'tenant-a',
          request: { ip: '10.0.2.8', deviceTrust: 'trusted' },
        },
      });
      continue;
    }

    if (kind === 2) {
      inputs.push({
        principal: { id: `u-${i % 10}`, type: 'user', tenantId: 'tenant-a' },
        resource: { type: 'payment', id: `pay-${i}` },
        action: { name: 'payment:approve' },
        context: {
          tenantId: 'tenant-a',
          workflow: { task: 'approve', step: 'manager' },
        },
      });
      continue;
    }

    inputs.push({
      principal: { id: `u-${i % 10}`, type: 'user', tenantId: 'tenant-a' },
      resource: { type: 'post', id: `p-${i}` },
      action: { name: 'post:delete' },
      context: { tenantId: 'tenant-a' },
    });
  }

  return inputs;
}

async function benchmarkAuthorize(engine, inputs, iterations) {
  const sampleLimit = Math.min(500, iterations);
  const samples = [];

  const startedAt = nowNs();
  for (let i = 0; i < iterations; i += 1) {
    const input = inputs[i % inputs.length];
    const s = nowNs();
    await engine.authorize(input);
    if (i < sampleLimit) {
      samples.push(nowNs() - s);
    }
  }
  const elapsed = nowNs() - startedAt;
  const opsPerSec = iterations / (Number(elapsed) / 1_000_000_000);

  return {
    iterations,
    opsPerSec,
    p95Ms: p95(samples),
  };
}

async function benchmarkBatch(engine, inputs, batchSize, iterations) {
  const batch = inputs.slice(0, batchSize);
  const sampleLimit = Math.min(200, iterations);
  const samples = [];

  const startedAt = nowNs();
  for (let i = 0; i < iterations; i += 1) {
    const s = nowNs();
    await engine.batchAuthorize(batch);
    if (i < sampleLimit) {
      samples.push(nowNs() - s);
    }
  }
  const elapsed = nowNs() - startedAt;
  const totalAuthorizations = batchSize * iterations;
  const opsPerSec = totalAuthorizations / (Number(elapsed) / 1_000_000_000);

  return {
    batchSize,
    iterations,
    opsPerSec,
    p95Ms: p95(samples),
  };
}

async function main() {
  let EmbeddedEngine;

  try {
    ({ EmbeddedEngine } = await import('../dist/index.mjs'));
  } catch (error) {
    process.stderr.write(
      'Could not import ../dist/index.mjs. Build first with: pnpm --filter @hexmon_tech/engine-embedded build\n',
    );
    process.exitCode = 1;
    return;
  }

  const { ir } = compilePolicySet(policy);

  const engine = new EmbeddedEngine({
    mode: 'single-tenant',
    cache: { enabled: false },
  });
  engine.setPolicy(ir);

  const inputs = buildInputs(200);

  for (let i = 0; i < 200; i += 1) {
    await engine.authorize(inputs[i % inputs.length]);
  }

  const single = await benchmarkAuthorize(engine, inputs, SINGLE_ITERATIONS);
  const batch10 = await benchmarkBatch(engine, inputs, 10, BATCH_ITERATIONS_SMALL);
  const batch100 = await benchmarkBatch(engine, inputs, 100, BATCH_ITERATIONS_LARGE);

  process.stdout.write('Hexmon TechEmbedded Engine Benchmark\n');
  process.stdout.write(`authorize(): iterations=${single.iterations}\n`);
  process.stdout.write(`  ops/sec=${single.opsPerSec.toFixed(2)}\n`);
  process.stdout.write(`  p95~=${single.p95Ms.toFixed(4)} ms\n`);

  process.stdout.write(`batchAuthorize(10): iterations=${batch10.iterations}\n`);
  process.stdout.write(`  authz ops/sec=${batch10.opsPerSec.toFixed(2)}\n`);
  process.stdout.write(`  p95~=${batch10.p95Ms.toFixed(4)} ms per batch\n`);

  process.stdout.write(`batchAuthorize(100): iterations=${batch100.iterations}\n`);
  process.stdout.write(`  authz ops/sec=${batch100.opsPerSec.toFixed(2)}\n`);
  process.stdout.write(`  p95~=${batch100.p95Ms.toFixed(4)} ms per batch\n`);
}

void main();
