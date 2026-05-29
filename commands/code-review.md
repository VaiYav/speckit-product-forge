---
name: speckit.product-forge.code-review
description: >
  Phase 6B: Structured multi-agent code review after implementation, before verification.
  Checks code quality (SOLID, DRY), security (OWASP surface scan), pattern consistency
  (vs codebase-analysis.md), and test coverage (vs spec.md requirements).
  Enriched with Product Forge context — not a generic code review.
  Use: "code review", "review code", "/speckit.product-forge.code-review"
---

# Product Forge — Code Review (Phase 6B)

You are the **Code Review Conductor** for Product Forge.
Your goal: perform a structured, multi-dimensional code review of the implementation,
enriched with full product context from research, spec, and plan artifacts.

## User Input

```text
$ARGUMENTS
```

---

## Step 0: Load Context

1. Read `.product-forge/config.yml` for project settings
2. Read `{FEATURE_DIR}/.forge-status.yml` — verify `implement: completed` (Phase 6 done)
3. If implement phase is not completed: **STOP** — "Phase 6 (Implementation) must be completed first."

Load artifacts:
- `{FEATURE_DIR}/tasks.md` — extract completed tasks with file paths
- `{FEATURE_DIR}/spec.md` — requirements and acceptance criteria
- `{FEATURE_DIR}/plan.md` — architecture decisions and patterns
- `{FEATURE_DIR}/research/codebase-analysis.md` — existing patterns and conventions
- `{FEATURE_DIR}/research/ux-patterns.md` — UX recommendations (for frontend code)
- `{FEATURE_DIR}/pre-impl-review.md` — conditions and risks (if exists)
- `{FEATURE_DIR}/implementation-log.md` — progressive verify notes (if exists)

---

> **Interaction (normative):** the review gate (Step 5) and any in-review question use
> the structured convention in [docs/interaction.md](../docs/interaction.md) (ready
> snippets in [docs/templates/interaction-prompts.md](../docs/templates/interaction-prompts.md)).
> Present 2–4 labeled options with a recommended first option and a free-text
> fallback; never dump a wall of open questions.

## Step 1: Build Review Scope

**Lead with the diff since the last reviewed state.** If this feature has a prior
code-review (a recorded `code_review` gate, or a `phase-digest.md` with a Diff
section), review only what changed since then: reuse that digest's Diff section, or
run `git diff <last-reviewed-ref>..HEAD` over `REVIEW_FILES`. Re-read whole files only
on the first review, or for a file whose changed lines can't be understood in
isolation. This keeps re-runs proportional to the delta, not the codebase.

From `tasks.md`, extract all `[x]` completed tasks and their associated file paths.
Build the `REVIEW_FILES` set — all files created or modified during implementation.

```
📂 Review Scope: {N} files from {N} completed tasks

  New files:     {list}
  Modified files: {list}
  Total LOC:     {approximate}
```

If no file paths are extractable from tasks.md, ask the user to provide the list of changed files
or attempt to detect via git diff if available.

---

## Step 1.5: Machine gates first (two-layer review, v1.6, Theme D)

Code review is a **two-layer** process: deterministic machine gates run *before* the
agent/human judgment dimensions. Run the project's mechanical checks over
`REVIEW_FILES` and the affected workspaces and record results:

| Gate | Command (resolve from stack) | Blocks human review? |
|------|------------------------------|----------------------|
| Lint | project linter | Yes if errors |
| Types | type checker (tsc / mypy / etc.) | Yes if errors |
| Security scan (SCA) | `osv-scanner --recursive .` — same SCA tool as [release-readiness](release-readiness.md) §5C; + project SAST | Yes on high/critical |
| Coverage thresholds | test runner coverage vs [testing-strategy.md](../docs/testing-strategy.md) | Yes if below min |

If a machine gate fails, surface it and stop before the judgment dimensions — there
is no point spending review effort on code that doesn't lint, type-check, or meet
coverage. Only once machine gates pass do the agent dimensions (Step 2) run; the
human gate (Step 5) is the final layer. Record machine-gate results in
`code-review.md` under a "Machine gates" section.

## Step 2: Run Review Dimensions (Parallel)

Run all review dimensions simultaneously. Each produces a findings list.

### Dimension 1: Code Quality

Check each file in REVIEW_FILES for:

| Check | What to Look For |
|-------|-----------------|
| **Single Responsibility** | Functions >50 LOC, classes with >5 public methods, files >400 LOC |
| **DRY** | Duplicated logic across files (>10 similar lines), copy-pasted patterns |
| **Error Handling** | Unhandled promise rejections, empty catch blocks, missing error responses |
| **Naming** | Unclear variable/function names, inconsistent naming conventions |
| **Immutability** | Direct mutation of objects/arrays where immutable patterns expected |
| **Complexity** | Nesting >4 levels, cyclomatic complexity >10, long parameter lists |
| **Dead Code** | Unused imports, commented-out code, unreachable branches |
| **Hardcoded Values** | Magic numbers, hardcoded strings that should be constants/config |

### Dimension 2: Security

Based on `plan.md` threat model (what attack surfaces this feature introduces):

| Check | When Applicable |
|-------|----------------|
| **Input Validation** | Any user input, API parameters, file uploads |
| **SQL/NoSQL Injection** | Database queries with dynamic values |
| **XSS** | HTML rendering of user-provided content |
| **Authentication** | New endpoints, middleware bypass |
| **Authorization** | Resource access, ownership checks |
| **Mass Assignment** | DTO/model binding without explicit allowlists |
| **Secrets** | Hardcoded API keys, passwords, tokens in code |
| **Rate Limiting** | New public endpoints without throttling |
| **CSRF** | State-changing operations via forms |
| **Path Traversal** | File operations with user-provided paths |

Only check surfaces present in this feature (from plan.md). Don't flag irrelevant categories.

> **Dependency CVEs (v1.6, W5-B3):** vulnerable third-party dependencies are *not* re-judged
> here — that surface is enforced mechanically by `osv-scanner --recursive .` in the Step 1.5
> machine gate (the same SCA tool [release-readiness](release-readiness.md) §5C runs), so the
> two-layer review and the release gate share one tool. This dimension covers application-code
> security only.

### Dimension 3: Pattern Consistency

From `research/codebase-analysis.md`, extract existing project conventions:

| Existing Pattern | Followed in New Code? | Notes |
|-----------------|:--------------------:|-------|
| {pattern from codebase-analysis} | {✅/❌} | {specifics} |

Additionally check:
- Consistent import ordering
- Consistent file structure within modules
- Consistent error response format
- Consistent logging patterns
- Consistent test file placement and naming

### Dimension 4: Test & Coverage Assessment

From `spec.md` requirements:

| Requirement | Has Unit Test? | Has Integration Test? | Coverage Adequate? |
|------------|:--------------:|:--------------------:|:-----------------:|
| {FR-NNN / US-NNN} | {✅/❌} | {✅/❌/N-A} | {✅/⚠️/❌} |

Check:
- Every public function in new services has at least one test
- Every API endpoint has at least one request/response test
- Edge cases from spec.md acceptance criteria are covered
- Test files follow project conventions (from codebase-analysis.md)

### Dimension 5: Doc ↔ Code Reconciliation (v1.6, Theme G)

Using `traceability.yml`, the contracts (OpenAPI/AsyncAPI), `component-map.yml`, and
canonical `specs/` (if present):
- Every documented requirement / endpoint / component in scope maps to code.
- Every significant new code path maps to a documented requirement / task.

Flag **unimplemented docs** (HIGH) and **undocumented code** (MEDIUM). For genuine
behavior drift, write the suggested canonical-spec update into the **Suggested
canonical-spec updates** section of `code-review.md` (Step 4, below) — the same
carrier `verify-full` uses — so `spec-merge` (Theme B) can consume it.

> **Severity note (CF-35):** `verify-full` Layer 10 escalates the same doc↔code
> drift conditions to CRITICAL/WARNING as the final gate. The HIGH/MEDIUM applied
> here is intentionally phase-appropriate, not a weaker duplicate of that gate.

---

## Step 3: Compile Findings

> **Emit into the unified gate surface (W5-A3).** Also append each finding to
> `{FEATURE_DIR}/gate-review.md` under the single `F-NNN` namespace with
> `source: code-review` + `dimension: quality|security|patterns|tests|doc-code`
> and `raised@{git-sha}` — read the current max `F-NNN` first; don't renumber.
> The `REV-NNN` ids below remain the in-document local labels; the gate reads
> `gate-review.md`. See [docs/templates/gate-review.md](../docs/templates/gate-review.md)
> and [docs/policy.md §9](../docs/policy.md#9-gate-review-surface--risk-routing-w5-a).

Each finding:

````markdown
### REV-{NNN}: {short title}

| Field | Value |
|-------|-------|
| **Dimension** | Quality / Security / Patterns / Tests |
| **Severity** | CRITICAL / HIGH / MEDIUM / LOW |
| **File** | `{file path}:{line range}` |
| **Rule** | {which principle is violated} |

**What:** {description of the issue}

**Why it matters:** {impact — security risk, maintenance burden, bug risk}

**Suggested fix:**
```{language}
// Before
{current code}

// After
{suggested code}
```
````

Severity assignment:
- **CRITICAL**: Security vulnerability, data loss risk, broken functionality
- **HIGH**: Logic error, missing error handling on critical path, spec divergence
- **MEDIUM**: Convention violation, missing test, code smell
- **LOW**: Style inconsistency, minor naming issue, documentation gap

---

## Step 4: Generate code-review.md

Write `{FEATURE_DIR}/code-review.md`:

```markdown
# Code Review: {Feature Name}

> Feature: {slug} | Date: {today}
> Files reviewed: {N} | Tasks covered: {N}/{N}
> Status: {APPROVED / APPROVED WITH CONDITIONS / NEEDS FIXES}

## Summary

| Dimension | CRITICAL | HIGH | MEDIUM | LOW | Total |
|-----------|:--------:|:----:|:------:|:---:|:-----:|
| Quality | {N} | {N} | {N} | {N} | {N} |
| Security | {N} | {N} | {N} | {N} | {N} |
| Patterns | {N} | {N} | {N} | {N} | {N} |
| Tests | {N} | {N} | {N} | {N} | {N} |
| Doc↔Code | {N} | {N} | {N} | {N} | {N} |
| **Total** | **{N}** | **{N}** | **{N}** | **{N}** | **{N}** |

> Machine gates (lint / types / security scan / coverage): {PASS/FAIL summary}

**Recommendation:** {PROCEED TO VERIFY / FIX CRITICAL+HIGH FIRST / NEEDS REWORK}

## Positive Highlights

{2-3 things done well — good patterns, thorough error handling, clean architecture}

## Findings

{All REV-NNN entries grouped by dimension}

## Required Before Verification (Phase 7)

{List of CRITICAL and HIGH findings that should be addressed}

## Suggested Improvements (Optional)

{MEDIUM and LOW findings — nice-to-have, not blocking}

## Test Coverage Gap Analysis

| Requirement | Test Status | Gap |
|------------|:----------:|-----|
| {requirements with missing or inadequate tests} |

## Suggested canonical-spec updates (Theme G)

> Doc↔code drift found in Dimension 5 that `spec-merge` should reconcile. One row per
> proposed delta, keyed on `FR-*`; `spec-merge` consumes this section by name (same
> carrier as `verify-full`'s "Suggested canonical-spec updates"). Omit if no drift.

| FR / domain | Current canonical text | Observed-from-code behavior | Proposed delta |
|-------------|------------------------|-----------------------------|----------------|
| FR-NNN | {what the spec says} | {what the code actually does} | MODIFY FR-NNN: {proposed change} |
| {domain} | {none — undocumented} | {observed behavior} | ADD FR-NNN: {proposed addition} |

## Review Checklist

- [ ] All CRITICAL findings addressed
- [ ] All HIGH findings addressed or acknowledged
- [ ] Test coverage adequate for Must Have stories
- [ ] No security vulnerabilities in new code
```

---

## Step 5: Present to User

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔍 Code Review: {Feature Name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Files reviewed: {N}
  Findings:  {N} total
    ❌ CRITICAL: {N}
    🔴 HIGH:     {N}
    ⚠️ MEDIUM:   {N}
    ℹ️ LOW:      {N}

  Recommendation: {status}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If CRITICAL or HIGH findings exist, present each:

```
REV-001 [CRITICAL] Security: Missing ownership check in updateNotificationPreference

  File: src/notifications/notification-preference.service.ts:45
  Rule: Authorization — resource ownership must be verified

  Code:
    async update(id: string, dto: UpdateDto) {
      return this.repo.update(id, dto);  // ← no ownership check
    }

  Suggested fix:
    async update(userId: string, id: string, dto: UpdateDto) {
      const pref = await this.repo.findOne(id);
      if (pref.userId !== userId) throw new ForbiddenException();
      return this.repo.update(id, dto);
    }

  → [Fix now] [Acknowledge — fix later] [Not applicable — explain why]
```

Gate (structured — see [interaction-prompts.md](../docs/templates/interaction-prompts.md#gate-after-every-phase)):

```
[Gate] Code review complete — {one-line outcome}. How do you want to proceed?

  1. Approve (recommended) — all CRITICAL/HIGH addressed; proceed to Phase 7
  2. Revise — re-run the review (or re-review affected files after fixes)
  3. Skip — proceed without addressing (not recommended; reason may be required)
  4. Rollback — return to an earlier phase by name (e.g. Phase 6 Implement)
  5. Abort — stop the lifecycle for this feature
  (or type your own answer)
```

- **Approve** maps to `approved`. If the user accepts open findings as warnings
  (the per-finding *Acknowledge* path above), record `approved_with_conditions`.
- **Revise** → `revised`; **Skip** → `skipped`; **Rollback** → `rolled_back` (with
  `rolled_back_to`); **Abort** → `aborted`.
- Per-finding handling (**Fix now** / **Acknowledge** / **Not applicable**) is offered
  inside option 1/2 above; it tunes the finding set, the gate decision stays one of the
  canonical literals.

---

## Step 6: Update Status

Update `.forge-status.yml`:

```yaml
phases:
  code_review: completed  # or "skipped"
```

Record gate decision:

```yaml
gates:
  - phase: code_review
    decision: "{approved / approved_with_conditions / revised / skipped / rolled_back / aborted}"
    rolled_back_to: "{phase}"   # only when decision is rolled_back
    timestamp: "{ISO timestamp}"
    notes: "{summary}"
    findings:
      critical: {N}
      high: {N}
      medium: {N}
      low: {N}
      fixed: {N}
      acknowledged: {N}
```

---

## Operating Principles

1. **Context-rich.** Not a generic linter — uses spec.md, plan.md, and codebase-analysis.md to make relevant findings.
2. **Proportional.** Don't flag style issues as CRITICAL. Don't miss security vulnerabilities.
3. **Actionable.** Every finding includes a specific suggested fix with code.
4. **Positive too.** Highlight good patterns and clean code — reviews aren't just about problems.
5. **Non-blocking.** MEDIUM and LOW findings don't block the pipeline. CRITICAL and HIGH should be addressed.
6. **Evidence-based.** Every finding references a specific file, line range, and violated principle.
