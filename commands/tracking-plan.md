---
name: speckit.product-forge.tracking-plan
description: >
  Generate an analytics tracking plan from user journeys and the product spec:
  event taxonomy, property schemas, funnels and ready-to-paste SDK snippets,
  each event linked to a user story and success metric. Use after Product Spec.
---

# Product Forge — Analytics Tracking Plan

You are the **Analytics Architect**. Generate a complete, implementation-ready
tracking plan from the feature's user journeys and success metrics, so analytics
is wired correctly from day one.

## Input

```text
$ARGUMENTS
```

Follow the [command contract](../docs/runtime.md#0-command-contract).

- **Phase key:** `tracking_plan` (supporting command — not in the phase map)
- **Config keys:** `codebase_path` (or monorepo `codebase.paths`), `features_dir`,
  `storage_strategy`
- **Writes:** `tracking/tracking-plan.md`, `tracking/snippets.md`, the `events`
  column of `traceability.yml` (only when the matrix exists), `phases.tracking_plan.*`
- **Contract deltas:** no gate — the run ends with the summary, and
  `release-readiness` consolidates this command's status at its own gate.

## Step 1: Check inputs

`phases.product_spec.status` must be `completed`. Otherwise stop with:

> ⚠️ Product spec (Phase 2) must be completed before generating a tracking plan.
> Run: `/speckit.product-forge.product-spec`

Then read:

1. `product-spec/product-spec.md` → success metrics, user stories.
2. `product-spec/journeys/journeys.yml` → every journey (`JRN` / `STEP` / `EDGE`)
   and decision point.
3. `research/metrics-roi.md` (when present) → predicted KPIs.

## Step 2: Detect the analytics stack

Scan the codebase for the SDK in use:

- **Mixpanel:** `mixpanel-browser`, `mixpanel.track(`, `import Mixpanel`
- **Amplitude:** `@amplitude/analytics-browser`, `amplitude.track(`
- **Segment:** `@segment/analytics-next`, `analytics.track(`
- **PostHog:** `posthog-js`, `posthog.capture(`
- **Firebase Analytics:** `firebase/analytics`, `logEvent(`
- **Custom / none:** no SDK found

Then ask three questions, one prompt each:

1. **SDK** — confirm the detected SDK (or "None found") or name another
   (Mixpanel, Amplitude, Segment, PostHog, Firebase, Heap, custom).
2. **Layer** — where tracking calls go: frontend only (Vue / React / mobile),
   backend only (server-side events), or both.
3. **Naming** — an existing event naming convention (e.g. `object_action`,
   `OBJECT_ACTION`, `Object Action`) with an example event name, or none (use
   the default `{object}_{action}` snake_case).

Result: `ANALYTICS_SDK`, `TRACKING_LAYER`, `NAMING_CONVENTION`.

## Step 3: Extract events from the journeys

Walk every step of every journey. Create an event when:

- the user navigates to a key screen / view;
- the user performs a primary action (clicks a CTA, submits a form, completes a step);
- the user meets an error state;
- the system completes an async operation (notification received, data loaded);
- the user abandons a flow (rage click, exit without completing);
- the user reaches a conversion point.

Track only events that can influence a product decision — skip mouse moves,
trivial navigation and internal implementation details.

Give each event a stable `EVT-*` id and map it to its journey step(s) and user
story. A typical journey yields, e.g., `{feature}_viewed`,
`{feature}_action_started`, `{feature}_form_submitted`, `{feature}_completed`,
`{feature}_error_shown`, `{feature}_abandoned`; the summary counts view /
complete / error / abandon events as core and the rest as extended.

## Step 4: Write `tracking/tracking-plan.md`

Write `{FEATURE_DIR}/tracking/tracking-plan.md` from
[docs/templates/tracking-plan-tracking-plan.md](../docs/templates/tracking-plan-tracking-plan.md):
naming convention, one section per event (trigger, story, success metric,
property table), funnels, coverage matrix, predicted metrics.

## Step 5: Write `tracking/snippets.md`

Write `{FEATURE_DIR}/tracking/snippets.md` — ready-to-paste tracking calls for
`ANALYTICS_SDK` — from
[docs/templates/tracking-plan-snippets.md](../docs/templates/tracking-plan-snippets.md).

## Step 6: Fill the traceability `events` column

`tracking-plan` is the registered writer of the `events` column in
`{FEATURE_DIR}/traceability.yml` ([traceability matrix](../docs/templates/traceability-matrix.md)).
When the matrix exists (seeded by `tasks` in Phase 5), set `events: [EVT-*]` on
each requirement row to the events that cover it, matched through the row's
`story` (`US-*`) / `journeys` (`JRN-*`) keys and each event's story / journey
step. Change only the `events` column.

When the matrix does not exist yet (this command can run right after
product-spec), skip this step; a later run fills the column once rows are seeded.

## Step 7: Status

Run summary under the phase key (never a top-level `tracking:` block):

```yaml
phases:
  tracking_plan:
    status: completed
    sdk: "{ANALYTICS_SDK}"
    events: {N}
    funnels: {N}
    files:
      - "tracking/tracking-plan.md"
      - "tracking/snippets.md"
```

## Step 8: Present

```
Tracking Plan Created: {Feature Name}

Analytics SDK: {SDK}
Events defined: {N}
  Core: {N} events (view, complete, error, abandon)
  Extended: {N} events ({other interactions})
Funnels: {N} ({Primary Conversion}, {Error Recovery})

Coverage: {N}/{N} user stories have tracking ✅

Files created:
  tracking/tracking-plan.md   ← Full event spec with properties
  tracking/snippets.md        ← Ready-to-paste SDK calls

Next: Wire the snippets into your Vue components / NestJS services
  then verify events appear in {SDK} after /speckit.product-forge.test-run
```

## Done when

- Every journey step that meets a Step 3 trigger has an event with an `EVT-*`
  id, a story, a success metric and a property table.
- Every user story appears in the coverage matrix with at least one event (or
  is reported as uncovered in the summary).
- The primary-conversion and error-recovery funnels are defined.
- `snippets.md` covers every event for `ANALYTICS_SDK`.
- When `traceability.yml` exists, every row's `events` is set and no other
  column changed.
- `phases.tracking_plan` holds `completed`, the SDK, event / funnel counts and
  both file paths; the summary was shown.
