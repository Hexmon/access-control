# acx

Enterprise-grade access-control tooling for JavaScript/TypeScript, published under `@hexmon_tech/*`.

## Vision

acx provides one authorization model across RBAC, ABAC, context/workflow checks, field-level controls, and optional relationship-based enforcement.

V1 ships the embedded engine first; adapters are layered on top.

## Packages

- [`@hexmon_tech/core`](packages/core): core types, errors, capability flags, helper utilities.
- [`@hexmon_tech/policy-dsl`](packages/policy-dsl): JSON policy DSL schema, validation, and builder.
- [`@hexmon_tech/compiler`](packages/compiler): policy compiler to deterministic IR + diagnostics + hashing.
- [`@hexmon_tech/engine-embedded`](packages/engine-embedded): in-process policy evaluation engine.
- [`@hexmon_tech/engine-rebac`](packages/engine-rebac): ReBAC adapter contract + in-memory adapter.
- [`@hexmon_tech/adapter-openfga`](packages/adapter-openfga): OpenFGA adapter skeleton (mockable client contract).
- [`@hexmon_tech/engine-hybrid`](packages/engine-hybrid): embedded + ReBAC composition engine.
- [`@hexmon_tech/audit`](packages/audit): audit events, sinks, and role-assignment constraints.
- [`@hexmon_tech/integrations-express`](packages/integrations-express): Express middleware + error mapper.
- [`@hexmon_tech/integrations-next-node`](packages/integrations-next-node): Next.js Node runtime wrappers.
- [`@hexmon_tech/integrations-nest`](packages/integrations-nest): Nest decorators/guard/module.
- [`@hexmon_tech/cli`](packages/cli): policy devtools CLI (`acx`).

## Repository Verification

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm -r lint
pnpm -r typecheck
pnpm -r test
pnpm -r build
pnpm -r pack:check
pnpm smoke:check
```

## Changesets

```bash
pnpm changeset
pnpm version-packages
pnpm release
```
