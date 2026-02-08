# @hexmon_tech/audit

Audit event contracts, sinks, batching logger, and role-assignment constraint checks.

## Install

```bash
pnpm add @hexmon_tech/audit
```

## Minimal Usage

```ts
import { ConsoleSink, BatchingSink, validateRoleAssignment } from '@hexmon_tech/audit';

const sink = new BatchingSink(new ConsoleSink(), { maxBatchSize: 50, flushIntervalMs: 250 });

const result = await validateRoleAssignment({
  tenantId: 'tenant-a',
  userId: 'u1',
  role: 'PaymentApprover',
  policyConstraints,
  roleDirectory,
});
```

## API Overview

- Events: `AuditEvent` union + typed event payloads
- Logging: `AuditSink`, `ConsoleSink`, `BatchingSink`
- Constraints: `RoleDirectory`, `validateRoleAssignment`

## Compatibility

- Node `>=18`
- Storage-agnostic interfaces (no DB implementation bundled)

## Verify

```bash
pnpm --filter @hexmon_tech/audit typecheck
pnpm --filter @hexmon_tech/audit test
pnpm --filter @hexmon_tech/audit build
```
