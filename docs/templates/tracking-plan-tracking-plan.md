> Template for `tracking/tracking-plan.md` — written by `tracking-plan` Step 4.

````markdown
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
````
