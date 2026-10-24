# Testing Strategy

> **Status:** normative
> **Consumers:** `test-plan` (Phase 8A), `test-run` (Phase 8B), `verify-full` (Phase 7), and the V-Model extension when installed.
> **Companions:** [phases.md](./phases.md), [runtime.md](./runtime.md#9-monorepo-aware-operations-b15).

**What to test, at which layer, with what tools, and how much is enough** —
framework-agnostic, for any stack Product Forge orchestrates (JavaScript /
TypeScript, Python, Go, Ruby, Java, .NET, Rust, and more). With the V-Model
Extension Pack, the formal V-Model artifacts (UTP / ITP / STP / ATP)
**supplement** this strategy (§10).

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

The ratios are targets, not quotas (a pure-function library might be 90% unit; a
thin API wrapper with heavy cross-service behaviour might be 50% integration).
Treat an **inverted** pyramid as the warning: E2E-dominant means slow diagnostics
and cascading flakes; 95% unit means real-world behaviour is undertested.

---

## 2. Which layer for what

### Unit tests — for logic that's a function of its inputs

Write a unit test when:

- The behaviour can be exercised with **plain data in, plain data out**.
- External dependencies can be substituted with **fakes or stubs** that capture
  the contract without emulating the real implementation.
- A regression would be **cheap to localise** (the failure points at the exact
  faulty unit, not a cascade).

Good targets: pure functions, reducers, validators, formatters, parsers, state
machines; service methods with injected side effects (DI / adapter pattern /
functional parameters); components whose behaviour depends only on props; domain
primitives (money math, date arithmetic, identity / equality).

Bad targets (push down to the unit that holds the logic, or up to integration):
pure wiring ("this controller wires 6 services together" — leave wiring to
integration); "this class calls an HTTP client" — test via integration or stub at
the boundary (mock the wire, not the class).

### Integration tests — for behaviour that crosses a real boundary

Write an integration test when:

- Two components collaborate and the **contract between them** is non-trivial
  (could drift without either failing locally).
- The behaviour depends on a **real external system** (database, cache, queue,
  filesystem, time source, random source) and stubbing would erase the fidelity
  that matters.
- A regression would **pass a unit test** because the unit was right in isolation
  but wrong against the real collaborator.

Good targets: service → database (real queries, real migrations); service → cache
(TTL semantics, invalidation); event emitter → listener (saga flows, idempotency
on retries); middleware stack order (auth → rate-limit → handler); message queue
producer → consumer round trip; file I/O on a real filesystem (permission errors,
atomic rename).

Use **testcontainers** (per-test isolated Docker instances), **in-memory drivers**
(SQLite for Postgres, miniredis for Redis) where behaviour is compatible, or **a
shared test instance** when parallelism is low and tear-down is well-defined
(trade-offs: §8).

### Contract tests (subset of integration) — for API and schema edges

Write a contract test when the unit is consumed by **an external party** (a public
API, a published component library, an event with non-trivial subscribers) and
breaking the contract would not surface in any internal test.

Tools: consumer-driven contract (Pact), OpenAPI schema validation, JSON Schema
round-trip, Avro / Protobuf compatibility checks. Contract tests block a merge
(before code lands), not a deploy.

### E2E tests — for user-visible journeys

Write an E2E test when:

- The scenario is a **primary user journey** a stakeholder would demo.
- The failure modes you care about span the full stack (browser → API → DB →
  third-party → back).
- Lower-layer tests already cover the logic; E2E validates **composition and
  wiring**, not correctness of individual steps.

Good targets: happy-path sign-up + first key action (primary conversion flow);
payment / checkout round trip; critical rollback-risk surfaces (e.g. password
reset, data export).

Bad targets: every permutation of form validation (push down to unit); every edge
case of business logic (unit/integration); third-party edge cases the third party
guarantees (stub at integration level).

### Performance, load, security, accessibility — separate tracks

These run on their own cadence, outside the pyramid and this document: Phase 9
release-readiness (monitoring, alerts), Phase 9B experiment design, and dedicated
skills (`lighthouse-audit`, `k6-load-testing`, `security-check`).

**Exception — the automated accessibility AA floor.** A deterministic **WCAG-AA
floor** runs per E2E journey inside the pipeline: the Phase 8A generator emits one
`@axe-core/playwright` check per `JRN` and Phase 8B executes it inside the normal
browser run ([`commands/test-run.md §4.7`](../commands/test-run.md)). Gated by
`a11y_gate: axe | none` (default `axe`; [config.md](./config.md#e2e-testing)). It is
a *minimum bar only*: comprehensive and manual accessibility review (keyboard
traversal, screen-reader semantics, contrast judgment, cognitive load) remains the
separate track. Passing it means the automatable subset of WCAG 2.0/2.1 A + AA has
no violations at the journey's end state — not that the feature is fully
accessible.

**Companion — runtime component + design-token conformance.** In the same Phase 8A
generated specs, per `JRN`: DOM assertions that the rendered component matches the
design-system manifest — component present at its `[data-cmp=…]` selector, correct
`data-variant`, computed CSS values equal to the manifest design token. This is
runtime conformance against the design system; Product Forge deliberately avoids
pixel-diffing against static mockups.

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

Stop short of 100% global line coverage: close the last 5% by deleting untested
dead code, not by testing boilerplate.

---

## 4. Anti-patterns to reject

1. **Mirror tests.** A test that restates the implementation
   (`expect(add(2,3)).toBe(2+3)`) breaks on refactors that keep behaviour.
2. **Snapshot tests as the only assertion.** Snapshots confirm "same as last
   time", not "correct". Use them for UI regressions, not logic.
3. **Mock-everything tests at integration level.** With every collaborator
   stubbed it is a unit test in costume — use real collaborators (testcontainers,
   real DB) or demote to unit.
4. **Shared mutable fixtures.** Every test sets up its own data or uses an
   isolated transaction scope that rolls back; order-dependent tests are time
   bombs.
5. **Flaky tests with `retry(3)` as a fix.** A retry is a bug report, not a fix
   (§7).
6. **E2E coverage as a proxy for quality.** 50 Playwright scripts at 60s each
   catch fewer bugs per engineer-minute than 500 well-targeted unit tests. Shape
   the pyramid.
7. **Testing the framework.** Vue, React, NestJS, Django, Rails, Go's HTTP server
   are already well-tested; test your code on top of them.

---

## 5. Framework-agnostic patterns

Product Forge's test phases **detect** the project's framework and generate tests
in its style. Patterns that translate everywhere:

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

Three clearly separated blocks; one act per test.

### 5.2 Test data builders over ad-hoc constructors

Prefer `aUser().withEmail("a@b.com").active().build()` over
`new User("id-1", "a@b.com", "x", "NONE", true, now(), null, [])`: the builder shows
what matters to this test and its defaults absorb churn.

### 5.3 One assertion per behaviour, not one per file

Many assertions are fine when they describe one coherent behaviour; unrelated
assertions belong in separate tests.

### 5.4 Naming: describe the behaviour, not the method

- ✅ `test("rejects registration with empty email")`
- ❌ `test("register_EmptyEmail_Rejects")`
- ❌ `test("UserService.register case 7")`

The name should survive a rename of the unit under test.

### 5.5 Deterministic clocks and randomness

Inject `clock` and `random` as dependencies; tests pass a frozen clock or a seeded
RNG. The real system clock makes a test flaky by design.

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

A flaky test sometimes passes and sometimes fails without a code change.
Treatment:

1. **Quarantine immediately.** Move it to a `flaky/` suite that runs but does NOT
   gate CI, so the green bar stays honest.
2. **Root-cause within one sprint.** Flakes are usually a race in the code under
   test, a race in the test, real clock / random / network, or shared state.
   Diagnose instead of retrying.
3. **Delete if unfixable.** A test that cannot be made deterministic is worse than
   no test; delete it and write a replacement.
4. **Never add `retry(3)` to make CI green** — fix the cause.

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

Default: transaction rollback for DB, testcontainers for cache / queues. A shared
seeded DB is acceptable only when parallelism is low and tear-down is automated.

For E2E: use a dedicated test tenant / environment with synthetic users. Never run
E2E against production.

---

## 9. Monorepo-aware execution

In monorepo mode ([runtime.md §9](./runtime.md#9-monorepo-aware-operations-b15)),
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

This gives per-workspace parallelism, affected-only runs (nx / turbo, filtered by
`task_log[].paths`), and per-workspace coverage.

Test phases honour the feature's `scope.paths`: a feature touching only `backend`
does not trigger `frontend` tests unless E2E is explicitly requested.

---

## 10. When to supplement with V-Model

With the V-Model Extension Pack installed and `feature_mode: v-model`
([v-model-integration.md](./v-model-integration.md)):

- `speckit.v-model.unit-test` produces **white-box unit test plans** with five
  named techniques per module (boundary value, equivalence class, decision table,
  state-based, control-flow) — the formal counterpart of §2 Unit.
- `speckit.v-model.integration-test` produces ISO 29119-4 integration plans with
  four named techniques per architecture module — the counterpart of §2
  Integration.
- `speckit.v-model.system-test` produces system test plans tied to system
  components (SYS-NNN); E2E here maps to system tests at the user-visible boundary.

Use the V-Model outputs as the **test plans** (what to test) and this document as
the **style guide** (how to write each test).

---

## 11. Integration with Product Forge phases

| Phase | Testing activity |
|-------|-----------------|
| 5B Tasks | Tasks declare `Paths:` and implicitly define test targets per workspace. |
| 6 Implement | Per-task progressive verify runs unit tests for touched paths. |
| 8A Test Plan | Extracts `TC-UNIT-NNN`, `TC-INT-NNN`, `TC-SMK/E2E/API/REG` from spec artifacts, and generates per `JRN` the AA floor and component/token conformance check (§2) into the per-journey `.spec.ts` — see [test-plan.md](../commands/test-plan.md). |
| 8B Test Run | Executes all test kinds through the same auto-fix loop ([test-run.md](../commands/test-run.md); unit and integration runs in §4E / §4F). The AA floor and conformance checks run **inside the normal browser run**, not as a separate gate ([test-run.md §4.7](../commands/test-run.md)); a violation is a test failure like any other. |
| 7 Verify Full | Cross-checks: every Must Have story has at least one test, every test maps to a story. |
| 9 Release Readiness | Confirms per-layer coverage thresholds met. |
| V13 Audit Report (v-model only) | Ingests JUnit results into the traceability matrix. |

---

## 12. What this document is NOT

Not a tool shopping list (no framework is endorsed), not a guarantee of quality
(coverage is necessary but not sufficient), and not a replacement for code review
or production observability.
