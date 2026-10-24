# Interaction Prompt Templates

> Ready-to-use structured prompts for the [interaction convention](../interaction.md).
> Render via the host's `AskUserQuestion` where available; otherwise as the
> numbered-list fallback shown here. Always allow a free-text "Other" answer.

---

## Gate (after every phase)

```
[Gate] {Phase} complete — {one-line outcome}. How do you want to proceed?

  1. Approve (recommended) — accept this phase and continue to {next phase}
  2. Revise — re-run this phase with feedback
  3. Skip {next phase} — move on without it (a reason may be required)   ← only when allowed, see below
  4. Rollback — return to an earlier, completed phase by name
  5. Abort — stop the lifecycle for this feature
  (or type your own answer)
```

Maps to `gates[].decision` ∈ `approved | revised | skipped | rolled_back | aborted`
(see [policy §2](../policy.md#2-gate-decisions)); "approve with conditions" typed
as free text records `approved_with_conditions` with the conditions listed.

**Parameters** (the caller supplies only these): `{Phase}`, the one-line outcome,
`{next phase}`, and any phase-specific extra option (e.g. "Acknowledge" at verify).

**Computed options** ([runtime.md §6.3](../runtime.md#63-gate-prompt)):

- Show option 3 **only** when `{next phase}` is `opt` for the feature's mode in
  [`phase-map.yml`](../schema/phase-map.yml) and no `require_*` key makes it
  required. Otherwise drop it and renumber — never offer Skip on a required phase.
- If Skip is chosen and `require_skip_reason: true`, follow up with the
  *Skip reason* prompt below.
- Rollback lists only `completed` phases.

**After the answer:** set the phase status from the decision
([runtime.md §6.2](../runtime.md#62-status-follows-the-decision)) and append the
gate entry once ([runtime.md §6.1](../runtime.md#61-gate-ownership)).

---

## Triage / track selection (Theme A, intake)

```
[Track] This change looks like {classification} ({signals}). Which track?

  1. {recommended track} (recommended) — {why it fits the size}
  2. express — single spec→plan→implement→verify pass (trivial changes)
  3. lite — product-spec → plan → implement → verify (small features)
  4. standard — full lifecycle (research → … → release)
  (or type your own answer)
```

Persist the choice as `feature_mode` (express is a first-class mode value) on `.forge-status.yml`.

---

## Skip reason (policy §3)

```
[Skip why] You chose to skip {phase}. What's the reason? (required)

  (free text — empty/whitespace is rejected under require_skip_reason: true)
```

---

## Optional-phase offer

```
[Run {phase}?] {one-line value of the phase}.

  1. Run {phase} (recommended for {when}) 
  2. Skip — {consequence}
  (or type your own answer)
```

---

## Next action at phase handoff (Theme I)

```
[Next step] {Phase} done. What next?

  1. Proceed to Phase {N}: {name} (recommended)
  2. Run optional: {optional phase}
  3. Run a cross-cutting command (sync-verify / change-request / status)
  4. Pause — save state and stop (resume later with /speckit.product-forge.forge)
  (or type your own answer)
```

---

## Research scope opt-ins (multiSelect)

```
[Research scope] Which research dimensions should run? (select all that apply)

  - Competitors (default on)
  - UX/UI patterns (default on)
  - Codebase analysis (default on)
  - Tech-stack comparison
  - Metrics / ROI
  (or type your own answer)
```

---

## Product-spec detail level

```
[Detail] How detailed should the product spec be?

  1. Standard (recommended) — balanced depth
  2. Concise — minimal, for small/clear features
  3. Exhaustive — deep, for complex/ambiguous features
  (or type your own answer)
```

---

## Vertical-slice split offer (Theme A)

```
[Slices] This feature is large. Split into vertical slices that each run
implement→verify independently?

  1. Split into slices (recommended for >10 tasks) — faster feedback, smaller reviews
  2. Keep as one — single implement→verify pass
  (or type your own answer)
```
