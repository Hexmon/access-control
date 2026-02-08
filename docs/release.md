# Release Process

This repository uses Changesets for versioning and release preparation.

## Prerequisites

- Node.js `>=18`
- pnpm

## 1) Create a changeset

After making package changes, create a changeset:

```bash
pnpm changeset
```

Commit the generated file in `.changeset/`.

## 2) Pre-release checks

Run full validation before versioning/publishing:

```bash
pnpm -r test
pnpm -r build
```

## 3) Apply version bumps

Generate package version updates and changelog entries:

```bash
pnpm version-packages
```

This runs `changeset version` via the root script.

## 4) Publish later (when credentials are configured)

When ready to publish, run:

```bash
pnpm release
```

The `release` script runs build + `changeset publish`.

## Notes

- This repo does **not** store npm publish secrets.
- CI release workflow validates and runs versioning logic without publishing.
- Publishing can be added later by configuring npm auth in CI or local environment.
