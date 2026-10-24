# Lessons Format

> **Status:** normative
> **File:** `.product-forge/lessons.md` (per project, append-only)
> **Writer:** `speckit.product-forge.retrospective`
> **Readers:** `speckit.product-forge.research` (primarily), others may read.

The format of `lessons.md` — the project-wide, append-only learning log. Every
retrospective adds one block per lesson; research reads the log so a new feature
starts from prior experience.

---

## 1. File location

`.product-forge/lessons.md` in the project root. Created on first write if it does
not exist; only ever appended to.

---

## 2. Block format

Each lesson is one level-2 markdown section with this exact shape, appended to the
bottom of the file. Blocks stay as written (no edits, no deletions); to supersede a
lesson, append a new block that references the previous one.

```markdown
## Lesson {YYYY-MM-DD} — {short-title}

**Feature:** {feature-slug}
**Phase where it surfaced:** {research | product-spec | plan | implement | verify | release | post-launch}
**Tags:** {comma-separated, lowercase, domain-scoped — see §4}

### Context

One paragraph describing the situation. Must be specific enough that
someone unfamiliar with the feature can understand the stakes.

### What happened

What we assumed, what actually happened, and what that cost us
(time / money / users / trust). Stay factual; no blame.

### What we learned

The generalizable takeaway. Start with an imperative verb
("Verify ...", "Avoid ...", "Check ..."). If the lesson has a clear
rule, state it in one sentence.

### Applies to

Concrete future features or domains where this lesson is relevant. Use
the tag list for machine matching; this section is a natural-language
hint for humans.

### Supersedes

Optional. If this lesson refines or replaces a previous one, link to
its anchor: `[2026-02-14 — cosmic weather retry budget](#lesson-2026-02-14--cosmic-weather-retry-budget)`.
```

---

## 3. Example block

```markdown
## Lesson 2026-03-17 — Push provider rate limits are silent

**Feature:** push-notifications-v2
**Phase where it surfaced:** implement
**Tags:** push, rate-limit, external-provider, notifications

### Context

We assumed FCM would return a 429 on quota exhaustion. During the rollout
it silently accepted messages but never delivered them. We discovered the
gap 48 hours later, after user complaints.

### What happened

The provider's throttling returns `200 OK` with a `failure: 1` field in
the response body instead of a 4xx status. Our client only branched on
HTTP status, so the errors were ignored. Affected 12k users.

### What we learned

Verify external providers' documented behavior on quota exhaustion by
provoking it in staging. Check response bodies, not just status codes,
when a provider has a documented partial-failure response shape.

### Applies to

Any feature calling a third-party service with usage limits — push,
email, SMS, AI inference, payment providers.

### Supersedes

—
```

---

## 4. Tag taxonomy

Tags are the join key between lessons and research: short, lowercase,
domain-scoped. Recommended roots (extend per project):

| Domain | Examples |
|--------|----------|
| `external-provider` | fcm, apns, stripe, openai, anthropic, dodopayments |
| `data` | schema-migration, backfill, data-loss, pii |
| `auth` | oauth, jwt, session, rbac |
| `payments` | iap, webhook, receipt, subscription |
| `performance` | n-plus-one, cache-miss, cold-start, bundle-size |
| `observability` | logging, metrics, trace, sentry, newrelic |
| `process` | estimation, scope-creep, handoff, rollout |
| `channel` | push, email, sms, in-app, notifications |
| `rate-limit` | quota, throttle, backoff, 429, soft-limit |

Reuse existing tags (single-use tags do not help future matching) and prefer the
least specific tag that still discriminates.

---

## 5. Research integration

`speckit.product-forge.research` treats `lessons.md` as an extra research
dimension:

1. Read the file at the start of Step 2 (right after parsing the feature intake).
2. Extract all tags.
3. Score each lesson for relevance against the new feature's implied tags (from
   domain / tech stack / phase hints in the intake).
4. Surface the top matches in a `research/README.md` section
   *"Prior lessons that apply"*.
5. Cited lessons become part of the feature's context for product-spec and plan.

Hook: [`commands/research.md`](../commands/research.md).

---

## 6. Retrospective integration

`speckit.product-forge.retrospective` writes lessons at the end of its flow:

1. Extract candidate lessons from the retro (predicted vs actual deltas, incidents
   post-launch, manual edits to artifacts during implement).
2. Draft each candidate in the §2 format and ask the user to confirm or edit before
   appending.
3. Append confirmed blocks to `.product-forge/lessons.md`.
4. Record the count on the feature's `.forge-status.yml` under
   `phases.retrospective.lessons_added`.

Hook: [`commands/retrospective.md`](../commands/retrospective.md).

---

## 7. Growth and rotation

`lessons.md` grows without bound, intentionally, for audit. Readers should:

- Prefer the most recent 50 blocks by default.
- Filter by tag matches before loading full block bodies.
- Leave summarizing and pruning to humans (never automatic). Consolidation is a
  human-in-the-loop operation whose merged block is a new append with explicit
  `Supersedes:` links.

---

## 8. Non-goals

- No hierarchy beyond level-2 sections.
- No per-feature lessons file — one project, one log, for cross-feature reuse.
- No YAML frontmatter; tags live in the body so the file stays editable without
  tooling.

---

## 9. Promotion to Hermes skills

When Product Forge runs inside **Hermes** (or any host exposing the `skill_manage`
tool), the retrospective can **promote a recurring lesson into a reusable skill** —
procedural memory that survives across projects and sessions.

**Writer:** `speckit.product-forge.retrospective` Step 5B.
**Gated on:** config `learning.promote_to_skills` (default `false` — lessons.md
remains the only output unless opted in).

Promotion rules:

1. **Recurrence threshold.** A lesson's pattern is promoted only after it has
   recurred across at least `learning.min_recurrence` **distinct features** (default
   2), measured by overlapping §4 tags. One-offs stay lessons.
2. **Generalization.** The generated `SKILL.md` captures the *rule* (trigger +
   numbered steps + pitfalls), not the original feature's specifics.
3. **Human confirmation.** With `learning.require_confirmation: true` (default), the
   drafted skill is shown for confirmation/edit before any write.
4. **Idempotency.** If a PF-lessons skill with the same trigger exists, the
   retrospective **patches** it rather than creating a duplicate.
5. **Traceability.** Promoted skill names are recorded on the feature's
   `.forge-status.yml` under `phases.retrospective.skills_promoted` (a list).

`learning.skill_category` is the optional category passed to `skill_manage`.
Outside Hermes the step is a no-op and the lessons.md loop (§5) is unchanged.
