# Package Inventory

All publishable workspace packages are scoped under `@hexmon_tech/*`.

| Package                                               | Purpose                                                                    | Public Entry Exports                                                                                                     |
| ----------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `@hexmon_tech/acccess-control-core`                   | Core authorization types, errors, helpers, capability flags.               | `.` -> `types: ./dist/index.d.ts`, `import: ./dist/index.mjs`, `require: ./dist/index.cjs`                               |
| `@hexmon_tech/acccess-control-policy-dsl`             | Policy DSL schema, validation, and builder APIs.                           | `.` -> `types: ./dist/index.d.ts`, `import: ./dist/index.mjs`, `require: ./dist/index.cjs`                               |
| `@hexmon_tech/acccess-control-compiler`               | Compiler from policy DSL to normalized IR + diagnostics/hash helpers.      | `.` -> `types: ./dist/index.d.ts`, `import: ./dist/index.mjs`, `require: ./dist/index.cjs`                               |
| `@hexmon_tech/acccess-control-engine-embedded`        | Embedded policy engine (deny-by-default, deterministic evaluation, cache). | `.` -> `types: ./dist/index.d.ts`, `import: ./dist/index.mjs`, `require: ./dist/index.cjs`                               |
| `@hexmon_tech/acccess-control-engine-rebac`           | ReBAC adapter contract and in-memory adapter.                              | `.` -> `types: ./dist/index.d.ts`, `import: ./dist/index.mjs`, `require: ./dist/index.cjs`                               |
| `@hexmon_tech/acccess-control-adapter-openfga`        | OpenFGA adapter skeleton with mockable client interface.                   | `.` -> `types: ./dist/index.d.ts`, `import: ./dist/index.mjs`, `require: ./dist/index.cjs`                               |
| `@hexmon_tech/acccess-control-engine-hybrid`          | Hybrid engine composing embedded authorization with ReBAC checks.          | `.` -> `types: ./dist/index.d.ts`, `import: ./dist/index.mjs`, `require: ./dist/index.cjs`                               |
| `@hexmon_tech/acccess-control-audit`                  | Audit event model, sinks, and assignment-constraint validation helpers.    | `.` -> `types: ./dist/index.d.ts`, `import: ./dist/index.mjs`, `require: ./dist/index.cjs`                               |
| `@hexmon_tech/acccess-control-integrations-express`   | Express middleware and error mapping helpers.                              | `.` -> `types: ./dist/index.d.ts`, `import: ./dist/index.mjs`, `require: ./dist/index.cjs`                               |
| `@hexmon_tech/acccess-control-integrations-next-node` | Next.js Node runtime wrappers for route handlers/server actions.           | `.` -> `types: ./dist/index.d.ts`, `import: ./dist/index.mjs`, `require: ./dist/index.cjs`                               |
| `@hexmon_tech/acccess-control-integrations-nest`      | NestJS decorators/guard/tokens/module for authz integration.               | `.` -> `types: ./dist/index.d.ts`, `import: ./dist/index.mjs`, `require: ./dist/index.cjs`                               |
| `@hexmon_tech/acccess-control-cli`                    | CLI devtools for validate/test/types/diff/init workflows.                  | `.` -> `types: ./dist/index.d.ts`, `import: ./dist/index.mjs`, `require: ./dist/index.cjs`; `bin: acx -> ./dist/bin.cjs` |

## Verification

Run from repository root:

```bash
pnpm -r build
pnpm exports:check
pnpm pack:check
```
