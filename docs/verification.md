# Verification Guide

This repository is validated for Node `>=18` and `pnpm` workspaces.

## Full Repository Verification

Run from repo root:

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

Expected result:

- Every command exits `0`
- `pack:check` prints one `pack:check ok for @hexmon_tech/<pkg>` per package
- `exports:check` prints one `exports:check ok for @hexmon_tech/<pkg>` per package
- `smoke-tests` ends with `smoke:check passed`

## Per-Package Verification

Run one package at a time:

```bash
pnpm --filter @hexmon_tech/<package> typecheck
pnpm --filter @hexmon_tech/<package> test
pnpm --filter @hexmon_tech/<package> build
pnpm --filter @hexmon_tech/<package> pack:check
```

Example:

```bash
pnpm --filter @hexmon_tech/acccess-control-compiler typecheck
pnpm --filter @hexmon_tech/acccess-control-compiler test
pnpm --filter @hexmon_tech/acccess-control-compiler build
pnpm --filter @hexmon_tech/acccess-control-compiler pack:check
```

## Packaging Simulation (`npm`/`pnpm pack`)

Workspace script:

```bash
pnpm -r pack:check
```

What it validates for each package:

- Tarball can be generated with `pnpm pack`
- Tarball contains `package.json`
- `main`/`module`/`types` files exist in tarball
- `exports` targets exist in tarball
- disallowed paths (`src`, `test`, `tests`, `bench`) are excluded

## Export/Type Resolution Checks (ESM + CJS)

The smoke runner validates:

- ESM import of `@hexmon_tech/acccess-control-core`
- CJS require of `@hexmon_tech/acccess-control-core`
- policy validation via `@hexmon_tech/acccess-control-policy-dsl`
- compilation via `@hexmon_tech/acccess-control-compiler`
- authorization allow/deny via `@hexmon_tech/acccess-control-engine-embedded`
- CLI commands (`validate`, `types`, `test`) via `@hexmon_tech/acccess-control-cli`

Run:

```bash
pnpm exports:check
pnpm smoke-tests
```

## CLI Verification

```bash
pnpm --filter @hexmon_tech/acccess-control-cli build
node packages/cli/dist/bin.cjs validate examples/policies/basic.policy.json
node packages/cli/dist/bin.cjs types examples/policies/basic.policy.json --out /tmp/policy-types.ts
node packages/cli/dist/bin.cjs test examples/policy-tests/basic --policy examples/policies/basic.policy.json
node packages/cli/dist/bin.cjs diff examples/policies/basic.policy.json examples/policies/multi-tenant.policy.json
```

## Benchmark Verification

```bash
pnpm --filter @hexmon_tech/acccess-control-engine-embedded build
node packages/engine-embedded/bench/run.mjs
```

Expected output includes:

- `authorize()` ops/sec + p95 approximation
- `batchAuthorize(10)` and `batchAuthorize(100)` ops/sec + p95 approximation

## CI Parity

The CI workflow (`.github/workflows/ci.yml`) runs the same checks used above.

The release workflow (`.github/workflows/release.yml`) runs the same checks and then executes Changesets automation for version PR creation and npm publish.
