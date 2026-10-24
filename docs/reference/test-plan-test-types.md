# test-plan — API, regression, unit and integration cases

> Reference for `test-plan` Step 5 (sections 5C–5F). Read only the section for a
> test type the plan generates. Smoke (5A) and E2E (5B) stay in the command.

## 5C: API test cases (TC-API-NNN) — when API tests are selected

For each API endpoint identified in the plan: happy path (200/201), invalid input
(400), unauthorized (401), not found (404), and edge cases.

```markdown
## API Tests (TC-API-NNN)

| ID | Endpoint | Method | Input | Expected Status | Expected Body |
|----|----------|--------|-------|----------------|---------------|
| TC-API-001 | /api/feature | GET | valid token | 200 | {schema} |
| TC-API-002 | /api/feature | GET | no token | 401 | error message |
[...]
```

## 5D: Regression test cases (TC-REG-NNN) — when regression tests are selected

Identify existing features this change could affect: the integration points in
`research/codebase-analysis.md` and the shared components in `plan.md`.

```markdown
## Regression Tests (TC-REG-NNN)

| ID | Existing Feature | Risk | Test Scenario | Expected |
|----|----------------|------|--------------|----------|
| TC-REG-001 | {feature name} | {how new feature could break it} | {test} | {expected} |
[...]
```

## 5E: Unit test cases (TC-UNIT-NNN)

Derive from `plan.md` module boundaries and `spec.md` behavioural acceptance
criteria. Targets per the Unit layer of
[testing-strategy.md §2](../testing-strategy.md#2-which-layer-for-what):

- Pure functions, validators, formatters, parsers.
- Service methods with dependency injection (external deps faked).
- Domain primitives (money math, date arithmetic, identity).
- UI components whose behaviour depends only on props (render output, event
  emissions).

Leave pure wiring (controllers that only delegate), framework code and simple
getters/setters out of TC-UNIT: cover that behaviour in the unit that holds the
logic, or at integration level.

```markdown
## Unit Tests (TC-UNIT-NNN)

| ID | Unit | Workspace | Scenario | Input | Expected | Covers |
|----|------|-----------|----------|-------|----------|--------|
| TC-UNIT-001 | validateEmail | shared | Rejects empty string | "" | { ok: false, reason: "empty" } | FR-003 |
| TC-UNIT-002 | validateEmail | shared | Rejects missing @ | "foo" | { ok: false, reason: "format" } | FR-003 |
| TC-UNIT-003 | validateEmail | shared | Accepts valid RFC 5322 | "a@b.com" | { ok: true } | FR-003 |
| TC-UNIT-004 | UserService.register | backend | First registration wins on race | two concurrent calls, same email | exactly one `created`, one `duplicate` | FR-007 |
| TC-UNIT-005 | PriceFormatter | frontend | Formats amount under 1 unit | 0.42 | "0.42 USD" | UI-012 |
[...]
```

Fields:
- **Unit** — fully-qualified name (class / method / function / component).
- **Workspace** — monorepo only; omit the column in a single-root project.
- **Scenario** — the behaviour, not the implementation; the name survives a
  rename of the unit under test.
- **Covers** — story ID, functional requirement ID, or ADR ID.

For each distinct unit, add a coverage-target row to the summary:

```markdown
### Unit Coverage Targets

| Unit | Workspace | Target branches | Priority |
|------|-----------|-----------------|----------|
| validateEmail | shared | 4 of 4 | P0 |
| UserService.register | backend | 8 of 9 (skip: legacy NULL path) | P0 |
| PriceFormatter | frontend | 6 of 6 | P1 |
```

**Monorepo:** unit IDs stay globally unique (`TC-UNIT-NNN`); group them by
workspace in the summary so each workspace team can filter its slice.

## 5F: Integration test cases (TC-INT-NNN)

Integration tests beyond endpoint contracts: the boundaries where behaviour
crosses a real collaborator (DB, cache, queue, event bus, filesystem, external
HTTP), per the Integration layer of
[testing-strategy.md §2](../testing-strategy.md#2-which-layer-for-what). Derive
from the `plan.md` data model, the event patterns in
`research/codebase-analysis.md`, and `spec.md` NFRs (e.g. "quota enforced across
concurrent requests").

```markdown
## Integration Tests (TC-INT-NNN)

| ID | Collaboration | Workspace | Scenario | Fixture / backing | Expected | Covers |
|----|---------------|-----------|----------|-------------------|----------|--------|
| TC-INT-001 | UserService ↔ Postgres | backend | Register persists row | Testcontainers Postgres 15 | row exists, unique constraint honoured | FR-007 |
| TC-INT-002 | UserService ↔ Redis | backend | Session cached with TTL | miniredis | key present at 299s, absent at 301s | NFR-session |
| TC-INT-003 | RegisterCommand → UserCreated event | backend | Saga compensates on listener failure | in-memory event bus | rollback applied, metric emitted | FR-007 |
| TC-INT-004 | UserRepository migrations | backend | v2 → v3 upgrade preserves rows | test DB loaded with v2 data | all rows present, columns added | MIG-003 |
| TC-INT-005 | Frontend apiClient ↔ backend /users | cross-workspace | Handles 401 with refresh token | MSW mock + real token endpoint | retries once, succeeds on second attempt | FR-009 |
[...]
```

Fields:
- **Collaboration** — which components interact and over what boundary.
- **Fixture / backing** — testcontainers, in-memory stand-in, shared test DB
  with rollback, MSW mocks, etc. Name the specific tool.
- **Covers** — requirement / NFR / migration ID.

Reject these anti-patterns
([testing-strategy.md §4](../testing-strategy.md#4-anti-patterns-to-reject)):

- Every collaborator stubbed — that is a unit test in disguise.
- Shared mutable state across tests — use transaction rollback or per-test fresh
  containers.
- "Retry on flake" — diagnose the cause instead.

```markdown
### Integration Coverage Targets

| Boundary | Workspace | Minimum % | Notes |
|----------|-----------|-----------|-------|
| Service ↔ DB (every repository method) | backend | 90% | Real Postgres via testcontainers. |
| Event emitter ↔ listener (every pair) | backend | 100% | Include idempotency retest. |
| Frontend apiClient ↔ each endpoint | cross-workspace | 80% | MSW mocks acceptable; one real contract test per endpoint. |
```

**Monorepo:** a TC-INT may span two or more workspaces (listed as
`cross-workspace`, as TC-INT-005). It runs under the runner of the feature's
primary workspace (`scope.primary`).
