---
name: speckit.product-forge.retrospective
description: >
  Post-launch retrospective: compare the research-predicted metrics with real data
  from connected analytics, error-tracking and APM tools (or manual input), then log
  lessons and optionally promote recurring ones to skills. Run 2+ weeks after shipping.
---

# Product Forge — Post-Launch Retrospective

You are the **Post-Launch Analyst**. Close the lifecycle loop: compare what Phase 1
research predicted with what happened after shipping, write `retrospective.md`, and
turn the findings into lessons for later features.

## Input

```text
$ARGUMENTS
```

Follow the [command contract](../docs/runtime.md#0-command-contract).

- **Phase key:** `retrospective` (post-launch, outside the phase map)
- **Config keys:** `telemetry.product_analytics`, `telemetry.error_tracking`,
  `telemetry.dashboards`, `learning.promote_to_skills`, `learning.min_recurrence`,
  `learning.require_confirmation`, `learning.skill_category`
- **Writes:** `retrospective.md`, `.product-forge/lessons.md` (append), host skills via
  `skill_manage` (Step 5B), `phases.retrospective.*`
- **Contract deltas:** no gate — the command sets `phases.retrospective.status`
  itself and writes no digest. With `--dry-run`, lesson blocks are drafted in the
  mirror; nothing is appended to `.product-forge/lessons.md` and no skill is promoted.

## Step 1: Check the feature shipped

1. Read `.forge-status.yml` → feature slug and launch date.
2. `phases.verify` is `completed` (the minimum). `test_run` and `release_readiness`
   may be `completed` or `skipped`.
3. Read `research/metrics-roi.md` (predicted KPIs — the baseline),
   `product-spec/product-spec.md` (success-metric definitions) and, when present,
   `tracking/tracking-plan.md` (which events to query).

When `research/metrics-roi.md` is missing (or the metrics phase was skipped), warn:
*"No predicted metrics found — the retrospective still runs; predicted vs actual is
marked N/A."*

Ask (structured prompts), showing slug, ship date and days since launch:

1. How long has the feature been live? Recommend ≥ 14 days for meaningful data.
2. Which data sources are available? Pre-select from the `telemetry:` block:
   PostHog (MCP: funnels, retention, experiments), Amplitude (MCP: events, funnels,
   charts), Sentry (MCP: error rates / regressions), NewRelic (MCP: performance / APM),
   App Store / Play Store reviews, support tickets / CS data, manual entry.

Prefer the connected MCPs over manual entry. Before any query, map the `EVT-*` ids from
the tracking plan / `traceability.yml` to the real event names by discovering them in
the tool; query only discovered names.

## Step 2: Load predicted metrics

From `research/metrics-roi.md` and `product-spec/product-spec.md` (performance targets
from the `plan.md` non-functional requirements), list each target with its rationale:

- **Adoption** — e.g. `{N}%` of active users try the feature in the first 30 days.
- **Engagement** — e.g. retention D7 +5%.
- **Performance** — e.g. P95 response time < 200 ms.
- **Business** — e.g. conversion +3% or support tickets −10% (ROI section).
- **Timeline** — research-predicted payback (e.g. 2 months).

## Step 3: Collect real data

- **NewRelic** (MCP connected): run the error-rate, P95 and request-volume queries in
  [retrospective-newrelic-queries.md](../docs/reference/retrospective-newrelic-queries.md)
  since the launch date.
- **Product analytics** (`telemetry.product_analytics` is `posthog` or `amplitude`):
  query the MCP for the feature's `EVT-*` events — adoption (unique users on
  `{feature}_viewed`); completion (`{feature}_completed` / `{feature}_viewed`); a funnel
  across the journey steps (`JRN`/`STEP` → events) with drop-off; retention/stickiness
  when the success metric is engagement; experiment results when an
  `experiment-design` flag is live (PostHog experiments). Use manual entry or a
  dashboard paste only when no analytics MCP is configured.
- **Error tracking** (`telemetry.error_tracking` is `sentry`): query issues and
  regressions tied to the feature's code paths or release since launch — error rate,
  top issues, new vs resolved — for the Error Analysis table.
- **Manual entry** (no integrations), for the period `{launch_date}` → today:
  1. How many users have tried the feature (or % of DAU)?
  2. What is the main action's completion rate?
  3. Any notable errors or issues reported?
  4. Support ticket volume change related to this feature?
  5. Any business-metric impact observed?

Result: every predicted metric has an actual value or an explicit N/A.

## Step 4: Write the report

Write `{FEATURE_DIR}/retrospective.md` from
[retrospective-report.md](../docs/templates/retrospective-report.md).

## Step 5: Append lessons to the project log

1. **Harvest candidates from real artifacts.** Read each source below **if present**
   (test-run, release readiness and sync-verify may have been skipped, so
   `gate-review.md`, `code-review.md` and `sync-report.md` may not exist). For each real
   signal, draft a candidate of the mapped type and carry the source artifact path as
   its evidence — which satisfies item 3's evidence filter by construction. Draft
   lessons only from these signals.

   | Source artifact (read if present) | Read for | Lesson type it feeds |
   |---|---|---|
   | `{FEATURE_DIR}/implement/digest.md` (deviations / manual-edits section) | Where generated artifacts had to be hand-corrected during build | **Implementation** |
   | `{FEATURE_DIR}/gate-review.md` (single `F-NNN` namespace) + `{FEATURE_DIR}/code-review.md` | Recurring finding themes across the consolidated review surface | **Process / Implementation** |
   | `{FEATURE_DIR}/verify-report.md` + `{FEATURE_DIR}/sync-report.md` (drift items) | Where downstream artifacts diverged from upstream intent | **Research / spec-accuracy** |
   | the **"Suggested canonical-spec updates"** carrier inside `verify-report.md` / `code-review.md` | Spec language that reality proved wrong/imprecise | **Research / spec-accuracy** |
   | Large deltas in the **Predicted vs Actual** table (Step 4) + post-launch incidents/bugs tracked to root cause | Where Phase-1 prediction missed | **Research** |
   | Rules of thumb in the report's "Lessons Learned for Future Features" section | Team-stated process/testing takeaways | **Process / Testing** |

2. Draft each candidate as a block in the format of
   [lessons-format.md](../docs/lessons-format.md) §2.
3. Show the drafted blocks and ask the user to confirm or edit them. Reject blocks that
   are project-specific trivia with no general applicability, restatements of published
   best practice with no project evidence, or negative assessments of individuals (no blame).
4. Append confirmed blocks to `.product-forge/lessons.md`, creating the file when
   missing; existing blocks stay untouched.
5. Record the count as `phases.retrospective.lessons_added`.

## Step 5B: Promote recurring lessons to skills

Runs only when `learning.promote_to_skills` is `true` (default `false`) **and** the
host exposes `skill_manage` (e.g. Hermes). Otherwise skip it; `lessons.md` is the only
output. When promotion is on but the host has no `skill_manage`, note that promotion was
requested but the host has no skill store, and skip the rest of Step 5B — `lessons.md`
already holds the content; continue with Step 6.

1. **Detect recurrence.** For each lesson confirmed in Step 5, count the **distinct
   features** in `.product-forge/lessons.md` that already carry a block with an
   overlapping tag set (the lessons-format §4 tag taxonomy is the join key). Promote only
   patterns whose count ≥ `learning.min_recurrence` (default 2); a one-off stays a
   lesson. Record the deciding count.
2. **Draft the skill.** Write a `SKILL.md` body: a trigger ("when building a feature that
   touches {tags/domain}…"), numbered steps capturing the pattern (the constraint, the
   check, the recipe), and a pitfalls section sourced from the lessons' "What happened".
   State the general rule, not the original feature's specifics.
3. **Confirm.** When `learning.require_confirmation` is `true` (default), show the draft
   and wait for the user to confirm or edit it before any write.
4. **Create or patch.** Read back `phases.retrospective.skills_promoted` across this
   project's features. When a listed skill already covers this trigger, call
   `skill_manage` with `action: patch` to refine it; otherwise `action: create`. Pass
   `learning.skill_category` when set.
5. **Record the carrier.** Append every promoted skill name to
   `phases.retrospective.skills_promoted` (a list) — the list item 4 reads on the next
   retrospective, so a skill is refined rather than recreated.

## Step 6: Update status

All fields live under the phase key (there is no top-level `retrospective:` block):

```yaml
phases:
  retrospective:
    status: completed
    date: "{today}"
    days_post_launch: {N}
    adoption_actual: "{N}%"
    adoption_predicted: "{N}%"
    completion_rate: "{N}%"
    error_rate: "{N}%"
    open_issues: {N}
    research_accuracy: "{N}/10"
    lessons_added: {N}                # blocks appended to lessons.md in Step 5
    skills_promoted: []               # skill names created/patched in Step 5B (empty unless learning.promote_to_skills)
```

## Step 7: Present results

Show `Retrospective Complete: {Feature Name}`: days since launch; predicted → actual
with a legend marker for adoption, completion, P95 latency and error rate; research
accuracy `{N}/10`; top win; top learning; open issues ({N} bugs, {N} enhancements);
`Full report: {FEATURE_DIR}/retrospective.md`.

## Done when

- `retrospective.md` exists with every template section; every predicted metric has an
  actual value, or the row is marked N/A.
- Every lesson candidate cites a source artifact, was shown to the user, and each
  confirmed block is appended to `.product-forge/lessons.md` (count in `lessons_added`).
- With `learning.promote_to_skills: true` and `skill_manage` available: each lesson at
  or above `learning.min_recurrence` was confirmed (when required), created or patched,
  and its name appended to `skills_promoted`; otherwise Step 5B was skipped and
  `skills_promoted` is `[]`.
- `phases.retrospective` carries every Step 6 field with `status: completed`, and the
  Step 7 summary was shown.
