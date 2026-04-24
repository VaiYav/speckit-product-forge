# Phase Digest Template

> **Purpose:** every major phase produces a short digest (200–400 words) that
> downstream phases read first before touching full artifacts. Keeps the
> working context small; full artifacts are loaded only when a specific
> check needs them.

Copy this template into `<FEATURE_DIR>/<phase>/digest.md` and fill every
section. Keep it terse — one short paragraph per section is enough.

---

```markdown
# {Phase Name} — Digest

> **Feature:** {feature-slug}
> **Phase:** {research | product-spec | plan | tasks | implement | verify}
> **Generated at:** {ISO-8601 timestamp}
> **Artifact owner:** {sub-skill name, e.g. speckit.product-forge.research}

## Key decisions

- {1–5 bullets, each a single sentence stating a concrete decision and the winning option}
- {example: "Chose Qdrant over Pinecone for vector memory because of per-tenant collections."}

## Artifacts produced

- `{relative/path/to/file.md}` — {one-line description}
- `{relative/path/to/file.md}` — {one-line description}

## Open risks

- {1–3 bullets; each names the risk and its current status (mitigated / accepted / unmitigated)}
- {example: "Unmitigated: Qdrant downtime degrades chat silently — tracked for Phase 7."}

## Handoff notes for next phase

- {What does the next phase need to know that isn't obvious from the listed artifacts?}
- {Example: "spec.md Section 4 intentionally leaves retention policy TBD — plan must close it."}
```

---

## How digests are used

- The orchestrator reads `phase.digest_path` from `.forge-status.yml` on every
  phase transition. If it is absent, the phase is treated as not yet complete
  regardless of the `status` value.
- `verify-full` and `code-review` read digests first to identify which full
  artifacts to pull on demand.
- `portfolio` reads digests (never full artifacts) to keep scans cheap.
- `retrospective` reads the full digest chain to produce lessons.

## Length discipline

- Hard limit: 600 words.
- Soft target: 300 words.
- Exceeding the hard limit is a drift signal — the digest is being used as
  a second full artifact. Cut it down.

## Non-goals

- Digests are **not** summaries for humans alone — they are machine input.
  Keep the shape stable across phases so downstream skills can key off sections.
- Digests do **not** replace the full artifacts. Never compute a decision
  from a digest when the question touches a specific file, line, or rule.
