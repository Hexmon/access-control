import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AuditEvent, AuditSink } from '../src';
import { BatchingSink } from '../src';

class InMemorySink implements AuditSink {
  public readonly events: AuditEvent[] = [];

  async write(event: AuditEvent): Promise<void> {
    this.events.push(event);
  }
}

class FailingSink implements AuditSink {
  private readonly failEventType: AuditEvent['eventType'];
  public readonly events: AuditEvent[] = [];

  constructor(failEventType: AuditEvent['eventType']) {
    this.failEventType = failEventType;
  }

  async write(event: AuditEvent): Promise<void> {
    if (event.eventType === this.failEventType) {
      throw new Error('sink failure');
    }

    this.events.push(event);
  }
}

function createEvent(eventType: AuditEvent['eventType']): AuditEvent {
  const base = {
    eventVersion: '1.0.0',
    occurredAt: '2026-02-08T00:00:00.000Z',
  };

  switch (eventType) {
    case 'PolicyPublished':
      return {
        ...base,
        eventType,
        payload: {
          policyVersion: '1.0.0',
        },
      };
    case 'PolicyValidated':
      return {
        ...base,
        eventType,
        payload: {
          valid: true,
          errorCount: 0,
          warningCount: 0,
        },
      };
    case 'RoleAssigned':
      return {
        ...base,
        eventType,
        payload: {
          userId: 'u-1',
          role: 'Admin',
        },
      };
    case 'RoleRevoked':
      return {
        ...base,
        eventType,
        payload: {
          userId: 'u-1',
          role: 'Admin',
        },
      };
    case 'RelationshipTupleWritten':
      return {
        ...base,
        eventType,
        payload: {
          operation: 'write',
          tuple: {
            objectType: 'doc',
            objectId: 'd-1',
            relation: 'viewer',
            subjectType: 'user',
            subjectId: 'u-1',
          },
        },
      };
    case 'AuthorizationDecision':
      return {
        ...base,
        eventType,
        payload: {
          principal: {
            id: 'u-1',
            type: 'user',
          },
          action: {
            name: 'doc:read',
          },
          resource: {
            type: 'doc',
            id: 'd-1',
          },
          decision: {
            allow: true,
            reasons: [],
            obligations: [],
            engine: 'hexmon_tech-embedded',
            evaluatedAt: '2026-02-08T00:00:00.000Z',
          },
        },
      };
    default: {
      const unreachable: never = eventType;
      return unreachable;
    }
  }
}

describe('BatchingSink', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('flushes immediately when max batch size is reached', async () => {
    const sink = new InMemorySink();
    const batching = new BatchingSink(sink, {
      flushIntervalMs: 10_000,
      maxBatchSize: 2,
    });

    await batching.write(createEvent('RoleAssigned'));
    expect(sink.events).toHaveLength(0);

    await batching.write(createEvent('RoleRevoked'));
    expect(sink.events).toHaveLength(2);

    await batching.stop();
  });

  it('flushes buffered events on interval and flush() drains', async () => {
    vi.useFakeTimers();

    const sink = new InMemorySink();
    const batching = new BatchingSink(sink, {
      flushIntervalMs: 100,
      maxBatchSize: 10,
    });

    await batching.write(createEvent('PolicyPublished'));
    expect(sink.events).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(100);
    expect(sink.events).toHaveLength(1);

    await batching.write(createEvent('PolicyValidated'));
    await batching.flush();
    expect(sink.events).toHaveLength(2);

    await batching.stop();
  });

  it('handles sink failures based on configured strategy', async () => {
    const dropped = vi.fn<(error: unknown, event: AuditEvent) => void>();

    const dropSink = new FailingSink('PolicyValidated');
    const dropBatch = new BatchingSink(dropSink, {
      flushIntervalMs: 10_000,
      maxBatchSize: 10,
      onError: 'drop',
      onDropped: dropped,
    });

    await dropBatch.write(createEvent('PolicyValidated'));
    await dropBatch.write(createEvent('RoleAssigned'));
    await dropBatch.flush();

    expect(dropSink.events).toHaveLength(1);
    expect(dropSink.events[0]?.eventType).toBe('RoleAssigned');
    expect(dropped).toHaveBeenCalledTimes(1);

    const throwSink = new FailingSink('PolicyValidated');
    const throwBatch = new BatchingSink(throwSink, {
      flushIntervalMs: 10_000,
      maxBatchSize: 10,
      onError: 'throw',
    });

    await throwBatch.write(createEvent('PolicyValidated'));
    await expect(throwBatch.flush()).rejects.toThrow('sink failure');

    await dropBatch.stop();
    await throwBatch.stop().catch(() => undefined);
  });
});
