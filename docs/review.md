# Enterprise Review (Hexmon Scope)

## Repository Health Summary

- Scope migration to `@hexmon_tech/*`: PASS
- Formatting (`prettier --check`): PASS
- Lint (`pnpm -r lint`): PASS
- Typecheck (`pnpm -r typecheck`): PASS
- Tests (`pnpm -r test`): PASS
- Build (`pnpm -r build`): PASS
- Tarball/package checks (`pnpm -r pack:check`): PASS
- Runtime smoke checks (`pnpm smoke-tests`): PASS
- CI workflows enforce checks: PASS

## Line-Item Findings (With Severity)

1. `Blocker` Fixed: ESM runtime import resolution failed for `ajv` because extensionless subpath import can break on strict Node ESM resolution.

- Location: `packages/policy-dsl/src/validate.ts:1`
- Change: switched `ajv/dist/2020` to `ajv/dist/2020.js`.
- Verification: `pnpm smoke-tests` now passes policy validation and compilation from built artifacts.

2. `High` Fixed: Package scope mismatch for publish target (legacy scope vs required `@hexmon_tech/*`) across package names, dependencies, source imports, tests, docs, examples.

- Locations: all package manifests and imports (for example `packages/core/package.json:2`, `packages/engine-embedded/src/engine.ts:1`, `README.md:13`).
- Change: migrated all references to `@hexmon_tech/*` and refreshed lockfile.
- Verification: `rg -n "@hexmon_tech/" packages README.md docs/cli.md docs/release.md` confirms scoped references are consistent.

3. `Medium` Fixed: Verification gates were incomplete (no enforced recursive `typecheck`, package tarball validation, or smoke checks).

- Location: `package.json:11`, `.github/workflows/ci.yml:1`, `.github/workflows/release.yml:1`
- Change: added root scripts `typecheck`, `pack:check`, `smoke-tests`, `format:check`; added per-package `typecheck` and `pack:check`; updated CI/release workflows.
- Verification: full command chain passes in local run.

4. `Low` Fixed: Lint blockers from unused parameters/imports after recursive lint was enabled.

- Locations: `packages/engine-hybrid/src/engine.ts:1`, `packages/engine-embedded/src/engine.ts:1`, `packages/integrations-express/src/errors.ts:11`, `packages/integrations-next-node/src/principal.ts:17`
- Change: removed unused imports and made intentional unused parameters explicit.

5. `Low` Open (Risk): Regex conditions can still accept expensive regex patterns and evaluate at runtime.

- Location: `packages/compiler/src/conditions/eval.ts:170`
- Risk: potential regex denial-of-service if untrusted policy input is accepted without governance.
- Recommendation: add optional regex safety guard (length/feature restrictions or pre-compilation policy checks).

6. `Low` Open (DX): CLI uses `commander.exitOverride()`, which makes `--help` return usage error semantics in some direct invocations.

- Location: `packages/cli/src/index.ts:28`
- Risk: non-standard help exit behavior in some scripting contexts.
- Recommendation: keep current behavior for programmatic control, or special-case help to exit `0`.

## Per-Package Review

### `@hexmon_tech/core`

- Purpose: shared authorization types/contracts, stable error model, helper utilities.
- Key exports: `AuthorizationEngine`, `AuthorizationInput`, `Decision`, `AcxError` classes, capabilities, helpers.
- Risks: low; stable and deterministic utilities.
- Verify:

```bash
pnpm --filter @hexmon_tech/core typecheck
pnpm --filter @hexmon_tech/core test
pnpm --filter @hexmon_tech/core build
pnpm --filter @hexmon_tech/core pack:check
```

### `@hexmon_tech/policy-dsl`

- Purpose: policy schema/types/validation and builder.
- Key exports: `validatePolicySet`, `policySet`, `policySetSchema`, DSL types.
- Risks: low after ESM `ajv` import fix.
- Verify:

```bash
pnpm --filter @hexmon_tech/policy-dsl typecheck
pnpm --filter @hexmon_tech/policy-dsl test
pnpm --filter @hexmon_tech/policy-dsl build
pnpm --filter @hexmon_tech/policy-dsl pack:check
```

### `@hexmon_tech/compiler`

- Purpose: compile DSL to IR, diagnostics, safe condition evaluation, stable hashing.
- Key exports: `compilePolicySet`, `evaluateCondition`, selector compiler, hash utilities.
- Risks: regex complexity risk remains.
- Verify:

```bash
pnpm --filter @hexmon_tech/compiler typecheck
pnpm --filter @hexmon_tech/compiler test
pnpm --filter @hexmon_tech/compiler build
pnpm --filter @hexmon_tech/compiler pack:check
```

### `@hexmon_tech/engine-embedded`

- Purpose: deterministic embedded engine with deny-by-default, deny-overrides-allow, field obligations, cache, trace.
- Key exports: `EmbeddedEngine`.
- Risks: low; behavior covered by edge/caching/multi-tenant tests.
- Verify:

```bash
pnpm --filter @hexmon_tech/engine-embedded typecheck
pnpm --filter @hexmon_tech/engine-embedded test
pnpm --filter @hexmon_tech/engine-embedded build
pnpm --filter @hexmon_tech/engine-embedded pack:check
node packages/engine-embedded/bench/run.mjs
```

### `@hexmon_tech/engine-rebac`

- Purpose: ReBAC interface and direct in-memory tuple adapter.
- Key exports: `RebacAdapter`, `InMemoryRebacAdapter`, tuple/check/list types.
- Risks: expected functional limit (no graph traversal by design).
- Verify:

```bash
pnpm --filter @hexmon_tech/engine-rebac typecheck
pnpm --filter @hexmon_tech/engine-rebac test
pnpm --filter @hexmon_tech/engine-rebac build
pnpm --filter @hexmon_tech/engine-rebac pack:check
```

### `@hexmon_tech/adapter-openfga`

- Purpose: OpenFGA skeleton adapter with mockable client contract.
- Key exports: `OpenFgaRebacAdapter`, client/type contracts.
- Risks: low; no network required for tests.
- Verify:

```bash
pnpm --filter @hexmon_tech/adapter-openfga typecheck
pnpm --filter @hexmon_tech/adapter-openfga test
pnpm --filter @hexmon_tech/adapter-openfga build
pnpm --filter @hexmon_tech/adapter-openfga pack:check
```

### `@hexmon_tech/engine-hybrid`

- Purpose: compose embedded + ReBAC with deterministic final allow semantics.
- Key exports: `HybridEngine`, match helpers.
- Risks: low; precedence and batch grouping tests are present.
- Verify:

```bash
pnpm --filter @hexmon_tech/engine-hybrid typecheck
pnpm --filter @hexmon_tech/engine-hybrid test
pnpm --filter @hexmon_tech/engine-hybrid build
pnpm --filter @hexmon_tech/engine-hybrid pack:check
```

### `@hexmon_tech/audit`

- Purpose: versionable audit events, sink abstraction, batched sink, SoD/assignment constraints.
- Key exports: `AuditEvent`, `AuditSink`, `ConsoleSink`, `BatchingSink`, `validateRoleAssignment`.
- Risks: low; storage/network intentionally abstracted.
- Verify:

```bash
pnpm --filter @hexmon_tech/audit typecheck
pnpm --filter @hexmon_tech/audit test
pnpm --filter @hexmon_tech/audit build
pnpm --filter @hexmon_tech/audit pack:check
```

### `@hexmon_tech/integrations-express`

- Purpose: Express middleware and error mapping with `req.authzDecision` attachment.
- Key exports: `requireAuthz`, `createAuthzErrorHandler`, integration types.
- Risks: low; no server required in tests.
- Verify:

```bash
pnpm --filter @hexmon_tech/integrations-express typecheck
pnpm --filter @hexmon_tech/integrations-express test
pnpm --filter @hexmon_tech/integrations-express build
pnpm --filter @hexmon_tech/integrations-express pack:check
```

### `@hexmon_tech/integrations-next-node`

- Purpose: wrappers for Next.js Node route handlers and server actions.
- Key exports: `withAuthz`, `AuthzDeniedError`, `getPrincipalFromRequest` placeholder.
- Risks: low; Node runtime only, not Edge.
- Verify:

```bash
pnpm --filter @hexmon_tech/integrations-next-node typecheck
pnpm --filter @hexmon_tech/integrations-next-node test
pnpm --filter @hexmon_tech/integrations-next-node build
pnpm --filter @hexmon_tech/integrations-next-node pack:check
```

### `@hexmon_tech/integrations-nest`

- Purpose: decorators, guard, and module registration for NestJS.
- Key exports: `AuthzAction`, `AuthzResource`, `AuthzGuard`, `AuthzModule`, tokens/interfaces.
- Risks: low; peer dependencies correctly externalized.
- Verify:

```bash
pnpm --filter @hexmon_tech/integrations-nest typecheck
pnpm --filter @hexmon_tech/integrations-nest test
pnpm --filter @hexmon_tech/integrations-nest build
pnpm --filter @hexmon_tech/integrations-nest pack:check
```

### `@hexmon_tech/cli`

- Purpose: policy lifecycle devtools (`init`, `validate`, `test`, `types`, `diff`).
- Key exports: CLI binary (`acx`), `runCli`, command handlers.
- Risks: low; help exit behavior note above.
- Verify:

```bash
pnpm --filter @hexmon_tech/cli typecheck
pnpm --filter @hexmon_tech/cli test
pnpm --filter @hexmon_tech/cli build
pnpm --filter @hexmon_tech/cli pack:check
node packages/cli/dist/bin.cjs validate examples/policies/basic.policy.json
```

## Security Review Notes

- Deny-by-default enforced when no allow rule matches (`packages/engine-embedded/src/engine.ts:348`).
- Deny rules evaluated before allow rules (`packages/engine-embedded/src/engine.ts:182`, `packages/engine-embedded/src/engine.ts:207`).
- No `eval` / `Function` usage in condition evaluation; AST is interpreted (`packages/compiler/src/conditions/eval.ts:6`).
- Input validation is schema-first with detailed diagnostics (`packages/policy-dsl/src/validate.ts:25`).
- Integration error handlers avoid raw internal error leakage by default (`packages/integrations-express/src/errors.ts:64`).
- Multi-tenant enforcement uses `MissingTenantError` when configured (`packages/engine-embedded/src/engine.ts:141`).

## Performance Review Notes

- Compiler precomputes rule matchers and field selectors for runtime efficiency (`packages/compiler/src/compile.ts:46`).
- Embedded engine indexes candidate rules by scope/resource/action (`packages/engine-embedded/src/indexes.ts:20`).
- Deterministic cache key includes tenant/principal/action/resource/context components (`packages/engine-embedded/src/engine.ts:571`).
- LRU cache with TTL and explicit invalidation on `setPolicy` (`packages/engine-embedded/src/engine.ts:80`, `packages/engine-embedded/src/engine.ts:86`).
- Batch paths are present in embedded and hybrid engines; hybrid groups checks requiring ReBAC (`packages/engine-hybrid/src/engine.ts:60`).

## Publish Readiness Checklist

- `exports` map, `main/module/types` alignment validated by `pack:check`: PASS
- `files` whitelist and package artifact hygiene validated by `pack:check`: PASS
- `sideEffects` and metadata (`license`, `author`, `repository`, `keywords`) present: PASS
- Framework integration peer dependencies declared (Express/Nest/Next): PASS
- Changesets configured and release workflow performs non-publish versioning checks: PASS

## Overall Status

Repository is publish-ready for `@hexmon_tech/*` with one open low-severity recommendation (regex safety hardening) and one low-severity CLI UX note.
