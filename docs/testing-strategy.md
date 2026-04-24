# Testing Strategy

> **Status:** normative for v1.5+
> **Consumers:** `test-plan` (Phase 8A), `test-run` (Phase 8B), `verify-full` (Phase 7), and the V-Model extension when installed.
> **Companions:** [phases.md](./phases.md), [runtime.md](./runtime.md#9-monorepo-aware-operations-b15).

This document defines **what to test, at which layer, with what tools,
and how much is enough** — framework-agnostic, applicable to any
stack Product Forge orchestrates (JavaScript / TypeScript, Python, Go,
Ruby, Java, .NET, Rust, and more).

If a project integrates the V-Model Extension Pack, the formal
V-Model artifacts (UTP / ITP / STP / ATP) **supplement** rather than
replace this strategy — see [v-model-integration.md](./v-model-integration.md).

---

## 1. Testing pyramid (universal)

```
                    ┌──────────────────┐
                    │   E2E            │  ~5-10%   slow, brittle, user-facing
                    │   (browser /     │
                    │    end-to-end)   │
                    ├──────────────────┤
                    │   Integration    │  ~15-25%  service ↔ service, DB, cache,
                    │   (contract,     │            queues, external APIs
                    │    service,      │
                    │    DB, messaging)│
                    ├──────────────────┤
                    │   Unit           │  ~65-80%  pure logic, fast, isolated
                    │   (pure logic,   │
                    │    utils,        │
                    │    components)   │
                    └──────────────────┘
```

The ratios are targets, not quotas. A library of pure functions might be
90% unit. A thin API wrapper with heavy cross-service behaviour might be
50% integration. Use the pyramid as a **warning when inverted** — if E2E
dominates, diagnostic feedback is slow and flakes cascade; if unit
dominates to 95%, real-world behaviour is undertested.

---

## 2. Which layer for what

### Unit tests — for logic that's a function of its inputs

Write a unit test when:

- The behaviour can be exercised with **plain data in, plain data out**.
- External dependencies can be substituted with **fakes or stubs** that
  capture the contract without emulating the real implementation.
- A regression here would be **cheap to localise** (the failure points
  at the exact faulty unit, not a cascade).

Good unit targets:
- Pure functions, reducers, validators, formatters, parsers, state
  machines.
- Service methods where side effects are injected (DI / adapter pattern
  / functional parameters).
- Components whose behaviour depends only on props (render output, event
  emissions).
- Domain primitives (money math, date arithmetic, identity / equality).

Bad unit targets (push down to the unit that contains the logic, or up
to integration):
- "This controller wires 6 services together" — no logic, just
  orchestration. Don't unit-test wiring.
- "This class calls an HTTP client" — the client is the integration
  point. Either test via integration or stub at the boundary (mock the
  wire, not the class).

### Integration tests — for behaviour that crosses a real boundary

Write an integration test when:

- Two components collaborate and the **contract between them** is
  non-trivial (could drift without either failing locally).
- The behaviour depends on a **real external system** (database, cache,
  queue, filesystem, time source, random source) and stubbing would
  erase the fidelity that matters.
- A regression here would **pass a unit test** because the unit was
  right in isolation but wrong against the real collaborator.

Good integration targets:
- Service → database (real queries, real migrations).
- Service → cache (TTL semantics, invalidation).
- Event emitter → listener (saga flows, idempotency on retries).
- Middleware stack order (auth → rate-limit → handler).
- Message queue producer → consumer round trip.
- File I/O with real filesystem (permission errors, atomic rename).

Integration tests can use **testcontainers** (per-test isolated Docker
instances), **in-memory drivers** (SQLite for Postgres, miniredis for
Redis) where behaviour is compatible, or **a shared test instance** when
parallelism is low and tear-down is well-defined.

### Contract tests (subset of integration) — for API and schema edges

Write a contract test when:

- The unit is consumed by **an external party** (a public API, a
  component published as a library, an event published to a bus with
  non-trivial subscribers).
- Breaking the contract would not surface in any internal test.

Tools: consumer-driven contract (Pact), OpenAPI schema validation, JSON
Schema round-trip, Avro / Protobuf compatibility checks.

Contract tests should block a merge, not a deploy — they catch breakage
before code lands, not after.

### E2E tests — for user-visible journeys

Write an E2E test when:

- The scenario is a **primary user journey** a stakeholder would demo.
- The failure modes you care about span the full stack (browser → API →
  DB → third-party → back).
- Lower-layer tests have already covered the logic; E2E validates
  **composition and wiring**, not correctness of individual steps.

Good E2E targets:
- Happy-path sign-up + first key action (primary conversion flow).
- Payment / checkout round trip.
- Critical rollback-risk surface (e.g. password reset, data export).

Bad E2E targets:
- Every permutation of form validation — push down to unit.
- Every edge case of business logic — push down to unit/integration.
- Third-party integration edge cases the third-party guarantees — stub
  at integration level instead.

### Performance, load, security, accessibility — separate tracks

These are not part of the pyramid; they run on their own cadence and
are out of scope for this document. Product Forge handles them via
Phase 9 release-readiness (monitoring, alerts), Phase 9B experiment
design, and dedicated skills (`lighthouse-audit`, `k6-load-testing`,
`security-check`).

---

## 3. Coverage criteria (by layer, not global)

Global line coverage as a KPI is **misleading**. Use per-layer rules.

### Unit

| Element | Minimum | Target | Notes |
|---------|:-------:|:------:|-------|
| Pure functions, validators, formatters | 90% | 95% | Cheap to reach; if tests are skipped here, the logic isn't really unit-isolated. |
| Service methods with DI | 80% | 90% | Must cover every non-trivial branch, not just happy paths. |
| Domain primitives | 95% | 100% | Finite state; no excuse. |
| UI components with pure logic (computed, emits) | 70% | 85% | Don't snapshot-test trivial render output. |

### Integration

| Element | Minimum | Target | Notes |
|---------|:-------:|:------:|-------|
| DB repositories / data access | 80% | 90% | One test per query kind, real DB, real migrations. |
| Message / event flow | 90% | 100% | Every emitter × listener combo. Idempotency case included. |
| API endpoints (happy + 4xx + auth) | 100% of public surface | — | Every public route has at least one contract + one failure case. |
| External-service adapters | 75% | 90% | Include timeout, retry, circuit-breaker paths. |

### E2E

| Element | Minimum | Target | Notes |
|---------|:-------:|:------:|-------|
| Primary user journeys | 100% | — | Every Must Have user story has an E2E smoke. |
| Alternative flows | 60% | 80% | Skip the long tail; rely on integration for edge permutations. |
| Error states | 50% | 70% | The ones a user can actually trigger. |

**Do not chase 100% global line coverage.** Eliminate the last 5% by
deleting untested dead code, not by adding tests for boilerplate.

---

## 4. Anti-patterns to reject

1. **Mirror tests.** A test that restates the implementation
   (`expect(add(2,3)).toBe(2+3)`). Change the implementation without
   changing behaviour — the test breaks. Worthless.

2. **Snapshot tests as the only assertion.** Snapshots confirm "the
   output is what it was last time", not "the output is correct". Use
   snapshots for UI regressions, not for logic.

3. **Mock-everything tests at integration level.** If every collaborator
   is stubbed, it is a unit test wearing a costume. Either commit to
   real collaborators (testcontainers, real DB) or demote to unit.

4. **Shared mutable fixtures.** Tests that depend on order-of-execution
   are time bombs. Every test must set up its own data or use an
   isolated transaction scope that rolls back.

5. **Flaky tests with `retry(3)` as a fix.** A retry is a bug report, not
   a fix. See §7.

6. **E2E coverage as a proxy for quality.** 50 Playwright scripts that
   each take 60s will catch fewer bugs per engineer-minute than 500
   well-targeted unit tests. Shape the pyramid.

7. **Testing the framework.** Vue, React, NestJS, Django, Rails, Go's
   HTTP server are themselves well-tested. Do not re-test them.

---

## 5. Framework-agnostic patterns

Product Forge's test phases do not prescribe a framework — they
**detect** one and generate tests in its style. Patterns that translate
everywhere:

### 5.1 Arrange — Act — Assert (AAA) structure

```
test("registers a user with a new email") {
  // Arrange
  let repo = InMemoryUserRepo()
  let service = UserService(repo)

  // Act
  let result = service.register("new@example.com", "password123")

  // Assert
  expect(result).toBeOk()
  expect(repo.count()).toBe(1)
}
```

Three blocks, clearly separated. One act per test.

### 5.2 Test data builders over ad-hoc constructors

```
// Bad — unclear which fields matter
let u = new User("id-1", "a@b.com", "x", "NONE", true, now(), null, [])

// Good — builder shows what matters to THIS test
let u = aUser().withEmail("a@b.com").active().build()
```

Defaults absorb churn; the test stays readable.

### 5.3 One assertion per behaviour, not one per file

A test that asserts 12 things about the same call is fine — if the 12
assertions describe one coherent behaviour. A test that asserts 12
unrelated things is three tests masquerading as one.

### 5.4 Naming: describe the behaviour, not the method

- ✅ `test("rejects registration with empty email")`
- ❌ `test("register_EmptyEmail_Rejects")`
- ❌ `test("UserService.register case 7")`

The name should survive a rename of the unit under test.

### 5.5 Deterministic clocks and randomness

Inject `clock` and `random` as dependencies. Tests that need "now" or
"a random id" pass a frozen clock or a seeded RNG. Tests that use the
real system clock are flaky by design.

---

## 6. Test-runner detection (per stack)

Test phases auto-detect the runner. Common signatures:

| Ecosystem | Signals | Default command |
|-----------|---------|-----------------|
| Node / TS | `vitest.config.*`, `jest.config.*`, `package.json > scripts.test` | `pnpm test` / `npm test` |
| Python | `pytest.ini`, `pyproject.toml > [tool.pytest]`, `setup.cfg` | `pytest` |
| Go | `*_test.go` files | `go test ./...` |
| Ruby | `spec/`, `Gemfile` includes `rspec` | `bundle exec rspec` |
| Rust | `Cargo.toml`, `tests/` | `cargo test` |
| Java | `pom.xml`, `build.gradle`, `src/test/` | `mvn test` / `gradle test` |
| .NET | `*.Tests.csproj` | `dotnet test` |
| PHP | `phpunit.xml*`, `composer.json > autoload-dev` | `vendor/bin/phpunit` |

Monorepo mode composes these with the workspace template from
[runtime.md §9.3](./runtime.md#93-test-runner-resolution).

---

## 7. Flaky-test handling

A flaky test is a test that sometimes passes and sometimes fails
without a code change. Treatment:

1. **Quarantine immediately.** Move to a `flaky/` suite that runs but
   does NOT gate CI. The green bar must not lie.
2. **Root-cause within one sprint.** Flakes are usually one of: race
   condition in code under test, race in the test, real clock /
   random / network, shared state. Diagnose — do not retry.
3. **Delete if unfixable.** A test that cannot be made deterministic is
   worse than no test. It adds noise and erodes trust. Delete and write
   a replacement.
4. **Never add `retry(3)` to a test to make CI green.** If CI green is
   lying, fix the lie.

---

## 8. Test-data management

Integration and E2E tests need data. Options by trade-off:

| Strategy | Isolation | Setup cost | Realism |
|----------|:---------:|:----------:|:-------:|
| Per-test fresh DB (testcontainers) | perfect | high | perfect |
| Transaction rollback per test | good | low | perfect |
| Truncate tables per test | good | medium | perfect |
| Seeded shared DB | poor | once | perfect |
| Fixtures loaded per test | good | medium | fair |
| In-memory stand-in (SQLite, miniredis) | perfect | low | approximate |

Default: transaction rollback for DB, testcontainers for cache /
queues. Shared seeded DB is acceptable only when parallelism is low
and tear-down is automated.

For E2E: use a dedicated test tenant / environment with synthetic
users. Never run E2E against production.

---

## 9. Monorepo-aware execution

In monorepo mode (see [runtime.md §9](./runtime.md#9-monorepo-aware-operations-b15)),
tests run per workspace:

```
# pnpm monorepo
pnpm --filter=backend test
pnpm --filter=frontend test

# nx monorepo
nx run-many -t test --projects=backend,frontend

# turbo monorepo
turbo run test --filter=backend --filter=frontend
```

Benefits:
- Parallelism (each workspace runs independently).
- Affected-only runs (in nx / turbo — run tests only for workspaces
  touched by the feature, using `task_log[].paths` as the filter).
- Per-workspace coverage reports.

Test phases in monorepo mode honour the `scope.paths` of the feature
being tested: a feature touching only `backend` does not trigger
`frontend` tests unless E2E is explicitly requested.

---

## 10. When to supplement with V-Model

If the V-Model Extension Pack is installed and `feature_mode: v-model`:

- `speckit.v-model.unit-test` produces **white-box unit test plans**
  with five named techniques per module (boundary value, equivalence
  class, decision table, state-based, control-flow).
  This document's §2 Unit layer is the generic equivalent.
- `speckit.v-model.integration-test` produces ISO 29119-4 integration
  plans with four named techniques per architecture module.
  This document's §2 Integration layer is the generic equivalent.
- `speckit.v-model.system-test` produces system test plans tied to
  system components (SYS-NNN).
  E2E in this document maps to system tests at the user-visible boundary.

Use the V-Model outputs as the **test plans** (what to test). Use this
document as the **style guide** (how to write each test). They are
complementary, not duplicative.

---

## 11. Integration with Product Forge phases

| Phase | Testing activity |
|-------|-----------------|
| 5B Tasks | Tasks declare `Paths:` and implicitly define test targets per workspace. |
| 6 Implement | Per-task progressive verify runs unit tests for touched paths. |
| 8A Test Plan | Extracts `TC-UNIT-NNN` (§5E), `TC-INT-NNN` (§5F), `TC-SMK/E2E/API/REG` from spec artifacts. |
| 8B Test Run | Executes all test kinds through the same auto-fix loop — see [test-run.md §4E/4F](../commands/test-run.md). |
| 7 Verify Full | Cross-checks: every Must Have story has at least one test, every test maps to a story. |
| 9 Release Readiness | Confirms per-layer coverage thresholds met. |
| V13 Audit Report (v-model only) | Ingests JUnit results into the traceability matrix. |

---

## 12. What this document is NOT

- Not a list of test tools to buy. Product Forge does not endorse any
  specific framework.
- Not a guarantee of quality. A project can have 95% coverage and
  still ship broken software — coverage is a necessary-but-not-
  sufficient signal.
- Not a replacement for code review. Tests verify behaviour the author
  thought of; review catches behaviour the author missed.
- Not a substitute for production observability. Tests catch bugs
  before ship; metrics / logs / traces catch bugs after.
