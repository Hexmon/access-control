# Release Process

This repository publishes `@hexmon_tech/*` packages using Changesets + GitHub Actions.

## Prerequisites

- Node.js `>=18`
- pnpm (pinned by root `packageManager`)
- GitHub Actions secret: `NPM_TOKEN` with publish rights for `@hexmon_tech`

## How Automated Release Works

1. Add a changeset in your feature PR:

```bash
pnpm changeset
```

2. Merge the PR to `main`.
3. `.github/workflows/release.yml` runs on `push` to `main`:
   - installs dependencies
   - runs format/typecheck/lint/test/build/smoke-tests/exports:check/pack:check
   - runs `changesets/action@v1`
4. Changesets action then:
   - opens/updates a version PR (`chore(release): version packages`) when changesets exist, or
   - publishes to npm after version changes are merged and ready.

## Local Verification Before Merge

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm -r typecheck
pnpm -r lint
pnpm -r test
pnpm -r build
pnpm smoke-tests
pnpm exports:check
pnpm -r pack:check
```

## Manual Fallback Publish

Use this only if GitHub automation is unavailable:

```bash
pnpm version-packages
pnpm release
```

`pnpm release` runs `pnpm build && changeset publish`.

## First Publish Checklist

- Confirm each package name is available under `@hexmon_tech/*` on npm.
- Ensure package versions are higher than existing published versions.
- Ensure `publishConfig.access` is `public` for scoped public packages.
