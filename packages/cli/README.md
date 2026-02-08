# @hexmon_tech/cli

Developer CLI for policy validation, type generation, diffing, golden tests, and scaffolding.

## Install

```bash
pnpm add -D @hexmon_tech/cli
```

## Commands

```bash
acx init --dir .
acx validate examples/policies/basic.policy.json
acx types examples/policies/basic.policy.json --out src/policy-types.ts
acx test examples/policy-tests/basic --policy examples/policies/basic.policy.json
acx diff examples/policies/basic.policy.json examples/policies/multi-tenant.policy.json
```

## API Overview

- Programmatic entry: `runCli(argv, options)`
- Command helpers: `runValidateCommand`, `runTypesCommand`, `runTestCommand`, `runDiffCommand`, `runInitCommand`

## Compatibility

- Node `>=18`
- Works offline; no external services required

## Verify

```bash
pnpm --filter @hexmon_tech/cli typecheck
pnpm --filter @hexmon_tech/cli test
pnpm --filter @hexmon_tech/cli build
node packages/cli/dist/bin.cjs --help
```
