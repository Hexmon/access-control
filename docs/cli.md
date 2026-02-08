# ACX CLI

## Install

```bash
pnpm add -D @hexmon_tech/cli
```

## Commands

### `acx init`

Scaffold a starter `policy.json` and `policy-tests/` folder.

```bash
acx init --dir .
```

### `acx validate <policy.json>`

Validate schema and compile policy diagnostics.

```bash
acx validate examples/policies/basic.policy.json
acx validate examples/policies/multi-tenant.policy.json --mode multi-tenant
```

Exit codes:

- `0`: valid policy with no compile errors
- `1`: validation/compile errors
- `2`: usage errors

### `acx test <tests-folder>`

Run golden policy tests using the embedded engine.

```bash
acx test examples/policy-tests/basic
acx test examples/policy-tests/multi-tenant --mode multi-tenant
```

Optional explicit policy path:

```bash
acx test examples/policy-tests/basic --policy examples/policies/basic.policy.json
```

### `acx types <policy.json> --out <file>`

Generate deterministic TypeScript policy types.

```bash
acx types examples/policies/basic.policy.json --out src/policy-types.ts
```

### `acx diff <oldPolicy.json> <newPolicy.json>`

Print a human-readable summary of rule/role/constraint changes.

```bash
acx diff examples/policies/basic.policy.json examples/policies/multi-tenant.policy.json
```

## Golden test format

Each test case is a JSON file:

```json
{
  "name": "allow read",
  "input": {
    "principal": { "id": "u1", "type": "user", "tenantId": "tenant-a" },
    "resource": { "type": "post", "id": "p1" },
    "action": { "name": "post:read" },
    "context": { "tenantId": "tenant-a" }
  },
  "expectedAllow": true,
  "expectedObligations": [],
  "expectedErrorCode": "ACX_ERR_MISSING_TENANT"
}
```

Fields:

- `name`: case label
- `input`: `AuthorizationInput`
- `expectedAllow`: expected decision allow/deny
- `expectedObligations` (optional): exact obligation array match
- `expectedErrorCode` (optional): expected thrown acx error code

Folder layout:

```text
policy-tests/
  policy.json
  tests/
    case-a.json
    case-b.json
```

## CI example

```yaml
- run: pnpm install --frozen-lockfile
- run: pnpm build
- run: pnpm test
- run: pnpm --filter @hexmon_tech/cli build
- run: pnpm exec acx validate examples/policies/basic.policy.json
- run: pnpm exec acx test examples/policy-tests/basic
```
