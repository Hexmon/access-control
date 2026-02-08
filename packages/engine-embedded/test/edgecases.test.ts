import { describe, expect, it } from 'vitest';

import { compilePolicySet } from '../../compiler/src/compile';
import type { PolicySet } from '@acx/policy-dsl';

import { EmbeddedEngine } from '../src/engine';

function createEngine(policy: PolicySet, options: Parameters<typeof EmbeddedEngine>[0] = {}) {
  const { ir } = compilePolicySet(policy);
  const engine = new EmbeddedEngine(options);
  engine.setPolicy(ir);
  return engine;
}

const principal = {
  id: 'user-1',
  type: 'user' as const,
  tenantId: 'tenant-1',
};

describe('embedded engine edge cases', () => {
  it('denies when deny rule matches even if higher-priority allow exists', async () => {
    const engine = createEngine({
      policyVersion: '1.0.0',
      rules: [
        {
          id: 'allow-read-high',
          effect: 'allow',
          actions: ['doc:read'],
          resourceTypes: ['doc'],
          priority: 1000,
        },
        {
          id: 'deny-read-low',
          effect: 'deny',
          actions: ['doc:read'],
          resourceTypes: ['doc'],
          priority: -10,
        },
      ],
    });

    const decision = await engine.authorize({
      principal,
      resource: { type: 'doc', id: 'd1' },
      action: { name: 'doc:read' },
    });

    expect(decision.allow).toBe(false);
    expect(decision.reasons[0]?.code).toBe('RULE_DENY');
  });

  it('fails context-based conditions when ip/auth/device constraints do not match', async () => {
    const engine = createEngine({
      policyVersion: '1.0.0',
      rules: [
        {
          id: 'strict-session-start',
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
                left: { ref: 'context.request.authStrength' },
                right: 'mfa',
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
    });

    const denied = await engine.authorize({
      principal,
      resource: { type: 'session', id: 's1' },
      action: { name: 'session:start' },
      context: {
        request: {
          ip: '10.0.0.9',
          authStrength: 'mfa',
          deviceTrust: 'untrusted',
        },
      },
    });

    expect(denied.allow).toBe(false);
    expect(denied.reasons[0]?.code).toBe('DEFAULT_DENY');
  });

  it('supports workflow-based rule checks for task/step/status', async () => {
    const engine = createEngine({
      policyVersion: '1.0.0',
      rules: [
        {
          id: 'approval-step',
          effect: 'allow',
          actions: ['payment:approve'],
          resourceTypes: ['payment'],
          when: {
            op: 'and',
            args: [
              { op: 'eq', left: { ref: 'context.workflow.task' }, right: 'approve' },
              { op: 'eq', left: { ref: 'context.workflow.step' }, right: 'manager' },
              { op: 'eq', left: { ref: 'context.workflow.status' }, right: 'pending' },
            ],
          },
        },
      ],
    });

    const allow = await engine.authorize({
      principal,
      resource: { type: 'payment', id: 'p1' },
      action: { name: 'payment:approve' },
      context: {
        workflow: {
          task: 'approve',
          step: 'manager',
          status: 'pending',
        },
      },
    });

    const deny = await engine.authorize({
      principal,
      resource: { type: 'payment', id: 'p1' },
      action: { name: 'payment:approve' },
      context: {
        workflow: {
          task: 'approve',
          step: 'finance',
          status: 'pending',
        },
      },
    });

    expect(allow.allow).toBe(true);
    expect(deny.allow).toBe(false);
  });
});
