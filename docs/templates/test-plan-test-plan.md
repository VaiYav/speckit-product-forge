> Template for `testing/test-plan.md` — written by `test-plan` Step 7.

When `a11y_gate: none`, add the Entry Criteria line
`a11y_gate: none — automated floor disabled by config` so the omitted a11y tests
are auditable.

````markdown
# Test Plan: {Feature Name}

> Created: {date} | Phase: 8A
> Feature: `{feature-slug}`
> Environment: {FRONTEND_URL}

## Scope

### In Scope
{Features and flows being tested}

### Out of Scope
{What is explicitly NOT being tested — and why}

## Test Types & Estimated Duration

| Type | Count | Est. Duration | Files |
|------|-------|--------------|-------|
| Smoke | {N} | ~5 min | playwright-tests/{slug}-smoke.spec.ts |
| E2E Playwright | {N} | ~{N*2} min | playwright-tests/{slug}-*.spec.ts |
| API/Integration | {N} | ~{N} min | — |
| Regression | {N} | ~{N*3} min | playwright-tests/{slug}-regression.spec.ts |
| Unit | {N} | ~{N} min | test framework (test-cases.md → TC-UNIT) |
| Integration | {N} | ~{N} min | test framework (test-cases.md → TC-INT) |

**Total estimated:** ~{N} minutes

## Environment
- Frontend: {FRONTEND_URL}
- API: {API_URL}
- Browsers: {list}
- Auth required: {yes/no}

## Test Case Summary

### Coverage Matrix

| User Story | Smoke | E2E | API | Regression | Coverage |
|------------|-------|-----|-----|-----------|---------|
| US-001: {title} | TC-SMK-001 | TC-E2E-001,002 | TC-API-001 | — | ✅ Full |
| US-002: {title} | — | TC-E2E-005 | TC-API-003,004 | TC-REG-001 | ✅ Full |

### Complete Test Case Index
{Link to test-cases.md}

## Unit Tests

Framework: {detected framework} | Cases: TC-UNIT-001..{NNN} (full rows in test-cases.md)

### Unit Coverage Targets

| Unit | Workspace | Target branches | Priority |
|------|-----------|-----------------|----------|
| {unit} | {workspace} | {N} of {N} | P{0-4} |

## Integration Tests

Cases: TC-INT-001..{NNN} (full rows in test-cases.md). `test-run` 4F reads the
backing services below.

### Backing Services per Case

| ID | Collaboration | Fixture / backing | Started via |
|----|---------------|-------------------|-------------|
| TC-INT-001 | {A ↔ B} | {e.g. Testcontainers Postgres 15} | {testcontainers / docker-compose / in-memory / shared} |

### Integration Coverage Targets

| Boundary | Workspace | Minimum % | Notes |
|----------|-----------|-----------|-------|
| {boundary} | {workspace} | {N}% | {notes} |

## Entry Criteria (before testing starts)
- [ ] All Phase 7 verify-full CRITICAL issues resolved
- [ ] Feature deployed to test environment
- [ ] Test data seeded / reset
- [ ] Playwright installed: `npx playwright install`
- [ ] a11y floor dep installed: `npm i -D @axe-core/playwright`
- [ ] Credentials configured in `testing/env.md`

## Exit Criteria (testing complete when)
- [ ] All P0 smoke tests PASS
- [ ] All E2E happy paths PASS
- [ ] ≥80% of all test cases PASS
- [ ] Zero P0/P1 open bugs
- [ ] All P2 bugs documented with workarounds

## Bug Severity Definition
| Severity | Definition | Examples |
|----------|-----------|---------|
| P0 Blocker | Cannot proceed with testing | App crashes, auth broken |
| P1 Critical | Core user journey broken | Primary action fails |
| P2 High | Important feature broken | Edge case fails, UX degraded |
| P3 Medium | Minor issue | Wrong text, small layout issue |
| P4 Low | Cosmetic | Typo, pixel misalignment |

## How to Run Tests

### Agent-driven execution (Phase 8B — recommended)
Run `/speckit.product-forge.test-run` — the AI agent reads `test-cases.md` and executes
each step interactively using `playwright-cli`.

> Requires: [`playwright-cli`](https://github.com/microsoft/playwright-cli) installed globally.
> See project README → Requirements.

### CI/CD pipeline execution
```bash
# Smoke tests (run first)
npx playwright test --grep @smoke

# All E2E tests for this feature
npx playwright test testing/playwright-tests/{slug}-*.spec.ts

# Regression tests
npx playwright test --grep @regression

# Single test by ID
npx playwright test --grep "TC-E2E-001"

# Run with UI mode (debug)
npx playwright test --ui
```
````
