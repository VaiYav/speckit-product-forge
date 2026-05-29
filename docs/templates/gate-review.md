# Unified Gate Review Template (W5-A2…A5)

> **Purpose:** ONE consolidated review surface per feature — `<FEATURE_DIR>/gate-review.md` —
> that the three review phases **write into** instead of three separate documents the
> human must read in turn. Closes "review overload" (Theme C / marmelab / Fowler).
>
> **Path:** `<FEATURE_DIR>/gate-review.md`
> **Writers:** `pre-impl-review` (design/architecture/risk), `code-review`
> (quality/security/patterns/tests/doc↔code), `verify-full` (Layers 1–10). Each
> phase still does its own analysis; it emits findings here under one `F-NNN`
> namespace rather than minting `D-/A-/R-`, `REV-`, `CRITICAL-/WARNING-` ids.
> **Readers:** the human at each gate; `spec-merge` (canonical-drift section, CF-5);
> `gate-risk.js` (counts CRITICAL/HIGH to compute the risk class).

This is a **consolidated view, not a replacement** for the phases' own work — it is
where their findings land so the gate presents a single collapse-by-default surface.

---

## ID system

`F-NNN` is the single gate-finding id (see [`docs/schema.md` §8](../schema.md#8-cross-artifact-id-system)).
It supersedes the per-phase id schemes for the gate surface:

| Legacy id | Phase | Now |
|-----------|-------|-----|
| `D-NNN` / `A-NNN` / `R-NNN` | pre-impl-review (design / arch / risk) | `F-NNN` with `source: pre-impl-review`, `dimension: design\|architecture\|risk` |
| `REV-NNN` | code-review | `F-NNN` with `source: code-review`, `dimension: quality\|security\|patterns\|tests\|doc-code` |
| `CRITICAL-NNN` / `WARNING-NNN` | verify-full | `F-NNN` with `source: verify-full`, `layer: <N>` |

Each phase appends to the existing `F-` sequence (read the current max `F-NNN`
first); ids are stable once assigned.

---

## File shape

```markdown
# Gate Review: {Feature Name}

> Feature: `{slug}` | Updated: {ISO} | Reviewed against: `{git-sha-or-artifact-stamp}`
> Risk: {🟢 low | 🟡 medium | 🔴 high} (from `node scripts/gate-risk.js`) → routing: {auto-recommend | require-human | block}

## Summary (collapse-by-default)

| Severity | Open | Acknowledged | Resolved |
|----------|:----:|:------------:|:--------:|
| ❌ CRITICAL | {N} | {N} | {N} |
| 🔶 HIGH | {N} | {N} | {N} |
| 🔸 MEDIUM | {N} | {N} | {N} |
| ▪️ LOW | {N} | {N} | {N} |

**Gate verdict:** {PASS / PASS WITH CONDITIONS / BLOCKED}  ·  **New since last review:** {N}

## Findings by cohort

> Grouped by the feature's own cohorts (journey / contract / component / general),
> collapsed by default — expand a group to see its findings. Each finding links
> the artifact it was raised against so the **delta view** (A2) can show only what
> changed since `reviewed against` above.

### Journey: {JRN-001} — {title}
- **F-001** · ❌ CRITICAL · `code-review/security` · raised@`{sha}` · {one-line} → {fix}
- **F-002** · 🔸 MEDIUM · `verify-full/L7` · raised@`{sha}` · {one-line}

### Contract: {API-savePrefs}
- **F-003** · 🔶 HIGH · `verify-full/L9` · raised@`{sha}` · {one-line}

### General
- **F-00N** · ... 

## Derived artifacts (review the source, not the output) — A5

These artifacts are **generated**, not hand-authored; review the source spec diff,
not the file. A machine gate (the two-layer review: `scripts/validate-traceability.js`
+ lint) confirms they match their source — they are excluded from the human surface.

| Artifact | Generated from | Machine-gate status |
|----------|----------------|---------------------|
| `product-spec/mockups/*.html` | `component-map.yml` + `design-system/manifest.yml` | ✅ / ⚠️ |
| `testing/playwright-tests/*.spec.ts` | `journeys/journeys.yml` | ✅ / ⚠️ |
| `api-docs/openapi.yml` | `contracts/openapi.yaml` | ✅ / ⚠️ |

## Suggested canonical-spec updates (Theme G → spec-merge, CF-5)

| FR / domain | Current canonical text | Observed-from-code behavior | Proposed delta |
|-------------|------------------------|-----------------------------|----------------|
| {FR-003} | {...} | {...} | {ADDED/MODIFIED/REMOVED ...} |
```

---

## How phases write into this file

1. **Read** the current `gate-review.md` (if any) and the max `F-NNN`.
2. **Append** new findings under the right cohort with `source` + `dimension`/`layer`
   + `raised@{sha}` (the reviewed-against stamp). Do not renumber existing `F-NNN`.
3. **Re-raise vs. resolve:** if a prior `F-NNN`'s file changed since its `raised@`
   sha, flag it "may be stale — re-confirm"; if fixed, mark it resolved (see the
   status convention below). Do not delete or renumber the bullet — its id stays
   stable.
4. **Recompute the Summary** and the risk headline (`gate-risk.js`).

### Finding status convention (open vs. resolved)

Each `F-NNN` bullet carries a leading status marker so the open-count is
machine-readable:

| Marker | Meaning | Counts as open? |
|--------|---------|:---------------:|
| `❌` | open / unaddressed | yes |
| `🔶` + `acknowledged` | acknowledged (accepted, not blocking) | no |
| `✅` + `resolved` | fixed and re-confirmed | no |
| `⚪` + `waived` | waived with a recorded reason | no |

When you fix or accept a finding, change its leading `❌` to the matching marker
and add the word (`resolved` / `acknowledged` / `waived`) on the bullet, e.g.
`- **F-001** · ✅ CRITICAL · resolved@{sha} · …`. The CI risk gate
(`scripts/gate-risk.js`) and `forge.md`'s `auto-recommend` pre-gate both count a
finding as **open only when its bullet lacks** a `resolved` / `acknowledged` /
`waived` marker — so the `no_open_critical` gate clears once every CRITICAL is
addressed.

## Delta / incremental review (A2)

The gate stamps its decision with `reviewed_sha` on `.forge-status.yml gates[]`
(the git SHA / artifact stamp reviewed). On a **re-run**, present only:
- findings whose artifact changed since `reviewed_sha` (the diff), plus
- previously-approved findings whose file changed (flagged "review may be stale").

Reuse `phase-digest.md`'s "Diff since last approved state" and
`task_log[].commit_sha` for lineage — do not introduce a parallel hash store.
