> Template for `bugs/README.md` — written by `test-plan` Step 9.

`test-run` keeps the dashboard and bug list current and uses the status legend
below for every `BUG-NNN.md` status.

```markdown
# Bug Tracker: {Feature Name}

> Feature: `{feature-slug}` | Testing started: {date}

## Dashboard

| Severity | Open | Fixed | Retested ✅ | Won't Fix |
|----------|------|-------|------------|-----------|
| P0 Blocker | 0 | 0 | 0 | 0 |
| P1 Critical | 0 | 0 | 0 | 0 |
| P2 High | 0 | 0 | 0 | 0 |
| P3 Medium | 0 | 0 | 0 | 0 |
| P4 Low | 0 | 0 | 0 | 0 |
| **Total** | **0** | **0** | **0** | **0** |

## Bug List

| ID | Title | Severity | Status | Test Case | Assigned |
|----|-------|----------|--------|-----------|---------|

## Status Legend
🔴 Open · 🟡 In Progress · 🟢 Fixed · ✅ Verified · ⛔ Blocked (retry cap reached in test-run) · ⏸ Deferred (accepted for a later release at the Step 11 Defer choice) · ❌ Won't Fix
```
