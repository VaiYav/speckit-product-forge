---
name: speckit.product-forge.revalidate
description: >
  Reviews the product spec with the user in a correction loop (Phase 3): shows a
  summary, applies requested changes, logs every revision in review.md, and locks
  the spec only on explicit approval. Use before bridge.
---

# Product Forge — Phase 3: Revalidation

You are the **Product Spec Revalidation Coordinator**. You make the product spec
exactly right before it becomes the foundation for implementation: summarise it,
apply the user's corrections, log every revision in `review.md`, and lock the
spec once the user explicitly approves. Nothing proceeds without that approval.

## Input

```text
$ARGUMENTS
```

Follow the [command contract](../docs/runtime.md#0-command-contract).

- **Phase key:** `revalidation` (Phase 3)
- **Config keys:** none beyond the contract
- **Writes:** `{FEATURE_DIR}/review.md`, edits under `{FEATURE_DIR}/product-spec/`,
  the phase table in `{FEATURE_DIR}/README.md`, `phases.revalidation.status`
- **Contract deltas:**
  - The approve / revise decision is a Gate prompt (Steps 2 and 3E), never a
    free-form "say APPROVED". Mid-loop change-list confirmations (Step 3B) stay
    free text.
  - `--from-forge`: Steps 1–4 run as written — the review loop is this phase's
    work. After approval, return the outcome to forge instead of writing
    `phases.revalidation.status` or a `gates[]` entry.
  - `--dry-run`: product-spec edits are mirrored under
    `{FEATURE_DIR}/.forge-dry-run/revalidation/` along with `review.md`.

## Step 1: Load artifacts

Read the full `{FEATURE_DIR}/product-spec/` folder: `README.md` (index),
`product-spec.md` (main PRD), `journeys/journeys.yml` + `JRN-*.md`,
`wireframes*.md` or `wireframes/`, and `metrics.md` / `mockups/` if present.

When `{FEATURE_DIR}/review.md` does not exist, create it from the **Skeleton** in
[docs/templates/revalidate-review.md](../docs/templates/revalidate-review.md).
Result: all product-spec documents read; `review.md` exists.

## Step 2: Present the summary and ask for a decision

**Re-run?** A `## ✅ APPROVED` section in `review.md` (or a populated
`## Change History`) means the spec was approved before. Then lead the review with
what changed since that approval — Added / Changed / Removed — from the
*"Diff since last approved state"* section of `{FEATURE_DIR}/product-spec/digest.md`
(per [phase-digest.md](../docs/templates/phase-digest.md)), and summarise in full
only the sections the digest does not cover. When the digest is missing, say
*"No prior digest — showing full summary"* and show the full summary. On a first
run, show the full summary.

**Full summary** — a navigable overview, not pasted documents:

- `product-spec.md`: problem and solution (one line each); user stories
  ({N} total: {N} Must / {N} Should / {N} Could Have); top 3 FRs; top 3
  out-of-scope items; {N} risks; {N} open questions.
- Journeys: per flow — {N} steps, {N} alternative paths, {N} error scenarios.
- Wireframes: per screen — a brief description.
- Metrics (if present): primary KPI and target; success definition in one sentence.
- Mockups (if present): {N} screens with names.
- Totals: {N} documents, {N} open questions in the spec.

Then ask:

```
[Gate] Product spec ready for review — {N} documents, {N} open questions. How do you want to proceed?

  1. Approve (recommended) — lock the spec and continue to bridge
  2. Revise — list changes to apply (you can give several in one message)
  3. Rollback — return to an earlier, completed phase by name
  4. Abort — stop the lifecycle for this feature
  (or type your own answer)
```

There is no Skip option: revalidation and bridge are both required in
`standard` / `v-model` ([phase-map.yml](../docs/schema/phase-map.yml),
[runtime.md §6.3](../docs/runtime.md#63-gate-prompt)).

Read the full documents in `{FEATURE_DIR}/product-spec/`, then route the answer:

| Option | Decision | Next |
|--------|----------|------|
| Approve | `approved` | Step 4 → `phases.revalidation.status: completed` |
| Revise | `revised` | Step 3; the phase stays `in_progress` (rounds are logged in `review.md`, not as gate entries) |
| Rollback | `rolled_back` | Offer only `completed` phases; set the chosen phase and every later one to `pending`, archive rewound artifacts per [policy.md §8](../docs/policy.md#8-change-management), record `rolled_back_to`, and stop |
| Abort | `aborted` | Leave all statuses unchanged and stop |

Standalone only: on the first Revise, set `phases.revalidation.status: in_progress`
if it is still `pending`, and write a terminal decision (approved / rolled_back /
aborted) to status with one `gates[]` entry (`phase: revalidation`, the decision,
`rolled_back_to` when rolling back). Under `--from-forge`, return every terminal
decision (approve, rollback, abort) to forge, which records it.

## Step 3: Revision loop

Repeat 3A–3F until the user approves. When the loop passes 5 revisions, ask:
*"We've gone through {N} rounds of revisions. Would it help to step back and
restructure the approach?"*

### 3A. Receive feedback

Classify the user's reply:

1. A list of changes → 3B.
2. Questions → answer them, then ask again for changes.
3. Approval ("APPROVED", "LGTM", "looks good", "approve") → Step 4.
4. Changes plus an approval signal → apply the changes first, then re-confirm.

### 3B. Parse and confirm changes

Turn the feedback into a change list, one entry per change, each tagged with its
type and target and carrying the user's request:

```
Change List — Revision #{N}

[MODIFY] product-spec.md § User Stories
  → Change: {what to change}
  → Details: {user's exact request}
[ADD] journeys/JRN-00N-checkout.md (+ journeys.yml entry)
  → Add: {what to add}
[REMOVE] metrics.md § Leading Indicators
  → Remove: {what to remove}
[RESTRUCTURE] wireframes/ → split screen-3 into two screens
  → Details: {user's request}

Total changes: {N}
```

Ask: *"I've identified {N} changes. Should I apply all of them, or adjust the
list first?"* When a request is unclear, ask for clarification rather than
interpreting it freely. Prefer small rounds (2–3 changes, then confirm) over
batching many changes at once.

### 3C. Apply changes

For each change, launch a **Revision Agent** with:

> You are the Product Spec Revision Agent for Product Forge.
> Apply ONE specific change to the product spec document.
>
> Feature directory: `{FEATURE_DIR}`
> Document to modify: `{target file}`
> Change requested: `{change description}`
> User's exact words: `{user's original text}`
>
> Rules:
> 1. Read the current file content first.
> 2. Apply only the requested change; leave everything else as it is.
> 3. Preserve all cross-links and relative paths.
> 4. If the change splits a file, create the new files and update the README.md links.
> 5. Return: the file path modified and a brief description of what changed.

Run changes to the same file sequentially and changes to different files in
parallel. Fix only what the user asked; add no new sections on your own. Any
split, rename or restructure updates every affected link in the README.md files.

### 3D. Update review.md

1. Append a **Revision record** (template in
   [revalidate-review.md](../docs/templates/revalidate-review.md)) under
   `## Revision History`, with the user's feedback verbatim.
2. Append to `## Change History`: `v1.{N-1} → v1.{N}: {1-line summary of the most important changes}`.
3. Move every open question the revision resolved from `product-spec.md` to the
   `## Open Questions Resolution` table.
4. Record every significant scope or design decision in `## Decision Log`.

### 3E. Show the result and ask again

Show: *Revision #{N} applied — {N} changes made*, each changed file with what
changed, and the key changes. Review the updated documents in
`{FEATURE_DIR}/product-spec/`, then ask:

```
[Gate] Revision #{N} applied — {N} changes. How do you want to proceed?

  1. Approve (recommended) — lock the spec and continue to bridge
  2. Revise — list more changes to apply
  3. Abort — stop the lifecycle for this feature
  (or type your own answer)
```

Approve → Step 4; Revise → 3F; Abort, or a typed rollback, is handled as in the
Step 2 table.

### 3F. Loop back

Return to 3A and wait for the next reply.

## Step 4: Final approval

Runs when the user approves ("APPROVED", "LGTM", "looks good", "approve", "ready").

### 4A. Final consistency check

1. Every cross-link in `product-spec/README.md` resolves.
2. Every referenced wireframe file exists.
3. Open questions in `product-spec.md` that should be answered before proceeding
   are listed.
4. Every user story in `product-spec.md` maps to ≥1 journey in
   `journeys/journeys.yml`.
5. **Determinism lens.** For each acceptance criterion under each Must-Have story,
   ask: *"Would two competent implementers build materially different things from
   this criterion?"* Flag it as ambiguous when it has no observable / measurable
   outcome, relies on a subjective term (`fast`, `intuitive`, `secure`, …) with no
   threshold, or leaves a branch (error path, empty / limit state, permission
   case) unspecified. List each failing criterion with its US/AC and the
   divergence it allows.

Handle the issues found:

- Minor (broken link, typo) → fix it and note the fix in `review.md`.
- Moderate (story/journey mismatch, ambiguous criterion) → show it and ask
  whether to fix now or proceed; record every criterion sharpened or deferred in
  the `## Open Questions Resolution` table.

### 4B. Lock the spec

1. Append the **Approval block** from
   [revalidate-review.md](../docs/templates/revalidate-review.md) to `review.md`.
2. Set status (standalone):

   ```yaml
   phases:
     revalidation:
       status: completed   # readers still accept the legacy literal `approved`
   ```

3. In `{FEATURE_DIR}/README.md`, set the phase table row Phase 3 Revalidation → ✅ Approved.

### 4C. Drift check

When `{FEATURE_DIR}/spec.md` exists (a previous bridge run), compare
`product-spec.md` against it: Must Have user stories added or removed, scope
changes in the out-of-scope list, open questions newly resolved or added. On
divergence, append the **Drift warning** from
[revalidate-review.md](../docs/templates/revalidate-review.md) to `review.md`.
When `spec.md` does not exist, skip this check without comment.

### 4D. Completion message

Report: *Product spec approved and locked*; the finalized documents
(`product-spec.md` with {N} user stories and {N} requirements,
`journeys/journeys.yml` with {N} journeys, {N} wireframe screens, `metrics.md` /
mockups if present); {N} revision rounds captured in `review.md`; and
`Next step: /speckit.product-forge.bridge`.

## Done when

- Every product-spec document was read and `review.md` exists.
- The user explicitly approved the spec — through a Gate prompt or an approval
  phrase — with no auto-approval.
- Every revision round has a Revision record with the user's exact words, a
  Change History line, resolved questions moved to the resolution table, and
  significant decisions in the Decision Log.
- The 4A check ran: links and wireframes resolve, every story maps to a journey,
  and every Must-Have AC passed the determinism lens or was sharpened / deferred
  in `review.md`.
- `review.md` carries the Approval block; the README phase table shows Phase 3
  ✅ Approved; a Drift warning is appended when `spec.md` diverged.
- Standalone: the decision is recorded in `gates[]` and `phases.revalidation.status`
  is set from it (`completed` on approval). `--from-forge`: the outcome is
  returned to forge, with no gate entry and no `phases.revalidation.status` write.
- On Rollback or Abort the run stopped with statuses set per the Step 2 table.
