# acx

Enterprise-grade access-control tooling for JavaScript/TypeScript.

## Vision

acx provides a cohesive authorization model that supports RBAC, ABAC, contextual checks, task-driven workflows, and field-level controls. The goal is to let teams define policy once and apply it consistently across services, while keeping evaluation fast, testable, and aligned with product intent.

Note: V1 ships the embedded engine; adapters come later.

## Packages

- @acx/core
- @acx/policy-dsl
- @acx/compiler
- @acx/engine-embedded
- @acx/audit
- @acx/integrations-express
- @acx/integrations-next-node
- @acx/integrations-nest
- @acx/cli

## Quickstart

Coming soon.

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## Changesets

```bash
pnpm changeset
pnpm version-packages
pnpm release
```
