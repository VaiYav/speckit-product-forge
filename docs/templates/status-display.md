> Template for the `status` console views — written by `status` Steps 1, 4 and 5 (nothing is written to disk).

## Feature list (Step 1 — several features, none requested)

```
Product Forge Features

Found {N} features:

  1. {feature-name}        [{current-phase}] — Last updated: {date}
  2. {feature-name}        [{current-phase}] — Last updated: {date}

Which feature to inspect? (enter number or name, or "all" for overview)
```

## Single feature (Step 4)

Render only the in-scope phases from Step 3, in phase-map order. The phase rows
below are a standard-mode example.

```
Product Forge Status: {Feature Name}

  Feature:  {feature-slug}
  Created:  {created_at}
  Updated:  {last_updated}
  Mode:     {feature_mode}                      (express / lite / standard / v-model)
  SpecKit sub-flow: {speckit_mode}              (only when set — standard / v-model, written by Phase 4)
  {If backfilled: "Backfilled: yes — reverse-engineered from code (see gaps-report.md)"}

  Phase Lifecycle:
  ✅ Phase 1 · Research          [COMPLETE]
     └── {N} research documents in research/
         competitors.md · ux-patterns.md · codebase-analysis.md
         {+ tech-stack.md if exists} {+ metrics-roi.md if exists}

  ✅ Phase 2 · Product Spec      [COMPLETE]
     └── {N} documents in product-spec/
         product-spec.md ({SPEC_DETAIL}) · journeys/journeys.yml ({N} journeys)
         wireframes* ({N} screens, {WIREFRAME_DETAIL})
         {+ metrics.md if exists} {+ mockups/ if exists}

  ✅ Phase 3 · Revalidation      [APPROVED]
     └── {N} revision rounds → Approved on {date}
         review.md — {N} changes logged

  ✅ Phase 4 · SpecKit Bridge    [COMPLETE]
     └── spec.md — {N} user stories, {N} requirements

  ⏳ Phase 5 · Plan              [IN PROGRESS]
     └── plan.md {✅/⏳}

  ⏳ Phase 5B · Tasks             [PENDING]
     └── tasks.md {✅/⏳}
         {If exists: Progress: {N}/{N} tasks complete [{%%}]}

  ⏭️ Phase 5C · Pre-Impl Review   [SKIPPED — "{skip_reason}"]
     └── pre-impl-review.md — design + architecture + risk

  ⏳ Phase 6 · Implementation    [PENDING]
     └── Waiting for tasks approval
         {If in progress: implementation-log.md — {N} checkpoints}

  ⏳ Phase 6B · Code Review       [PENDING / SKIPPED]
     └── code-review.md — quality + security + patterns + tests

  ⏳ Phase 7 · Verification      [PENDING]
     └── Will run after Phase 6/6B

  ⏳ Phase 8A · Test Plan         [PENDING / SKIPPED]
     └── testing/ — {N} test cases across {N} test types

  ⚠️ Phase 8B · Test Run          [COMPLETE WITH KNOWN ISSUES]
     └── test-report.md — {pass rate}% pass rate, {N} bugs ({N} deferred)

  ⏳ Phase 9 · Release Readiness  [PENDING / SKIPPED]
     └── release-readiness.md — ship checklist

  n/a: Phase 2H · Design System Harvest (not_applicable — backend-only) · Phase 4.5 · i18n Harvest (not_applicable — single-locale)
       ← optional / conditional phases out of scope collapse into this one line; a ⏭️ skipped opt phase (5C above) keeps its own row

  Current Phase: 5 · Plan + Tasks
  Next Action:   Approve tasks and begin implementation

  Sync History:
  Last sync-verify: {date or "never"}
  Runs total: {N} | Last verdict: {verdict}
  Drift items: {N} (last run)

  Gate Audit Trail:
  {N} gate decisions recorded
  Last gate: Phase {N} — {decision} on {date}

  Change Requests:
  {N} change requests ({N} accepted, {N} deferred, {N} rejected)

  Quick Actions:
  • Continue full cycle:    /speckit.product-forge.forge
  • Jump to current phase:  /speckit.product-forge.{current_phase}
  • Run sync-verify:        /speckit.product-forge.sync-verify
  • Submit change request:  /speckit.product-forge.change-request
  • View research:          cat {FEATURE_DIR}/research/README.md
```

## All features (Step 5 — "all" requested)

```
Product Forge — All Features Overview

  Feature                    Mode       Phase          Progress   Updated
  push-notifications         standard   7/20 Plan      ████░░░    2026-03-28
  onboarding-v2              lite       1/5 Spec       ██░░░░░    2026-03-25
  compatibility-screen       express    4/4 Complete   ███████    2026-03-20

  Total: {N} features — {N} complete, {N} in progress, {N} pending
```
