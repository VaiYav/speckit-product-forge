# test-run — API, unit and integration execution

> Reference for `test-run` Step 4 (sections 4C, 4E, 4F). Read only the section
> for a test type present in `testing/test-cases.md`. Smoke, E2E and regression
> cases use the browser pattern in the command (4.1–4.6, plus 4.7 for smoke and
> E2E).

Results from every section here feed the same triage, bug and auto-fix loop as
browser cases (`test-run` Steps 5–8).

## 4C: API tests (TC-API-NNN)

Run when `TC-API-*` cases exist. For each case, open the endpoint directly, or
use `run-code` with `fetch` for POST / PUT:

```bash
playwright-cli -s=pf-api open {API_URL}{endpoint}
playwright-cli -s=pf-api snapshot
# POST / PUT:
playwright-cli -s=pf-api run-code "async page => {
  const res = await page.evaluate(async () => {
    const r = await fetch('{API_URL}{endpoint}', {
      method: '{METHOD}',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({PAYLOAD})
    });
    return { status: r.status, body: await r.json() };
  });
  return JSON.stringify(res);
}"
playwright-cli -s=pf-api close
```

Compare the actual response status and body with the case's expected values.

## 4E: Unit tests (TC-UNIT-NNN)

Non-browser: run through the detected test framework (Vitest / Jest / pytest /
go test / cargo test / RSpec / PHPUnit / …) with no Playwright context, browser
or auth setup. Announce: framework, workspace filter (`scope.paths` joined), and
affected-only (`true` when tasks touched paths; `false` runs the full suite).

Per case:

1. Read the TC-UNIT from `testing/test-cases.md`.
2. Locate its existing test file, or the file it belongs in by convention
   (`*.spec.ts`, `*_test.go`, …).
3. Resolve the workspace-scoped command
   ([runtime.md §9.3](../runtime.md#93-test-runner-resolution)):
   - Single-root pnpm: `pnpm test --run -t "TC-UNIT-{NNN}"`
   - Monorepo pnpm: `pnpm --filter={workspace} test --run -t "TC-UNIT-{NNN}"`
   - pytest: `pytest -k "TC_UNIT_{NNN}"`
   - go test: `go test -run TestTCUnit{NNN} ./...`
4. Execute; capture stdout, stderr and exit code.
5. Parse the result: PASS / FAIL / SKIP.
6. Record it in `testing/results-{run_n}.json` with duration, and the stack on FAIL.

Evidence on failure (no screenshot): full test output (stdout + stderr); the
source diff if the implementation changed between runs; a heap snapshot (opt-in,
for memory-sensitive tests).

Unit fixes are usually pure-logic patches: the fix diff is small and the retest
is a single task.

## 4F: Integration tests (TC-INT-NNN)

Non-browser; may need a backing service (DB, cache, queue). Announce the backing
services and how they start (testcontainers / docker-compose / in-memory /
shared).

Pre-flight:

1. Read the backing services per TC-INT case from `testing/test-plan.md`
   (Integration Tests → Backing Services per Case) and the case's
   fixture / backing column in `testing/test-cases.md`.
2. **testcontainers** — check the Docker socket is available; when it is not,
   warn and record the case BLOCKED.
3. **docker-compose** — start the referenced compose file detached, wait for
   health checks, verify the service endpoints.
4. **in-memory** stand-in (miniredis, SQLite) — the test initialises it; no
   pre-flight.
5. **shared test DB** — acquire a transaction scope that rolls back when the test
   completes.

Per case:

1. Resolve the command per `workspace_type` (same templates as 4E).
2. Pass the backing-service connection strings as environment variables
   (typically `TEST_DATABASE_URL`, `TEST_REDIS_URL`).
3. Execute. Each test runs in its own transaction (rolled back) or its own
   container (torn down).
4. Capture exit code, duration and any coverage data.
5. Parse the result.
6. Record it in `testing/results-{run_n}.json`.

Evidence on failure: full test output; the last 100 lines of the relevant
backing-service logs (DB query log, Redis MONITOR output, queue events);
`docker inspect` container state when using testcontainers / docker-compose; a
schema / migration state snapshot for DB failures.

Isolation: every 4F test starts and ends with the backing-service state the next
test expects (transactions, containers, or explicit truncate steps). A test that
depends on prior test state is a bug — log it as a quarantine candidate
([testing-strategy.md §7](../testing-strategy.md#7-flaky-test-handling)).

Monorepo: a cross-workspace TC-INT (e.g. frontend apiClient calling backend
`/users`) runs under the runner of `scope.primary`; when `scope.primary` is
ambiguous, use the consumer workspace (the frontend in that example).
