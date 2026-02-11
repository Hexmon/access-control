# @hexmon_tech/acccess-control-cli

Developer CLI for policy validation, type generation, diffing, golden tests, and scaffolding.

## Install

```bash
pnpm add -D @hexmon_tech/acccess-control-cli
```

## Commands

```bash
hexmon_tech init --dir .
hexmon_tech validate examples/policies/basic.policy.json
hexmon_tech types examples/policies/basic.policy.json --out src/policy-types.ts
hexmon_tech test examples/policy-tests/basic --policy examples/policies/basic.policy.json
hexmon_tech diff examples/policies/basic.policy.json examples/policies/multi-tenant.policy.json
```

## API Overview

- Programmatic entry: `runCli(argv, options)`
- Command helpers: `runValidateCommand`, `runTypesCommand`, `runTestCommand`, `runDiffCommand`, `runInitCommand`

## Compatibility

- Node `>=18`
- Works offline; no external services required

## Verify

```bash
pnpm --filter @hexmon_tech/acccess-control-cli typecheck
pnpm --filter @hexmon_tech/acccess-control-cli test
pnpm --filter @hexmon_tech/acccess-control-cli build
node packages/cli/dist/bin.cjs --help
```
