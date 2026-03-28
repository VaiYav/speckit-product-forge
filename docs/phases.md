# Product Forge — Phase Reference

Full documentation for each of the 9 Product Forge lifecycle phases (7 required + 2 optional testing phases).

---

## Phase 1: Research

**Command:** `/speckit.product-forge.research`
**Output:** `features/{slug}/research/`
**Gate:** User approves research before Phase 2

### What happens

Three research agents run **in parallel**:
1. **Competitor Research** — finds 5-8 competitors, analyzes their feature implementation, identifies gaps and best practices
2. **UX/UI Patterns** — researches best interactions, flows, empty states, animations, accessibility requirements
3. **Codebase Analysis** — explores your codebase, finds reusable components, identifies integration points

Two additional agents run **if opted-in**:
4. **Tech Stack** — compares libraries and APIs with download stats, license, and bundle size
5. **Metrics/ROI** — estimates business impact, KPIs, measurement plan

### Questions asked

| Question | Mandatory? |
|----------|-----------|
| Feature description | Yes |
| List of competitors (or auto-find?) | Optional |
| Run tech stack research? | Optional |
| Run metrics/ROI analysis? | Optional |
| Additional context (links, constraints) | Optional |

### Output files

| File | Always? | Description |
|------|---------|-------------|
| `research/README.md` | ✅ | Master index + executive summary + open questions |
| `research/competitors.md` | ✅ | Competitor table + patterns + top implementations |
| `research/ux-patterns.md` | ✅ | Flows + states + micro-interactions + anti-patterns |
| `research/codebase-analysis.md` | ✅ | Integration points + reusable components + complexity |
| `research/tech-stack.md` | Optional | Library comparison table + recommendation |
| `research/metrics-roi.md` | Optional | KPI benchmarks + ROI model + measurement plan |

---

## Phase 2: Product Spec

**Command:** `/speckit.product-forge.product-spec`
**Output:** `features/{slug}/product-spec/`
**Gate:** User approves document plan before writing, then approves output

### What happens

An interactive spec creation session. The agent asks upfront about desired detail levels,
then conducts a brief interview, then generates all documents.

### Detail Level Configuration (asked before writing)

| Setting | Options | Impact |
|---------|---------|--------|
| Feature size | Small / Medium / Large | Determines auto-decomposition |
| Spec detail | Concise / Standard / Exhaustive | product-spec.md length |
| Journey format | Simple / Standard / Multi-file | user-journey file count |
| Wireframe fidelity | Text / Basic HTML / Detailed HTML | wireframe format |
| Wireframe count | N screens | triggers decomposition if >3 |
| Mockup style | None / Generic / Project-styled | whether mockups.html are created |
| Metrics doc | None / Concise / Detailed | metrics.md detail |

### Interview (7 questions, asked together)

1. Target user(s) — persona specifics
2. Primary goal — the #1 outcome
3. Non-goals — explicit out-of-scope
4. Success criteria — measurable definition of done
5. Hard constraints — technical, legal, time
6. Priority user stories (optional — agent generates if not provided)
7. Open questions — known unknowns

### Output files

| File | Always? |
|------|---------|
| `product-spec/README.md` | ✅ |
| `product-spec/product-spec.md` | ✅ |
| `product-spec/user-journey.md` (or multiple) | ✅ |
| `product-spec/wireframes.md` (or folder) | ✅ |
| `product-spec/metrics.md` | Optional |
| `product-spec/mockups/index.html` + screens | Optional |
| Feature root `README.md` | ✅ |

---

## Phase 3: Revalidation

**Command:** `/speckit.product-forge.revalidate`
**Output:** `features/{slug}/review.md`
**Gate:** Explicit "APPROVED" / "LGTM" from user

### What happens

The agent presents a structured summary of all product-spec documents.
The user reviews the actual files and provides corrections in chat.
The agent applies changes and loops until approval.

### Approval keywords

Any of: `APPROVED`, `LGTM`, `все ок`, `approve`, `👍`, `ready`

### What gets logged in review.md

- User's exact words for each correction
- Files modified + type of change (modify/add/remove/restructure)
- Agent notes about edge cases
- Final approval timestamp and document inventory

### Consistency check before lock

Before locking, the agent automatically verifies:
- All cross-links in README files are valid
- All referenced files exist
- User stories in product-spec align with user-journey flows

---

## Phase 4: Bridge → SpecKit

**Command:** `/speckit.product-forge.bridge`
**Output:** `features/{slug}/spec.md`
**Gate:** User approves spec.md; then SpecKit mode is selected

### What happens

All research and product-spec artifacts are synthesized into a single `spec.md`.
This spec is richer than a manually written spec: it includes research context,
competitive intelligence, UX recommendations, and technical integration notes.

### SpecKit Mode Selection

| Mode | When to use | Phases triggered |
|------|-------------|-----------------|
| Classic | Well-scoped features, clear requirements | plan → tasks → implement → verify |
| V-Model | Complex features, safety-critical, need full traceability | v-model-requirements → architecture → system-design → module-design → [tests] → implement |

### What goes into spec.md

- Problem statement + research backing (with links to research/)
- User personas
- User stories with acceptance criteria (from product-spec.md)
- Functional + non-functional requirements
- Technical context (from codebase-analysis.md)
- Integration points
- Success metrics
- Risks
- Links to all product-spec and research documents

---

## Phase 5: Plan + Tasks

**Command:** `/speckit.product-forge.implement` (handles both plan and tasks sub-phases)
**Output:** `features/{slug}/plan.md` + `features/{slug}/tasks.md`
**Gates:** Two separate human gates — one after plan, one after tasks

### Cross-validation checks (Plan)

| Check | Severity if fails |
|-------|------------------|
| All Must Have stories addressed? | Warning |
| Integration matches codebase analysis? | Warning |
| NFR approach defined? | Warning |

### Cross-validation checks (Tasks)

| Check | Severity if fails |
|-------|------------------|
| Every Must Have US has ≥1 task? | Critical |
| Every FR has ≥1 task? | Warning |
| Test tasks included? | Warning |
| No orphan tasks (untraceable)? | Warning |

---

## Phase 6: Implementation

**Command:** `/speckit.product-forge.implement` (continues after tasks approval)
**Output:** Code files (per tasks.md)
**Gate:** All tasks `[x]`

Delegates to SpecKit `implement`. Product Forge adds:
- Context note about product-spec location for implementation agents
- Reference to wireframes for UI implementation
- Reference to acceptance criteria per story

---

## Phase 7: Full Verification

**Command:** `/speckit.product-forge.verify-full`
**Output:** `features/{slug}/verify-report.md`
**Gate:** No CRITICAL findings (or user acknowledges)

### 6 Verification Layers

| Layer | What it checks |
|-------|---------------|
| 1: Code ↔ Tasks | Every task has verifiable code |
| 2: Code ↔ Plan | All planned components implemented |
| 3: Stories ↔ Code | Every Must Have story implemented + tested |
| 4: spec.md ↔ product-spec | No spec drift from approved product spec |
| 5: Research alignment | Key research recommendations followed |
| 6: Document integrity | All cross-links valid, no broken references |

### Severity levels

| Severity | Meaning | Blocks completion? |
|----------|---------|-------------------|
| ❌ CRITICAL | Genuine implementation gap or scope violation | Yes |
| ⚠️ WARNING | Deviation that may be intentional | No |
| ✅ PASSED | Check verified successfully | — |
| ⏭️ SKIPPED | Cannot verify (missing context) | No |

---

## Phase 8A: Test Plan *(Optional)*

**Command:** `/speckit.product-forge.test-plan`
**Output:** `features/{slug}/testing/`
**Gate:** User approves test plan before execution

### What happens

The agent automatically detects your test setup, then generates test cases for every user story
and creates runnable Playwright `.spec.ts` files. No manual test writing required.

### Auto-detection

| What | How |
|------|-----|
| Test framework | Detect Jest / Vitest in package.json |
| E2E framework | Detect Playwright / Cypress in devDependencies |
| Frontend port | Scan `package.json` scripts for `--port`, `vite.config.*`, `.env` |
| API base URL | Detect `VITE_API_URL`, `API_URL`, NestJS config files |
| Existing tests | Count files in `src/**/*.spec.*`, `test/`, `e2e/` |
| Auth flow | Detect login page pattern from frontend routes |

### Test types generated

| Type | ID Format | Source | Description |
|------|-----------|--------|-------------|
| Smoke | `TC-SMK-NNN` | Key Must Have stories | App loads, auth works, primary action reachable |
| E2E | `TC-E2E-NNN` | All user stories | Full happy path + key error paths |
| API | `TC-API-NNN` | Functional requirements | Request/response contract validation |
| Regression | `TC-REG-NNN` | Adjacent existing features | Existing functionality not broken |

### Generated files

| File | Description |
|------|-------------|
| `testing/test-plan.md` | Master plan: types, FRONTEND_URL, entry/exit criteria, run commands |
| `testing/test-cases.md` | All test cases searchable by ID and story |
| `testing/env.md` | Credentials (added to `.gitignore`) |
| `testing/playwright-tests/playwright.config.ts` | Playwright configuration |
| `testing/playwright-tests/{slug}-smoke.spec.ts` | Smoke test file |
| `testing/playwright-tests/{slug}-e2e.spec.ts` | E2E test file |
| `testing/playwright-tests/{slug}-api.spec.ts` | API test file (if applicable) |
| `testing/playwright-tests/{slug}-regression.spec.ts` | Regression test file |
| `bugs/README.md` | Initialized empty bug dashboard |

### Test file conventions

- All test IDs in comments: `// TC-E2E-001 | US-003 — User registers successfully`
- Credentials via `process.env`: `process.env.TEST_EMAIL`, `process.env.TEST_PASSWORD`
- Selectors prefer `data-testid`: `page.getByTestId('submit-button')`
- Story mapping comments included for traceability

---

## Phase 8B: Test Run *(Optional)*

**Command:** `/speckit.product-forge.test-run`
**Output:** `features/{slug}/bugs/`, `features/{slug}/test-report.md`
**Gate:** ≥80% pass rate AND zero P0/P1 open bugs

### What happens

Tests are executed in priority order, bugs are created and auto-fixed, then a full retest pass
runs, and finally a test report is generated with full traceability.

### Execution order

```
1. Smoke Tests     → block all further testing if any P0 test fails
2. E2E Tests       → full user story coverage
3. API Tests       → contract validation
4. Regression      → ensure existing features still work
```

### Bug severity levels

| Severity | What triggers it | Action |
|----------|-----------------|--------|
| P0 Blocker | Smoke test failure or auth broken | Auto-fix or ask user to abort |
| P1 Critical | Must Have story E2E failure | Auto-fix required |
| P2 High | Should Have story or error state failure | Auto-fix attempted |
| P3 Medium | Edge case or cosmetic failure | Document, optional fix |
| P4 Low | Regression test on low-risk path | Document only |

### Auto-fix loop (P0/P1)

For each P0 or P1 bug:
1. Fix Agent analyzes the bug and applies minimal fix
2. Single test retest: `npx playwright test --grep "TC-{ID}"`
3. Smoke regression check after every P0/P1 fix
4. If still failing after fix → escalate to user with options

### Gap analysis per bug

Every bug file includes a gap analysis checkbox:
- `[ ] Implementation bug` → fix code
- `[ ] Spec gap` → update `spec.md` (lightweight — no full Phase 3 rerun)
- `[ ] Test issue` → fix the test
- `[ ] Environment issue` → not a product bug

### Exit criteria (configurable in test-plan.md)

- All P0 smoke tests PASS
- All E2E happy paths PASS
- ≥80% of all tests PASS
- Zero P0/P1 open bugs
- All P2+ bugs documented with workarounds

### Output

| File | Description |
|------|-------------|
| `bugs/README.md` | Live dashboard: P0–P4 counts, open/fixed/deferred |
| `bugs/BUG-NNN.md` × N | One per bug: steps, evidence, gap analysis, fix, retest |
| `test-report.md` | Final report: pass rate, story coverage, traceability chain |
