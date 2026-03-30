---
name: speckit.product-forge.tracking-plan
description: >
  Generates an analytics tracking plan from user journeys and product-spec.
  Creates event taxonomy, property schemas, funnel definitions, and ready-to-paste
  code snippets for your analytics SDK. Links each event to a user story and success metric.
  Use after product-spec: "tracking plan", "/speckit.product-forge.tracking-plan"
---

# Product Forge — Analytics Tracking Plan

You are the **Analytics Architect** for Product Forge.
Your goal: generate a complete, implementation-ready tracking plan from the feature's
user journeys and success metrics — so analytics is wired correctly from day one.

## User Input

```text
$ARGUMENTS
```

---

## Step 1: Validate Prerequisites

1. Read `.forge-status.yml` — `product_spec` must be `completed` (Phase 2 done)
2. Read `product-spec/product-spec.md` → success metrics, user stories
3. Read `product-spec/user-journey*.md` → all user flows and decision points
4. Read `research/metrics-roi.md` (if exists) → predicted KPIs

If not ready:
> ⚠️ Product spec (Phase 2) must be completed before generating a tracking plan.
> Run: `/speckit.product-forge.product-spec`

---

## Step 2: Detect Analytics Stack

Scan the codebase to identify the analytics SDK in use:

```
🔍 Detecting analytics stack...
```

Look for:
- **Mixpanel:** `mixpanel-browser`, `mixpanel.track(`, `import Mixpanel`
- **Amplitude:** `@amplitude/analytics-browser`, `amplitude.track(`
- **Segment:** `@segment/analytics-next`, `analytics.track(`
- **PostHog:** `posthog-js`, `posthog.capture(`
- **Firebase Analytics:** `firebase/analytics`, `logEvent(`
- **Custom / none:** no SDK found

Ask the user to confirm:
```
Analytics SDK detected: {SDK name or "None found"}

1. Is this correct, or are you using a different SDK?
   (e.g., Mixpanel, Amplitude, Segment, PostHog, Firebase, Heap, custom)

2. Where should tracking calls be placed?
   - [ ] Frontend only (Vue/React/mobile)
   - [ ] Backend only (server-side events)
   - [ ] Both (frontend + backend)

3. Do you have an existing event naming convention?
   (e.g., "object_action", "OBJECT_ACTION", "Object Action")
   If yes, paste an example event name.
```

Store: `ANALYTICS_SDK`, `TRACKING_LAYER`, `NAMING_CONVENTION`.

---

## Step 3: Extract Events from User Journeys

Read every step in every user journey file. For each meaningful user action or system event:

**Trigger event when:**
- User navigates to a key screen / view
- User performs a primary action (clicks CTA, submits form, completes step)
- User encounters an error state
- System completes an async operation (notification received, data loaded)
- User abandons a flow (rage click, exit without completing)
- User reaches a conversion point

**Do NOT track:**
- Every mouse move or trivial navigation
- Internal implementation details
- Events that won't influence product decisions

Build the event list:

```
📊 Events extracted from user journeys:

Journey: {Journey Name}
  1. {Feature}_viewed              → User opens the feature screen
  2. {Feature}_action_started      → User initiates primary action
  3. {Feature}_form_submitted      → User submits the form
  4. {Feature}_completed           → Flow completed successfully
  5. {Feature}_error_shown         → Error state displayed
  6. {Feature}_abandoned           → User left without completing

Journey: {Journey 2 Name}
  ...
```

---

## Step 4: Generate Tracking Plan Document

Create `{FEATURE_DIR}/tracking/tracking-plan.md`:

```markdown
# Analytics Tracking Plan: {Feature Name}

> Created: {date} | SDK: {ANALYTICS_SDK}
> Feature: `{feature-slug}` | Layer: {frontend/backend/both}

## Event Naming Convention

`{object}_{action}` — snake_case, past tense for completed actions, present tense for states.

Examples:
- `{feature}_viewed` — screen/page view
- `{feature}_completed` — successful completion
- `{feature}_{action}_clicked` — button interaction

## Events

### {Feature Name} — Core Flow

---

#### `{feature_slug}_viewed`

| Property | | |
|----------|--|--|
| **Trigger** | User opens the {feature} screen | |
| **Story** | {US-NNN} | |
| **Success metric** | Session start, funnel entry | |

**Properties:**

| Property | Type | Required | Description | Example |
|----------|------|----------|-------------|---------|
| `source` | string | ✅ | Where user came from | `"home_tab"`, `"push_notification"`, `"deep_link"` |
| `user_id` | string | ✅ | User identifier | `"usr_123"` |
| `session_id` | string | ✅ | Session identifier | `"ses_abc"` |
| `feature_version` | string | ✅ | Feature version for A/B tracking | `"1.0"` |
| `is_first_view` | boolean | ✅ | First time user sees this feature | `true` |

---

#### `{feature_slug}_completed`

| Property | | |
|----------|--|--|
| **Trigger** | User successfully completes the primary action | |
| **Story** | {US-NNN} | |
| **Success metric** | Primary conversion — maps to "{success metric from product-spec}" | |

**Properties:**

| Property | Type | Required | Description | Example |
|----------|------|----------|-------------|---------|
| `user_id` | string | ✅ | | `"usr_123"` |
| `time_to_complete_ms` | number | ✅ | Time from view to completion | `4500` |
| `steps_taken` | number | ✅ | How many steps user went through | `3` |
| `{feature_attribute}` | {type} | ✅ | Key attribute of what was completed | `{example}` |

---

#### `{feature_slug}_error_shown`

| Property | | |
|----------|--|--|
| **Trigger** | Any error state is displayed to the user | |
| **Story** | {US-NNN} — error handling AC | |
| **Success metric** | Error rate — should decrease after fixes | |

**Properties:**

| Property | Type | Required | Description | Example |
|----------|------|----------|-------------|---------|
| `user_id` | string | ✅ | | |
| `error_code` | string | ✅ | Machine-readable error type | `"network_timeout"`, `"validation_failed"` |
| `error_message` | string | ✅ | User-facing error message shown | `"Something went wrong"` |
| `context` | string | ✅ | Which step triggered the error | `"form_submit"`, `"data_load"` |

---

#### `{feature_slug}_abandoned`

| Property | | |
|----------|--|--|
| **Trigger** | User leaves the flow without completing | |
| **Story** | All stories — retention signal | |
| **Success metric** | Abandonment rate — target: <{N}% | |

**Properties:**

| Property | Type | Required | Description | Example |
|----------|------|----------|-------------|---------|
| `user_id` | string | ✅ | | |
| `last_step` | string | ✅ | Which step user was on when they left | `"step_2_form"` |
| `time_spent_ms` | number | ✅ | Time from entry to exit | `12000` |
| `reason` | string | ❌ | If determinable (back button, app background) | `"back_button"` |

---

## Funnels

### Primary Conversion Funnel

```
{feature_slug}_viewed
  → {feature_slug}_action_started
    → {feature_slug}_form_submitted
      → {feature_slug}_completed

Target conversion rate: {N}% (from metrics-roi.md)
```

### Error Recovery Funnel

```
{feature_slug}_error_shown
  → {feature_slug}_retry_clicked
    → {feature_slug}_completed (recovery)
    OR {feature_slug}_abandoned (drop-off)
```

## Coverage Matrix

| User Story | Key Event | Metric |
|------------|-----------|--------|
| {US-001}: {title} | `{event_name}` | {success metric} |
| {US-002}: {title} | `{event_name}` | {success metric} |

## Predicted Metrics (from research/metrics-roi.md)

| Metric | Target | Measured by |
|--------|--------|-------------|
| {metric from product-spec} | {target} | `{event_name}` count/rate |
| Adoption rate | {N}% of users in 30 days | `{feature}_viewed` unique users |
| Completion rate | {N}% | `{feature}_completed` / `{feature}_viewed` |
```

---

## Step 5: Generate Code Snippets

Create `{FEATURE_DIR}/tracking/snippets.md` — ready-to-paste tracking calls.

Generate for the detected SDK:

### Mixpanel

```typescript
// tracking/{feature-slug}.tracking.ts
import mixpanel from 'mixpanel-browser';

export const {FeatureName}Tracking = {
  viewed(props: { source: string; isFirstView: boolean }) {
    mixpanel.track('{feature_slug}_viewed', {
      source: props.source,
      user_id: mixpanel.get_distinct_id(),
      session_id: mixpanel.get_session_id?.() ?? null,
      feature_version: '1.0',
      is_first_view: props.isFirstView,
    });
  },

  completed(props: { timeToCompleteMs: number; stepsTaken: number }) {
    mixpanel.track('{feature_slug}_completed', {
      user_id: mixpanel.get_distinct_id(),
      time_to_complete_ms: props.timeToCompleteMs,
      steps_taken: props.stepsTaken,
    });
  },

  errorShown(props: { errorCode: string; errorMessage: string; context: string }) {
    mixpanel.track('{feature_slug}_error_shown', {
      user_id: mixpanel.get_distinct_id(),
      error_code: props.errorCode,
      error_message: props.errorMessage,
      context: props.context,
    });
  },

  abandoned(props: { lastStep: string; timeSpentMs: number }) {
    mixpanel.track('{feature_slug}_abandoned', {
      user_id: mixpanel.get_distinct_id(),
      last_step: props.lastStep,
      time_spent_ms: props.timeSpentMs,
    });
  },
};
```

### Amplitude

```typescript
// tracking/{feature-slug}.tracking.ts
import { track } from '@amplitude/analytics-browser';

export const {FeatureName}Tracking = {
  viewed(props: { source: string; isFirstView: boolean }) {
    track('{feature_slug}_viewed', {
      source: props.source,
      feature_version: '1.0',
      is_first_view: props.isFirstView,
    });
  },
  // ... same pattern for other events
};
```

### PostHog

```typescript
import posthog from 'posthog-js';

export const {FeatureName}Tracking = {
  viewed(props: { source: string; isFirstView: boolean }) {
    posthog.capture('{feature_slug}_viewed', {
      source: props.source,
      feature_version: '1.0',
      is_first_view: props.isFirstView,
    });
  },
  // ... same pattern
};
```

---

## Step 6: Update Status & Present Results

Update `.forge-status.yml`:

```yaml
phases:
  tracking_plan: completed
tracking:
  sdk: "{ANALYTICS_SDK}"
  events: {N}
  funnels: {N}
  files:
    - "tracking/tracking-plan.md"
    - "tracking/snippets.md"
last_updated: "{ISO timestamp}"
```

```
📊 Tracking Plan Created: {Feature Name}

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
