import { describe, expect, it } from 'vitest';

import { InMemoryRebacAdapter } from '../src/memory';

describe('InMemoryRebacAdapter', () => {
  it('returns allow=true when exact tuple exists', async () => {
    const adapter = new InMemoryRebacAdapter();

    await adapter.writeTuples([
      {
        object: { type: 'doc', id: 'd-1' },
        relation: 'viewer',
        subject: { type: 'user', id: 'u-1' },
      },
    ]);

    const result = await adapter.check({
      object: { type: 'doc', id: 'd-1' },
      relation: 'viewer',
      subject: { type: 'user', id: 'u-1' },
    });

    expect(result.allow).toBe(true);
  });

  it('returns allow=false when tuple is missing', async () => {
    const adapter = new InMemoryRebacAdapter();

    const result = await adapter.check({
      object: { type: 'doc', id: 'd-2' },
      relation: 'viewer',
      subject: { type: 'user', id: 'u-1' },
    });

    expect(result.allow).toBe(false);
  });

  it('respects tenantId boundaries', async () => {
    const adapter = new InMemoryRebacAdapter();

    await adapter.writeTuples([
      {
        object: { type: 'doc', id: 'd-1' },
        relation: 'viewer',
        subject: { type: 'user', id: 'u-1' },
        tenantId: 'tenant-a',
      },
    ]);

    const allowed = await adapter.check({
      object: { type: 'doc', id: 'd-1' },
      relation: 'viewer',
      subject: { type: 'user', id: 'u-1' },
      tenantId: 'tenant-a',
    });

    const denied = await adapter.check({
      object: { type: 'doc', id: 'd-1' },
      relation: 'viewer',
      subject: { type: 'user', id: 'u-1' },
      tenantId: 'tenant-b',
    });

    expect(allowed.allow).toBe(true);
    expect(denied.allow).toBe(false);
  });

  it('requires exact subject relation match in direct mode', async () => {
    const adapter = new InMemoryRebacAdapter();

    await adapter.writeTuples([
      {
        object: { type: 'repo', id: 'r-1' },
        relation: 'viewer',
        subject: { type: 'group', id: 'eng', relation: 'member' },
      },
    ]);

    const exact = await adapter.check({
      object: { type: 'repo', id: 'r-1' },
      relation: 'viewer',
      subject: { type: 'group', id: 'eng', relation: 'member' },
    });

    const missingRelation = await adapter.check({
      object: { type: 'repo', id: 'r-1' },
      relation: 'viewer',
      subject: { type: 'group', id: 'eng' },
    });

    expect(exact.allow).toBe(true);
    expect(missingRelation.allow).toBe(false);
  });
});
