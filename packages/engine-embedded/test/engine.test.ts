import { describe, expect, it } from 'vitest';

import { compilePolicySet } from '../../compiler/src/compile';
import type { PolicySet } from '@hexmon_tech/acccess-control-policy-dsl';

import { EmbeddedEngine } from '../src/engine';

const basePrincipal = {
  id: 'user-1',
  type: 'user' as const,
  tenantId: 'tenant-1',
  roles: [],
  groups: [],
  attrs: {
    department: 'sales',
  },
};

function createEngine(policy: PolicySet, options: Parameters<typeof EmbeddedEngine>[0] = {}) {
  const { ir } = compilePolicySet(policy);
  const engine = new EmbeddedEngine(options);
  engine.setPolicy(ir);
  return engine;
}

describe('EmbeddedEngine', () => {
  it('denies when a deny rule matches even if allow also matches', async () => {
    const policy: PolicySet = {
      policyVersion: '1.0.0',
      rules: [
        {
          id: 'allow-post-read',
          effect: 'allow',
          actions: ['post:read'],
          resourceTypes: ['post'],
        },
        {
          id: 'deny-post-read',
          effect: 'deny',
          actions: ['post:read'],
          resourceTypes: ['post'],
          priority: 5,
        },
      ],
    };

    const engine = createEngine(policy);

    const decision = await engine.authorize({
      principal: basePrincipal,
      resource: { type: 'post', id: 'post-1' },
      action: { name: 'post:read' },
    });

    expect(decision.allow).toBe(false);
    expect(decision.reasons[0]?.code).toBe('RULE_DENY');
  });

  it('resolves role inheritance for permissions', async () => {
    const policy: PolicySet = {
      policyVersion: '1.0.0',
      rules: [
        {
          id: 'noop',
          effect: 'deny',
          actions: ['system:noop'],
          resourceTypes: ['system'],
        },
      ],
      roles: [
        {
          name: 'Manager',
          permissions: [
            {
              actions: ['post:read'],
              resourceTypes: ['post'],
            },
          ],
        },
        {
          name: 'Admin',
          inherits: ['Manager'],
          permissions: [
            {
              actions: ['post:update'],
              resourceTypes: ['post'],
            },
          ],
        },
      ],
    };

    const engine = createEngine(policy);

    const decision = await engine.authorize({
      principal: { ...basePrincipal, roles: ['Admin'] },
      resource: { type: 'post', id: 'post-1' },
      action: { name: 'post:read' },
    });

    expect(decision.allow).toBe(true);
  });

  it('evaluates ABAC conditions against resource attributes', async () => {
    const policy: PolicySet = {
      policyVersion: '1.0.0',
      rules: [
        {
          id: 'owner-read',
          effect: 'allow',
          actions: ['doc:read'],
          resourceTypes: ['doc'],
          when: {
            op: 'eq',
            left: { ref: 'principal.id' },
            right: { ref: 'resource.attrs.ownerId' },
          },
        },
      ],
    };

    const engine = createEngine(policy);

    const decision = await engine.authorize({
      principal: basePrincipal,
      resource: { type: 'doc', id: 'doc-1', attrs: { ownerId: 'user-1' } },
      action: { name: 'doc:read' },
    });

    expect(decision.allow).toBe(true);
  });

  it('evaluates context checks including ip/device', async () => {
    const policy: PolicySet = {
      policyVersion: '1.0.0',
      rules: [
        {
          id: 'trusted-device',
          effect: 'allow',
          actions: ['session:start'],
          resourceTypes: ['session'],
          when: {
            op: 'and',
            args: [
              {
                op: 'matches',
                text: { ref: 'context.request.ip' },
                regex: '^10\\.0\\.0\\.',
              },
              {
                op: 'eq',
                left: { ref: 'context.request.deviceTrust' },
                right: 'trusted',
              },
            ],
          },
        },
      ],
    };

    const engine = createEngine(policy);

    const decision = await engine.authorize({
      principal: basePrincipal,
      resource: { type: 'session', id: 'sess-1' },
      action: { name: 'session:start' },
      context: {
        request: {
          ip: '10.0.0.8',
          deviceTrust: 'trusted',
        },
      },
    });

    expect(decision.allow).toBe(true);
  });

  it('evaluates workflow task rules', async () => {
    const policy: PolicySet = {
      policyVersion: '1.0.0',
      rules: [
        {
          id: 'approve-task',
          effect: 'allow',
          actions: ['invoice:approve'],
          resourceTypes: ['invoice'],
          when: {
            op: 'and',
            args: [
              {
                op: 'eq',
                left: { ref: 'context.workflow.task' },
                right: 'approve',
              },
              {
                op: 'eq',
                left: { ref: 'context.workflow.step' },
                right: 'manager',
              },
            ],
          },
        },
      ],
    };

    const engine = createEngine(policy);

    const decision = await engine.authorize({
      principal: basePrincipal,
      resource: { type: 'invoice', id: 'inv-1' },
      action: { name: 'invoice:approve' },
      context: {
        workflow: {
          task: 'approve',
          step: 'manager',
        },
      },
    });

    expect(decision.allow).toBe(true);
  });

  it('adds field obligations and respects fieldViolation settings', async () => {
    const policy: PolicySet = {
      policyVersion: '1.0.0',
      rules: [
        {
          id: 'allow-update',
          effect: 'allow',
          actions: ['post:update'],
          resourceTypes: ['post'],
          obligations: [
            {
              type: 'maskFields',
              payload: { fields: ['ssn'] },
            },
          ],
        },
        {
          id: 'deny-sensitive',
          effect: 'deny',
          actions: ['post:update'],
          resourceTypes: ['post'],
          fields: {
            deny: ['salary', 'ssn'],
          },
        },
      ],
    };

    const engine = createEngine(policy);

    const decision = await engine.authorize({
      principal: basePrincipal,
      resource: { type: 'post', id: 'post-1' },
      action: { name: 'post:update', fields: ['title', 'salary', 'ssn'] },
    });

    expect(decision.allow).toBe(true);
    expect(decision.obligations).toEqual(
      expect.arrayContaining([
        { type: 'maskFields', payload: { fields: ['ssn'] } },
        { type: 'omitFields', payload: { fields: ['salary', 'ssn'] } },
      ]),
    );

    const denyEngine = createEngine(policy, { fieldViolation: 'deny' });

    const denyDecision = await denyEngine.authorize({
      principal: basePrincipal,
      resource: { type: 'post', id: 'post-1' },
      action: { name: 'post:update', fields: ['title', 'salary'] },
    });

    expect(denyDecision.allow).toBe(false);
    expect(denyDecision.reasons[0]?.code).toBe('FIELD_VIOLATION');
  });

  it('uses cache to avoid repeated evaluations', async () => {
    const policy: PolicySet = {
      policyVersion: '1.0.0',
      rules: [
        {
          id: 'allow-post-read',
          effect: 'allow',
          actions: ['post:read'],
          resourceTypes: ['post'],
        },
      ],
    };

    const engine = createEngine(policy, { cache: { ttlMs: 10000, maxSize: 50 } });

    const input = {
      principal: basePrincipal,
      resource: { type: 'post', id: 'post-1' },
      action: { name: 'post:read' },
    };

    await engine.authorize(input);
    await engine.authorize(input);

    const metrics = engine.getMetrics();
    expect(metrics.evaluations).toBe(1);
    expect(metrics.cacheHits).toBe(1);
  });
});
