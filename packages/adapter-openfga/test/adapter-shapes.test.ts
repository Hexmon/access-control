import { describe, expect, it, vi } from 'vitest';

import type { OpenFgaClient } from '../src/client';
import { OpenFgaRebacAdapter } from '../src/adapter';

describe('OpenFgaRebacAdapter shapes', () => {
  it('builds correct writeTuples request shape', async () => {
    const writeTuples = vi.fn<OpenFgaClient['writeTuples']>().mockResolvedValue({
      writtenCount: 1,
    });
    const check = vi.fn<OpenFgaClient['check']>().mockResolvedValue({ allowed: false });

    const client: OpenFgaClient = {
      writeTuples,
      check,
    };

    const adapter = new OpenFgaRebacAdapter(client, {
      storeId: 'store-1',
      authorizationModelId: 'model-1',
    });

    await adapter.writeTuples(
      [
        {
          object: { type: 'doc', id: 'd-1' },
          relation: 'viewer',
          subject: { type: 'user', id: 'u-1' },
          tenantId: 'tenant-1',
        },
      ],
      { tenantId: 'tenant-1' },
    );

    expect(writeTuples).toHaveBeenCalledTimes(1);
    expect(writeTuples).toHaveBeenCalledWith({
      storeId: 'store-1',
      authorizationModelId: 'model-1',
      tenantId: 'tenant-1',
      writes: {
        tuple_keys: [
          {
            user: 'user:u-1',
            relation: 'viewer',
            object: 'doc:d-1',
          },
        ],
      },
    });
  });

  it('builds correct check request shape and maps response', async () => {
    const writeTuples = vi.fn<OpenFgaClient['writeTuples']>().mockResolvedValue({
      writtenCount: 0,
    });
    const check = vi.fn<OpenFgaClient['check']>().mockResolvedValue({
      allowed: true,
      trace: { checkedTuples: 1 },
    });

    const client: OpenFgaClient = {
      writeTuples,
      check,
    };

    const adapter = new OpenFgaRebacAdapter(client, {
      storeId: 'store-1',
      authorizationModelId: 'model-1',
    });

    const result = await adapter.check(
      {
        object: { type: 'repo', id: 'r-1' },
        relation: 'viewer',
        subject: { type: 'group', id: 'eng', relation: 'member' },
        tenantId: 'tenant-2',
      },
      { tenantId: 'tenant-ignored' },
    );

    expect(check).toHaveBeenCalledTimes(1);
    expect(check).toHaveBeenCalledWith({
      storeId: 'store-1',
      authorizationModelId: 'model-1',
      tenantId: 'tenant-2',
      tuple_key: {
        user: 'group:eng#member',
        relation: 'viewer',
        object: 'repo:r-1',
      },
    });

    expect(result).toEqual({
      allow: true,
      trace: { checkedTuples: 1 },
    });
  });
});
