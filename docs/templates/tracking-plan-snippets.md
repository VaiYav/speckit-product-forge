> Template for `tracking/snippets.md` — written by `tracking-plan` Step 5. Generate the section for the detected SDK (`ANALYTICS_SDK`); follow the same pattern for SDKs not shown (Segment, Firebase, Heap, custom).

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
