# acx

Enterprise-grade access-control tooling for JavaScript/TypeScript, published under `@hexmon_tech/*`.

## Vision

acx provides one authorization model across RBAC, ABAC, context/workflow checks, field-level controls, and optional relationship-based enforcement.

V1 ships the embedded engine first; adapters are layered on top.

## Packages

Package inventory with entry exports: [`docs/packages.md`](docs/packages.md).

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
pnpm exports:check
pnpm -r pack:check
pnpm smoke-tests
```

## Changesets

```bash
pnpm changeset
pnpm version-packages
pnpm release
```

## Publishing

Automated publishing runs from `.github/workflows/release.yml` on push to `main` using Changesets.

Flow:

1. Add a changeset in your PR (`pnpm changeset`).
2. Merge PR to `main`.
3. Release workflow runs verification and `changesets/action`.
4. Merge the generated version PR (`chore(release): version packages`) to trigger npm publish.

Required secret:

- `NPM_TOKEN` with publish access to the `@hexmon_tech` npm scope.
