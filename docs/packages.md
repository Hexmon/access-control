# Package Inventory

All publishable workspace packages are scoped under `@hexmon_tech/*`.

| Package                               | Purpose                                                                    | Public Entry Exports                                                                                                     |
| ------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `@hexmon_tech/core`                   | Core authorization types, errors, helpers, capability flags.               | `.` -> `types: ./dist/index.d.ts`, `import: ./dist/index.mjs`, `require: ./dist/index.cjs`                               |
| `@hexmon_tech/policy-dsl`             | Policy DSL schema, validation, and builder APIs.                           | `.` -> `types: ./dist/index.d.ts`, `import: ./dist/index.mjs`, `require: ./dist/index.cjs`                               |
| `@hexmon_tech/compiler`               | Compiler from policy DSL to normalized IR + diagnostics/hash helpers.      | `.` -> `types: ./dist/index.d.ts`, `import: ./dist/index.mjs`, `require: ./dist/index.cjs`                               |
| `@hexmon_tech/engine-embedded`        | Embedded policy engine (deny-by-default, deterministic evaluation, cache). | `.` -> `types: ./dist/index.d.ts`, `import: ./dist/index.mjs`, `require: ./dist/index.cjs`                               |
| `@hexmon_tech/engine-rebac`           | ReBAC adapter contract and in-memory adapter.                              | `.` -> `types: ./dist/index.d.ts`, `import: ./dist/index.mjs`, `require: ./dist/index.cjs`                               |
| `@hexmon_tech/adapter-openfga`        | OpenFGA adapter skeleton with mockable client interface.                   | `.` -> `types: ./dist/index.d.ts`, `import: ./dist/index.mjs`, `require: ./dist/index.cjs`                               |
| `@hexmon_tech/engine-hybrid`          | Hybrid engine composing embedded authorization with ReBAC checks.          | `.` -> `types: ./dist/index.d.ts`, `import: ./dist/index.mjs`, `require: ./dist/index.cjs`                               |
| `@hexmon_tech/audit`                  | Audit event model, sinks, and assignment-constraint validation helpers.    | `.` -> `types: ./dist/index.d.ts`, `import: ./dist/index.mjs`, `require: ./dist/index.cjs`                               |
| `@hexmon_tech/integrations-express`   | Express middleware and error mapping helpers.                              | `.` -> `types: ./dist/index.d.ts`, `import: ./dist/index.mjs`, `require: ./dist/index.cjs`                               |
| `@hexmon_tech/integrations-next-node` | Next.js Node runtime wrappers for route handlers/server actions.           | `.` -> `types: ./dist/index.d.ts`, `import: ./dist/index.mjs`, `require: ./dist/index.cjs`                               |
| `@hexmon_tech/integrations-nest`      | NestJS decorators/guard/tokens/module for authz integration.               | `.` -> `types: ./dist/index.d.ts`, `import: ./dist/index.mjs`, `require: ./dist/index.cjs`                               |
| `@hexmon_tech/cli`                    | CLI devtools for validate/test/types/diff/init workflows.                  | `.` -> `types: ./dist/index.d.ts`, `import: ./dist/index.mjs`, `require: ./dist/index.cjs`; `bin: acx -> ./dist/bin.cjs` |

## Verification

Run from repository root:

```bash
pnpm -r build
pnpm exports:check
pnpm pack:check
```
