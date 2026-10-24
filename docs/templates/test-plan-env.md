> Template for `testing/env.md` — written by `test-plan` Step 4.

```markdown
# Test Environment Config: {Feature Name}

> ⚠️ This file contains test credentials. Do NOT commit to version control.
> Add `testing/env.md` to .gitignore

## Environment

| Variable | Value | Source |
|----------|-------|--------|
| FRONTEND_URL | {url} | User input |
| API_URL | {url} | User input / auto-detected |
| TEST_SCOPE | {scope} | User selection |

## Auth Credentials (test account)
{If auth required — stored here for reference during test execution}
Test email: {email}
Test password: {password}

## Additional Variables
{list of additional env vars with values if provided}

## Browser Targets
{list of selected browsers}

## Notes
{Any special setup steps: seed data, feature flags to enable, etc.}
```
