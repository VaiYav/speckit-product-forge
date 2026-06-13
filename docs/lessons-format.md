# Lessons Format

> **Status:** normative for v1.5.0+
> **File:** `.product-forge/lessons.md` (per project, append-only)
> **Writer:** `speckit.product-forge.retrospective`
> **Readers:** `speckit.product-forge.research` (primarily), others may read.

This document defines the format of `lessons.md` — the project-wide,
append-only learning log. Every retrospective adds one block per lesson.
Research reads the log to avoid starting from zero each time.

---

## 1. File location

`.product-forge/lessons.md` in the project root. Created on first write
if it does not exist. Never overwritten.

---

## 2. Block format

Each lesson is one level-2 markdown section with this exact shape. New
blocks are appended to the bottom of the file. Blocks are never edited
or deleted; superseding a lesson is done by appending a new block that
references the previous one.

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

Tags are the join key between lessons and research. Keep them short,
lowercase, domain-scoped.

Recommended roots (extend per project):

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

Avoid single-use tags; they do not help future matching. Prefer the
least specific tag that still discriminates.

---

## 5. Research integration

`speckit.product-forge.research` treats `lessons.md` as an extra research
dimension:

1. Read the file at the start of Step 2 (right after parsing the feature
   intake).
2. Extract all tags.
3. Score each lesson for relevance against the new feature's implied tags
   (from domain / tech stack / phase hints in the intake).
4. Surface the top matches in a new section of `research/README.md`:
   *"Prior lessons that apply"*.
5. Lessons cited become part of the feature's context for product-spec
   and plan.

See [`commands/research.md`](../commands/research.md) for the specific hook.

---

## 6. Retrospective integration

`speckit.product-forge.retrospective` writes lessons at the end of its
flow:

1. Extract candidate lessons from the retro (predicted vs actual deltas,
   incidents post-launch, manual edits to artifacts during implement).
2. For each candidate, draft a block in the §2 format and ask the user
   to confirm or edit before appending.
3. Append confirmed blocks to `.product-forge/lessons.md`.
4. Record the count on the feature's `.forge-status.yml` under
   `phases.retrospective.lessons_added`.

See [`commands/retrospective.md`](../commands/retrospective.md) for the
writer hook.

---

## 7. Growth and rotation

`lessons.md` is append-only. It grows without bound, which is intentional
for audit purposes. For performance, readers should:

- Prefer the most recent 50 blocks by default.
- Filter by tag matches before loading full block bodies.
- Never auto-summarize or auto-prune. Consolidation (merging related
  blocks) is a human-in-the-loop operation; when it happens, the merged
  block is a new append with explicit `Supersedes:` links.

---

## 8. Non-goals

- No hierarchy beyond level-2 sections. Flat is fine for append-only logs.
- No per-feature lessons file. One project, one log — the whole point is
  cross-feature reuse.
- No YAML frontmatter. The format is human-readable markdown; tags live
  in the body to stay editable without special tooling.

---

## 9. Promotion to Hermes skills (v1.7, P2-A)

`lessons.md` is **per-project**. When Product Forge runs inside **Hermes** (or any
host exposing the `skill_manage` tool), the retrospective can take the next step
and **promote a recurring lesson into a reusable skill** — procedural memory that
survives across projects and sessions, and is cheaper to apply than re-deriving
the pattern each time.

**Writer:** `speckit.product-forge.retrospective` Step 5B.
**Gated on:** config `learning.promote_to_skills` (default `false` — lessons.md
remains the only output unless opted in). See config-template.yml `learning:`.

Promotion rules:

1. **Recurrence threshold.** A lesson's pattern is promoted only after it has
   recurred across at least `learning.min_recurrence` **distinct features** (default
   2), measured by overlapping §4 tags. One-offs stay lessons. This is what makes a
   skill worth caching rather than noise.
2. **Generalization.** The generated `SKILL.md` captures the *rule* (trigger +
   numbered steps + pitfalls), not the original feature's specifics. The lesson is
   the evidence; the skill is the reusable procedure.
3. **Human confirmation.** With `learning.require_confirmation: true` (default), the
   drafted skill is shown for confirmation/edit before any write — no silent skills.
4. **Idempotency.** If a PF-lessons skill with the same trigger exists, the
   retrospective **patches** it (refine) rather than creating a duplicate.
5. **Traceability.** Promoted skill names are recorded on the feature's
   `.forge-status.yml` under `phases.retrospective.skills_promoted` (a list).

Relationship to the existing loop: `research.md` reads `lessons.md` to seed a new
feature (§5). Promotion adds a *second* consumer — the Hermes skill store — so a
hardened pattern is available to **every** future session, not just future
`research` runs in this project. Outside Hermes the step is a no-op; the lessons.md
loop is unchanged.
