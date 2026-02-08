# Embedded Engine Benchmark

Manual micro-benchmark for `@hexmon_tech/engine-embedded`.

## Run

From repo root:

```bash
pnpm --filter @hexmon_tech/engine-embedded build
node packages/engine-embedded/bench/run.mjs
```

## What it reports

- `authorize()` throughput in `ops/sec`
- `batchAuthorize()` throughput for batch sizes `10` and `100`
- rough `p95` latency approximation from sampled per-call/per-batch durations

## Caveats

- This is a local micro-benchmark, not a production SLA measurement.
- Results vary by CPU, Node version, power mode, and background load.
- Cache is disabled intentionally to measure policy-evaluation cost.
- Benchmark does not run in CI by default.
