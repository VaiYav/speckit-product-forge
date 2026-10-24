---
name: speckit.product-forge.test-plan
description: >
  Creates the feature's test plan (Phase 8A): detects the test setup, interviews
  for environment and test types, and generates TC-* cases from journeys and
  stories plus per-journey Playwright specs. Use after verify-full, before test-run.
---

# Product Forge — Phase 8A: Test Planning

You are the **Test Plan Architect**. Turn the feature's user stories, journeys and
acceptance criteria into an executable test plan before any test runs. You produce
both execution artifacts together: `testing/test-cases.md`, which `test-run`
(Phase 8B) executes step by step with
[`playwright-cli`](https://github.com/microsoft/playwright-cli), and
`testing/playwright-tests/*.spec.ts`, the CI/CD companion run with
`npx playwright test`.

## Input

```text
$ARGUMENTS
```

Follow the [command contract](../docs/runtime.md#0-command-contract).

- **Phase key:** `test_plan` (Phase 8A)
- **Config keys:** `e2e_runner`, `a11y_gate`, `codebase_path` / `codebase.paths`,
  `require_testing`, `require_skip_reason`
- **Writes:** `testing/env.md`, `testing/test-plan.md`, `testing/test-cases.md`,
  `testing/playwright-tests/*.spec.ts` + `playwright.config.ts`,
  `bugs/README.md`, the `tests` column of `traceability.yml`, a `.gitignore`
  entry, the feature `README.md`, `phases.test_plan.status`
- **Contract deltas:** on *Skip Test Run* this command also writes
  `phases.test_run.status: skipped` + `skip_reason`.

## Step 1: Check readiness

1. `.forge-status.yml` → `phases.verify.status: completed` (Phase 7 done).
2. `spec.md` and `product-spec/product-spec.md` exist.
3. Every implementation task in `tasks.md` is `[x]`.

When a check fails, stop with:
> ⚠️ Phase 7 (verify-full) must be completed before test planning.
> Run: `/speckit.product-forge.verify-full`

Set `TESTING_DIR = {FEATURE_DIR}/testing/` and `BUGS_DIR = {FEATURE_DIR}/bugs/`.

## Step 2: Auto-detect the project setup

Before asking anything, scan the codebase:

| Item | Look for |
|------|----------|
| Test framework (Vitest / Jest / Mocha / pytest / RSpec / other) | `vitest.config.*`, `jest.config.*`, `package.json` `scripts.test`, `.mocharc.*` |
| E2E framework (Playwright / Cypress / Selenium) | `playwright.config.*`, `cypress.json`, `cypress.config.*` |
| Frontend URL | `vite.config.*`, `next.config.*`, `nuxt.config.*` → `server.port` or the `dev` script port |
| Backend URL | `nest-cli.json`, `package.json` main script, `.env` `PORT` |
| Existing tests | count `*.spec.*`, `*.test.*`, `e2e/**`, `tests/**` |
| Docker / CI | `docker-compose.yml`, `.github/workflows/`, `Dockerfile` |
| Env files | `.env.example`, `.env.test`, `.env.local` — variable **names** only; never log values |

Report the findings, one line each, e.g.:

```
Auto-detected:
  Test framework:  Vitest (vitest.config.ts found)
  E2E framework:   Playwright (playwright.config.ts found)
  Frontend:        http://localhost:5173 (vite.config.ts port: 5173)
  Backend:         http://localhost:3000 (.env PORT=3000)
  Existing tests:  47 spec files, 3 e2e files
  Docker:          docker-compose.yml found (services: app, db)
  Env template:    .env.example (12 variables)
```

Result: every item above is detected or marked unknown.

## Step 3: Interview for the test environment

Ask as structured prompts, pre-filled with the Step 2 values. Group related items
(the two URLs together; test types and browsers as `multiSelect` toggles):

1. **Frontend URL** — where Playwright navigates (e.g. `http://localhost:5173`,
   `https://staging.myapp.com`).
2. **Backend / API URL** — base URL for API tests (e.g. `http://localhost:3000/api`).
3. **Test credentials** — do tests need login? If yes, a test account email +
   password, stored only in `testing/env.md`, never in code.
4. **Additional env vars** — names only (e.g. `STRIPE_TEST_KEY, GOOGLE_CLIENT_ID`);
   ask for values only when needed.
5. **Test types** — Smoke (critical path, runs first, ~5 min) · E2E Playwright
   (full journeys, ~15–30 min) · API / Integration (endpoint contracts, ~5–10 min) ·
   Regression (existing features keep working, ~10–20 min) · Custom.
6. **Scope** — Minimal (happy path + 2–3 critical edge cases) · Standard (happy
   paths + main edge cases + error states) · Full (all stories, all acceptance
   criteria, all edge cases).
7. **Browser / platform targets** — Chromium (default) · Firefox · WebKit ·
   mobile viewport (375px) · tablet viewport (768px).

Result: `FRONTEND_URL`, `API_URL`, `TEST_TYPES`, `TEST_SCOPE`, `BROWSERS`,
`HAS_AUTH` set.

## Step 4: Write the environment config

Write `{TESTING_DIR}/env.md` from
[docs/templates/test-plan-env.md](../docs/templates/test-plan-env.md). It is a
reference file for test execution, not a `.env` file. Add `testing/env.md` to
`.gitignore` when absent, so credentials stay out of version control.

## Step 5: Derive the test cases

Read:

1. `product-spec/journeys/journeys.yml` — the **authoritative E2E source**: every
   `JRN` / `STEP` / `EDGE` ([docs/journeys.md](../docs/journeys.md)).
2. `product-spec/product-spec.md` — Must-Have user stories + acceptance criteria.
3. `product-spec/mockups/component-map.yml` — stable selectors per `CMP-*` region.
4. `spec.md` — acceptance criteria (may be more detailed than the product spec).
5. `research/ux-patterns.md` — extra edge cases and the state inventory.

E2E cases come **directly from `journeys.yml`**: each `STEP.action` becomes an
action, each `STEP.expect` / `EDGE.then` an assertion, with selectors from
`component-map.yml`. `playwright-cli` is the default runner
(`e2e_runner: playwright-cli`).

Build the case matrix, one section per type:

| Section | IDs | Generated | Source |
|---------|-----|-----------|--------|
| 5A Smoke | `TC-SMK-NNN` | always, first | critical path |
| 5B E2E | `TC-E2E-NNN` | every `JRN` | `journeys.yml` |
| 5C API | `TC-API-NNN` | when API tests are selected | endpoints in the plan |
| 5D Regression | `TC-REG-NNN` | when regression tests are selected | integration points, shared components |
| 5E Unit | `TC-UNIT-NNN` | always | `plan.md` modules, `spec.md` AC |
| 5F Integration | `TC-INT-NNN` | always | real-collaborator boundaries |

Sections 5C–5F (rules, table formats, coverage-target tables, monorepo grouping)
are in [docs/reference/test-plan-test-types.md](../docs/reference/test-plan-test-types.md).

### 5A: Smoke cases

4–8 critical-path scenarios answering "does the feature basically work?":

```markdown
## Smoke Tests (TC-SMK-NNN)

| ID | Title | Steps | Expected | Priority |
|----|-------|-------|----------|----------|
| TC-SMK-001 | Feature loads without error | 1. Navigate to {URL} 2. Feature renders | No JS errors, content visible | P0 |
| TC-SMK-002 | Primary action works | 1. Perform {main action} | {expected outcome} | P0 |
[...]
```

### 5B: E2E cases (from `journeys.yml`)

Per `JRN`: one **happy-path** case covering every `STEP` in order, plus one case
per **`EDGE`** (alternate / error / boundary), keyed by its priority. Map every
case to its journey IDs so `traceability.yml` and `verify-full` can check
coverage — a Must-Have `JRN` or a P0/P1 `EDGE` without a TC is a failure.

```markdown
## E2E Tests: {JRN-NNN journey title} (TC-E2E-NNN)

| ID | Journey | Covers | Scenario | Steps (JRN/STEP) | Expected | Story |
|----|---------|--------|----------|------------------|----------|-------|
| TC-E2E-001 | JRN-001 | STEP-001..002 | Happy path | STEP-001 → STEP-002 | {success state} | US-001 |
| TC-E2E-002 | JRN-001 | EDGE-001 | Save fails (500) | STEP-002 + EDGE-001 | error toast, revert | US-001 |
[...]
```

## Step 6: Generate the Playwright specs (from journeys)

Create `{TESTING_DIR}/playwright-tests/` and write one
`{feature-slug}-{journey-name}.spec.ts` **per `JRN`** from
[docs/templates/test-plan-playwright-spec.md](../docs/templates/test-plan-playwright-spec.md):

1. Translate mechanically: `STEP.action` → a Playwright action; `STEP.expect` /
   `EDGE.then` → an assertion.
2. Resolve selectors from `mockups/component-map.yml` / `design-system/manifest.yml`
   (`CMP-*` → its stable `selector`, e.g. `[data-cmp='button']`); use
   `data-testid` only when no component selector exists.
3. Tag **each** `test(...)` with a `// Journey: JRN-NNN STEP-NNN..NNN / EDGE-NNN`
   comment (the 5B column shape) so `test-run` maps a failure to the step it
   broke, and add comments mapping it to its `US-NNN` and AC text.
4. Credentials come from `process.env`; never hardcode them. Include setup /
   teardown for test isolation.
5. **Accessibility test, one per `JRN`, gated on `a11y_gate`** (default `axe`):
   - `axe` → emit the `@axe-core/playwright` test: `new AxeBuilder({ page })
     .withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()`, then
     `expect(a11y.violations, 'JRN-NNN …').toEqual([])`, scanned at the journey's
     end state. It is an automated AA floor (the automated half of the bridge AC
     "Accessibility requirements pass automated + manual testing"); manual review
     is still required. Add `@axe-core/playwright` to the project's dev deps via
     the test-plan Entry Criteria when absent.
   - `none` → emit no a11y test and record
     `a11y_gate: none — automated floor disabled by config` in the test-plan
     Entry Criteria, so the omission is auditable.
   - Non-browser journeys get no a11y test regardless of the key.
6. **Component + variant + design-token conformance test, one per `JRN`**. For
   every `component-map.yml` region whose `journeys:` includes this `JRN`, read its
   `component` (`CMP-*`) and `variant`, look up the component's `selector` in
   `design-system/manifest.yml`, and emit three assertions: (1) the component is
   visible at its manifest `selector`; (2) `toHaveAttribute('data-variant',
   '<region.variant>')`; (3) the component's computed style equals the relevant
   `manifest.tokens.*` CSS var resolved on `:root` via `getComputedStyle`
   (catches token drift / hardcoded hex). These tests belong to this Phase 8A
   generator only — `verify-full` is read-only and has no running app.

Write `{TESTING_DIR}/playwright-tests/playwright.config.ts` from the same
template when it does not exist, with one project per selected browser.

Result: every `JRN` has a spec with its happy path, one test per `EDGE`, the
conformance test, and the a11y test unless `a11y_gate: none`.

## Step 7: Write the test plan

Write `{TESTING_DIR}/test-plan.md` from
[docs/templates/test-plan-test-plan.md](../docs/templates/test-plan-test-plan.md):
scope, test types with counts and durations, environment, the story coverage
matrix, the Unit and Integration sections (coverage targets; backing services
per TC-INT case, which `test-run` 4F reads), entry criteria, severity definitions (P0–P4) and how to run (agent-driven
and CI). Its **Exit Criteria** are the ones `test-run` checks: all P0 smoke tests
PASS · all E2E happy paths PASS · ≥80% of all test cases PASS · zero P0/P1 open
bugs · all P2 bugs documented with workarounds.

## Step 8: Write the test cases

Write `{TESTING_DIR}/test-cases.md` — every case in one searchable document, the
primary input of `test-run`. Each TC-SMK, TC-E2E, TC-API, TC-REG case carries:

- preconditions;
- steps written as **discrete UI actions** (navigate, click, fill, wait, assert),
  one `playwright-cli` command each;
- the expected result (what to verify via snapshot / screenshot / DOM assertion);
- a `**Journey:** JRN-NNN | **Steps:** STEP-NNN to NNN | **Edge:** EDGE-NNN`
  header line (the 5B column shape);
- the linked story (`US-NNN`) and AC.

```markdown
## TC-E2E-001: Happy path — {title}

**Preconditions:** User is logged in. No data exists for {feature}.
**Journey:** JRN-001 | **Steps:** STEP-001 to 002 | **Edge:** — (none — happy path)
**Story:** US-001 | **AC:** 1.1, 1.2

| # | Action | playwright-cli equivalent |
|---|--------|--------------------------|
| 1 | Navigate to {url} | `playwright-cli goto {url}` |
| 2 | Click "{button label}" | `playwright-cli click "text={button label}"` |
| 3 | Fill "{field label}" with "{value}" | `playwright-cli fill "[name={field}]" "{value}"` |
| 4 | Click "Submit" | `playwright-cli click "[data-testid=submit]"` |
| 5 | Assert: success toast appears | `playwright-cli snapshot` → verify "Success" visible |

**Expected result:** {outcome}
**Screenshot point:** After step 4
```

Also write every TC-UNIT and TC-INT case (Step 5E / 5F) into `test-cases.md`,
one row per case in the table format of
[docs/reference/test-plan-test-types.md](../docs/reference/test-plan-test-types.md):
TC-UNIT with unit, workspace, scenario, input, expected, covers; TC-INT with
collaboration, workspace, scenario, **fixture / backing**, expected, covers.
`test-run` 4E / 4F read them from there.

Result: `test-run` can translate every browser step without interpretation and
finds every unit and integration case with its backing services.

### Step 8.1: Write the `tests` column of the traceability matrix

`test-plan` is the registered writer of the `tests` column in
`{FEATURE_DIR}/traceability.yml`
([docs/templates/traceability-matrix.md](../docs/templates/traceability-matrix.md)):

- Each requirement row: `tests: [TC-*]` = the cases that cover it, matched via the
  row's `story` / `journeys` keys and each case's `**Story:**` / `**Journey:**`
  header.
- The `journeys` block: each journey's `tests:` (journey-level E2E / smoke cases)
  and each edge's `tests:` (its `TC-E2E` cases).
- Leave row `status` unchanged — `test-run` sets `status: tested`.

When the matrix does not exist yet (Phase 5 tasks not run), skip this step and
leave the column null for a later run.

## Step 9: Create the bug tracker

Write `{BUGS_DIR}/README.md` from
[docs/templates/test-plan-bugs-readme.md](../docs/templates/test-plan-bugs-readme.md)
(empty dashboard and bug list, status legend).

## Step 10: Present results and gate

Show a short summary:

- cases generated per type (Smoke / E2E / API / Regression / Unit / Integration)
  and the spec files that hold the Playwright ones;
- coverage: `{N}/{N}` Must-Have stories covered;
- files created: `testing/test-plan.md`, `testing/test-cases.md`,
  `testing/env.md` (⚠️ add to `.gitignore`), `testing/playwright-tests/{slug}-*.spec.ts`;
- execution options: agent-driven → `/speckit.product-forge.test-run`
  (recommended); CI/CD → `npx playwright test testing/playwright-tests/{slug}-*.spec.ts`;
- before running: install `playwright-cli` (README → Requirements), run
  `npx playwright install`, set credentials in `testing/env.md`, start the app
  at `{FRONTEND_URL}`.

Gate: outcome = "{N} cases across {types}, {N}/{N} Must-Have stories covered";
next phase = Phase 8B: Test Execution. Offer **Skip Test Run** only when Test Run
is `opt` for the feature's mode and `require_testing` is not `true`.

| Option | Decision | Status |
|--------|----------|--------|
| Approve | `approved` (or `approved_with_conditions` + `conditions` when typed with conditions) | `phases.test_plan.status: completed` |
| Skip Test Run | `skipped` + `skip_reason` (asked when `require_skip_reason: true`; empty → ask again) | `phases.test_plan.status: completed`; `phases.test_run.status: skipped` + `skip_reason` |
| Revise | `revised` | `phases.test_plan.status: in_progress` |
| Rollback | `rolled_back` + `rolled_back_to` (only `completed` phases offered) | that phase and every later one → `pending`; rewound artifacts archived per [policy.md §8](../docs/policy.md#8-change-management) |
| Abort | `aborted` | unchanged |

## Step 11: Update status

```yaml
phases:
  test_plan:
    status: completed        # per the Step 10 decision
  test_run:                  # only on "Skip Test Run"
    status: skipped
    skip_reason: "{reason}"
```

Case counts, the Playwright file count and the environment URL live in
`testing/test-plan.md`, not in the status file (not in the canonical schema).
The gate entry is `phase: test_plan` with `conditions` / `skip_reason` /
`rolled_back_to` as applicable.

On `approved`, mark Phase 8A ✅ Complete in the feature `README.md`.

## Done when

- `testing/env.md` is written and `testing/env.md` is in `.gitignore`.
- The Step 5 matrix holds every section the table requires: 4–8 smoke cases, a
  happy-path case for every `JRN`, a case for every `EDGE`, API / regression cases
  for each selected type, unit and integration cases.
- `testing/test-cases.md` holds every TC-SMK, TC-E2E, TC-API and TC-REG case,
  each with preconditions, discrete action steps, an expected result, a Journey
  line and a story / AC link, plus every TC-UNIT and TC-INT case from the
  matrix, each TC-INT with its fixture / backing.
- No Must-Have `JRN` and no P0/P1 `EDGE` is without a TC; Must-Have story
  coverage (`{N}/{N}`) is reported in Step 10.
- Every `JRN` has a `.spec.ts` with the conformance test, and the a11y test
  unless `a11y_gate: none` (then the Entry Criteria note it);
  `playwright.config.ts` exists.
- `testing/test-plan.md` carries the coverage matrix, the Unit and Integration
  sections (backing services listed for every TC-INT case), entry criteria and
  the five exit criteria; `bugs/README.md` exists.
- `traceability.yml` `tests` columns are filled, or the step was skipped because
  the matrix does not exist.
- Standalone: the gate was shown, the decision recorded and `phases.test_plan`
  (and `phases.test_run` on skip) set from it. `--from-forge`: the outcome line
  and gate extras (`conditions` / `skip_reason`) returned to forge, with no gate
  prompt and no status write.
