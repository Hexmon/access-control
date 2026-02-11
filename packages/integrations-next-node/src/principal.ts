import type { Principal } from '@hexmon_tech/acccess-control-core';

/** Error thrown by placeholder APIs that must be implemented by consumers. */
export class NotImplementedError extends Error {
  public readonly code = 'ACX_ERR_NOT_IMPLEMENTED';

  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
  }
}

/**
 * Placeholder helper for principal extraction.
 * Implement this using your app's auth (JWT/session/cookies) before production use.
 */
export async function getPrincipalFromRequest(_req: Request): Promise<Principal> {
  void _req;
  throw new NotImplementedError(
    'getPrincipalFromRequest is a placeholder. Implement principal extraction for your auth stack.',
  );
}
