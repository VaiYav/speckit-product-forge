# Test fixtures

This directory holds **test input for the helper scripts** — it is not part of
the shipped plugin (it ships in the repo for CI/dev only, like a test suite).

## `features/demo/`

A complete, internally-consistent Product Forge feature state used as a
known-good input by `scripts/doctor.js` (and referenced by the QA plan's
quick-smoke in `docs/qa/plugin-test-plan.md §9`):

- `.forge-status.yml` — a standard-mode feature that has completed implement +
  test_run cleanly (v3 schema).
- `traceability.yml` — a matrix where every `must_have` row reaches a task +
  code + test and every journey/edge has a test, so it passes
  `validate-traceability.js --strict` with zero findings.
- `product-spec/journeys/journeys.yml` — the structured journeys mirror.

These files exercise the scripts against **real files** (not just their in-memory
`--selftest` fixtures), so a schema rename or a logic regression is caught the
moment `doctor` runs:

```bash
node scripts/validate-traceability.js --feature-dir fixtures/features/demo --strict
node scripts/gate-risk.js            --feature-dir fixtures/features/demo
node scripts/doctor.js               # includes the fixture smoke
```

When you change `docs/schema/forge-status-v3.schema.yml` or a script's expected
shape, update this fixture in lockstep — `doctor` failing on the fixture is the
signal that producers/consumers drifted.
