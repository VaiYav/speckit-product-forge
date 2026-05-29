# Product Forge — Wave 5 Audit & Roadmap

> Status: complete (audit + research + roadmap) · Date: 2026-05-28
> Builds on [2026-05-sdd-flow-improvements.md](./2026-05-sdd-flow-improvements.md) (Themes A–I, Waves 1–4, now implemented in branch `claude/sdlc-sdd-workflow-research-dQZed`).
> This document: (1) audits what Waves 1–4 actually landed, (2) re-validates against 2026 practice + finds net-new gaps, (3) proposes a prioritized Wave 5 with a **high bar for adding** and **consolidation/lightening as a first-class outcome**.

---

## Part 1 — Audit of Waves 1–4 (the branch changes)

Method: deterministic checks (link/anchor/command-ref/version greps via `/tmp/pf_audit.py`) for the mechanical half; agent fan-out reserved for semantic end-to-end wiring and gate/contradiction checks.

### 1.1 Deterministic findings

**Clean:**
- **Command references** — every `speckit.product-forge.<x>` reference resolves to a `commands/<x>.md` file AND is registered in `extension.yml > provides` (incl. the two new commands `design-system-harvest`, `spec-merge`). No dangling refs, no missing files, no unregistered commands.
- **Internal anchors in `commands/forge.md`** — all `docs/runtime.md#…` and `docs/policy.md#40-intake--triage-e15` anchors resolve (verified against actual GitHub-slugified headings).
- **Schema coverage of new fields** — `feature_mode: express`, `phases.design_system_harvest`, `phases.spec_merge` all present in `forge-status-v3.schema.yml`.

**Defects (deterministic):**

| ID | Severity | File | Issue | Fix |
|----|----------|------|-------|-----|
| AUD-D1 | HIGH | `docs/schema/forge-status-v3.schema.yml:141` | `gates[].decision` enum comment lists `approved \| approved_with_conditions \| revised \| skipped \| aborted` — **missing `rolled_back`**. Policy §2 (lines 55, 58) defines `rolled_back` as a valid gate decision and references a `rolled_back_to: "<phase>"` field that the schema never documents. Schema↔policy contradiction; a writer following the schema would reject a legitimate rollback decision. | Add `rolled_back` to the enum comment + document the `rolled_back_to` field on the gate entry. |
| AUD-D2 | MEDIUM | (systemic) version drift | Version stamps are inconsistent across the package: `extension.yml` = **1.5.1**; `commands/forge.md` + `docs/policy.md` + schema intro = **v1.5.0**; new Wave-1–4 features are tagged **v1.6** throughout `commands/*` and several docs; `config-template.yml` mixes **v1.5.0** and **v1.6.0**. The Wave-1–4 capability set ("v1.6") is documented as shipped, but the extension version was never bumped to 1.6.0. | Pick one target release (recommend **1.6.0**), bump `extension.yml`, and unify the "v1.x" stamps that gate behavior. Cosmetic per-line "(v1.6)" feature tags can stay as "added-in" markers. |
| AUD-D3 | LOW | `docs/phases.md:1,206` | Title says **"Phase Reference (v1.3.0)"** and an Appendix is stamped v1.5.0, yet the body documents **v1.6** verify layers (lines 256–259) and v1.6 commands. Title/version is stale relative to content. | Re-stamp `docs/phases.md` to the unified target version (1.6.0). |
| AUD-D4 | LOW | `CHANGELOG.md:142` | Links to `docs/runtime.md#2-state-lock-protocol` but the heading slug is `#2-state-lock-protocol-a2`. Broken anchor. | Fix the anchor to `#2-state-lock-protocol-a2`. |

> Note on link audit: 46 raw "broken link" hits were **false positives** — they are example paths to runtime feature artifacts (`./research/…`, `./product-spec/…`, `./mockups/…`) that only exist under `features/{slug}/` at runtime, not in the repo.

### 1.2 Semantic findings (end-to-end wiring & contradictions)

**Independently verified by direct file reads** (cross-checked against the semantic-audit workflow):

| ID | Severity | Theme | File(s) | Finding | Fix |
|----|----------|-------|---------|---------|-----|
| AUD-S1 | MEDIUM | D | `commands/monitoring-setup.md`, `commands/forge.md:747`, `extension.yml` | NewRelic is still the **default/primary** monitoring provider, contradicting Theme D's "PostHog/Sentry first-class, **NewRelic optional**". `monitoring-setup.md` defaults `--provider` to `newrelic`, Step 2 builds a NerdGraph dashboard via `newrelic-dashboard-builder`, and the PostHog/Sentry path is bolted on as a top note. `forge.md` completion summary hardcodes "NewRelic dashboard"; `extension.yml` description says "NewRelic dashboard JSON … Wraps newrelic-dashboard-builder". | Make provider resolution data-driven (default to `telemetry.dashboards`); demote NewRelic to one option; fix the forge.md summary + extension.yml wording. |
| AUD-S2 | LOW | D | `commands/retrospective.md:196` | Report template hardcodes a `## Performance Data (NewRelic)` section even though Step 1/3 correctly use connected MCPs (PostHog/Amplitude/Sentry). | Rename to provider-neutral "Performance Data ({provider})". |
| AUD-S3 | MEDIUM | X (config) | `docs/policy.md §6`, `config-template.yml`, `docs/config.md`, `extension.yml` | Policy §6 names config keys `require_code_review`, `require_testing`, `require_pre_impl_review` to force optional phases, but **none are documented** in `config-template.yml` or `docs/config.md`. Separately, the `extension.yml > config` block is stale — it lists none of the Wave-1–4 keys (`flow_mode`, `e2e_runner`, `default_feature_mode`, `require_skip_reason`, `telemetry`, `progressive_verify_interval`). | Add the `require_*` keys to the config template + docs; refresh the `extension.yml` config block (or point it at `config-template.yml` as the single source). |
| AUD-S4 | INFO | C | `commands/tasks.md §4.2`, `commands/implement.md §4`, `docs/templates/traceability-matrix.md` | **Producer→consumer of `traceability.yml` is correctly wired**: `tasks` seeds rows + `tasks:` column, `implement` fills `code`/component usage at progressive-verify checkpoints, `verify-full` consumes (Step 1 "do not re-derive"; Layers 1–4 read the matrix). One ambiguity: initial row *creation* with upstream IDs (`REQ/US/JRN/FR/must_have`) is implicit — `tasks` assumes the rows exist. Confirm `bridge`/`product-spec` emit them (else `tasks` silently becomes the sole creator). | (Verify in workflow output.) If unowned, assign row seeding explicitly to `bridge` (REQ/FR) + `product-spec` (US/JRN). |

**Theme H regression check — CLEAN:** no live references to the old free-form `user-journey.md` remain (only 2 intentional "replaces…" mentions in docs). The `journeys/` refactor is complete.

**Learning-loop reality (corrects user seed candidate #4):** `commands/research.md:107–126` **already** reads `.product-forge/lessons.md` and injects a "Prior lessons that apply" section. `plan.md` and `code-review.md` do **not**. So the premise "written but never read" is only half-true — the Wave 5 item is *extend* lesson injection to `plan` + `code-review`, not *create* it. (See Part 3.)

#### Consolidated semantic audit (10-agent fan-out → dedup synthesis)

**Meta-pattern (the single most important takeaway):** Waves 1–4 wired most contracts **"callout-deep, not procedure-deep"** — a prose callout / header note announces the capability, but the step-by-step procedure, the **carrier field**, or the **producer** that the contract needs was never built. The happy path *reads* like it works; the contract doesn't *execute* end-to-end. This is exactly the class of defect a deterministic `spec-lint` / `validate-traceability` script (user seed #1) would catch — strengthening that candidate into the Wave 5 **enforcement backbone**.

**Cross-theme inconsistencies (one theme assumes a contract another implements differently):**
- **X1 — `gates[].decision` has THREE incompatible vocabularies.** policy §2 + runtime §6 define the canonical 6-value enum (incl. `rolled_back`); schema `forge-status-v3.schema.yml:141` lists only 5 (missing `rolled_back`, no `rolled_back_to`); `release-readiness.md:368` writes 3 novel literals (`ready/conditionally_ready/not_ready`). One field, three disagreeing definitions.
- **X2 — `traceability.yml` is read on columns its declared producers never write.** verify-full Layers 7–10 + spec-merge consume `events`/`contracts`/`journeys`/`tests`/`status≥verified`/per-edge priority/drift-carrier — but the matrix "Owners (write)" header over-claims writers that only *reference* the file; several columns have no producer.
- **X3 — `REQ-*` canonical identity has no producer in the forward create-flow.** Theme B (delta/spec-merge) and Theme C (matrix) both key on `REQ-*`, but only `backfill.md` (reverse-engineering) and the external V-Model pack mint them; bridge→plan→tasks mint only `US-*`/`FR-*`. (Useful: backfill's REQ-minting pattern can be ported into bridge.)

**Wiring scorecard:**

| Theme | Status | Why |
|-------|--------|-----|
| A (gates/state/interaction core) | partial | canonical enums correct, but schema (CF-34) + release-readiness (CF-2) diverge; version drift (CF-31) |
| B (living spec / delta / spec-merge) | **broken** | spec-merge consumes REQ-* no forward command produces (CF-1); bridge & change-request never write the delta files they promise (CF-15, CF-16) |
| C (traceability + diff review + IDs) | partial | matrix re-derived not consumed (CF-6); columns with no writer (CF-7); dead `verified` gate (CF-18); IDs mis-homed (CF-11) |
| D (telemetry + Red gate + 2-layer review) | **broken** | 2-layer review real, but Red gate unenforceable (CF-3) + marker undefined (CF-4) |
| E (design system + mockups + component-map) | partial | contract intact field-for-field; only an unconsumed config key (CF-24). **Strongest theme.** |
| F (FE↔BE contracts + drift) | partial | bridge contracts + verify-full L9 real, but sync-verify has no contract layer (CF-8), plan is a phantom co-author (CF-17), api-docs self-contradicts (CF-9) |
| G (doc↔code reconciliation) | partial | detection wired+gated; the loop back to spec-merge is dangling — no carrier field/consumer path (CF-5) |
| H (journeys → Playwright) | partial | authoring+generation correct; failure-traceback under-wired — no JRN/STEP/EDGE slot in BUG schema (CF-14), flat edge/test linkage defeats Layer 7 (CF-19) |
| I (interaction convention) | partial | well-authored, but applied in only 2/8 phases (CF-13); orchestrator gates free-form (CF-12); release-readiness breaks the enum (CF-2) |

**CRITICAL**
- **CF-1** — REQ-* canonical ids have no producer in the forward create-flow (bridge/spec-merge/change-request/traceability template). *Fix: port backfill's REQ-minting into bridge (map FR-NNN→REQ-NNN), OR re-key the delta model on FR-*.* **[fork — needs decision]**
- **CF-2** — release-readiness writes gate literals `ready/conditionally_ready/not_ready` absent from the canonical enum. *Fix: map ready→approved, conditionally_ready→approved_with_conditions, not_ready→Revise/Abort.* **[fix-now]**
- **CF-3** — test-first "Red" gate is orchestrator-silent, skippable, no audit field. *Fix: forge Phase 6 invokes+verifies it; add `phases.implement.red_gate{status,tests[],skip_reason}` to schema.* **[fix-now]**
- **CF-4** — test-first task marker consumed by implement but never defined by tasks. *Fix: define marker (e.g. `Test-first: true`) in tasks §4.3; consume by name in implement §2.5.* **[fix-now]**
- **CF-5** — doc↔code drift "suggestion" has no carrier field and no consumer path into spec-merge. *Fix: add a "Suggested canonical-spec updates" section to verify-report template + add verify-report/code-review to spec-merge inputs.* **[fix-now]**

**HIGH**
- **CF-6** — verify-full says "consume the matrix" in a one-line preamble but Layers 1–4 re-derive from raw artifacts with a stale column model. *Fix: rewrite L1–4 to iterate matrix rows by field; replace report table columns with real schema.* **[fix-now, larger]**
- **CF-7** — matrix "Owners (write)" names writers (product-spec/bridge/plan/test-plan/test-run/tracking-plan) that never write the file → null columns. *Fix: add write-steps OR correct the header + reassign columns.* **[fix-now]**
- **CF-8** — sync-verify lacks the contract-drift AND doc↔code layers the doc requires (still 7 layers). *Fix: add both layers; renumber 1–7→1–9.* **[fix-now, larger]**
- **CF-9** — api-docs body still authors from scratch to a divergent path, contradicting its contract-first banner; no AsyncAPI. *Fix: treat contracts/* as authoritative input, regenerate same files, add AsyncAPI branch.* **[fix-now]**
- **CF-10** — monitoring-setup callout promises PostHog/Sentry via MCP but Steps 2–4 only build NewRelic. *Fix: add posthog/sentry build branches; provider reflects telemetry.dashboards.* **[fix-now]**
- **CF-11** — ID system absent from docs/schema.md where the improvement doc says it lives (only in the template). *Fix: add an ID-system section to schema.md (or docs/ids.md) + link from template.* **[fix-now]**
- **CF-12** — mandatory phase gates in forge.md are free-form prose, not the 5-option structured gate. *Fix: replace each `**Gate:**` with the Gate template; map verify/test-run acknowledgements to a literal.* **[fix-now]**
- **CF-13** — interaction convention applied in only 2/8 in-scope phases (research dumps a 7-Q wall of text). *Fix: add the normative block + structured prompts to research/plan/tasks/test-plan/revalidate/release-readiness.* **[fix-now]**
- **CF-14** — BUG-NNN.md schema has no JRN/STEP/EDGE field; test-run's failure→journey mapping has nowhere to land. *Fix: add a `Journey:/Step|Edge:` line to the BUG template + canonical schema.* **[fix-now]**
- **CF-15** — change-request claims delta specs but its procedure never writes a delta file. *Fix: add a delta-write step (mirror bridge §4.6); DEFERRED/REJECTED emit none.* **[fix-now]**
- **CF-16** — bridge mentions deltas in prose but no template/quality-check/status-record. *Fix: add a delta template block + a Step-5 quality check + record the delta path.* **[fix-now]**

**MEDIUM** — CF-17 plan is a phantom contract co-author [fork]; CF-18 row `status` has no `verified` producer yet spec-merge gates on it [fork: relax read-only vs designate producer]; CF-19 flat edge/test linkage defeats Layer 7 [fix-now]; CF-20 .spec.ts/test-cases.md omit JRN/STEP/EDGE tags [fix-now]; CF-21 spec-merge not idempotent [fix-now]; CF-22 orphan deltas on abort/defer undefined [fix-now]; CF-23 spec-merge trigger inconsistent across 4 docs [fix-now]; CF-24 `default_mockup_style` never consumed [fix-now]; CF-25 implement lacks the spec-anchored loop the doc assigns it [fix-now: update doc to reflect relocation to spec-merge]; CF-26 release-readiness gate options omit Rollback/Abort [fix-now]; CF-27 "Next step" handoff only wired in fluid mode [fix-now]; CF-28 contract map omits DB leg [fork: add db field vs scope down]; CF-29 diff-digests not wired into revalidate/code-review [fix-now]; CF-30 NewRelic-only remnants across forge/phases/extension/README/config default [fix-now]; CF-31 version drift [fix-now].

**LOW** — CF-32 phases.md title v1.3.0 vs v1.6 content; CF-33 CHANGELOG anchor; CF-34 schema enum missing `rolled_back`+`rolled_back_to`; CF-35 code-review vs verify-full severity vocab note; CF-36 README lingering `user-journey.md`; CF-37 file-structure single-vs-per-JRN spec; CF-38 journeys.md selector-source imprecision; CF-39 implement/tests-column owner self-contradiction (subsumed by CF-7); CF-40 per-step vs journey-level actor wording. *(All deterministic/doc — fix-now.)*

> 2 of 11 audit agents (Theme A right-sizing, Theme X cross-cutting) failed to return structured output; their scope is partly covered by the deterministic audit (§1.1) + cross-theme X1–X3 + CF-31..34. A targeted re-run fills the remainder (see §1.3).

---

### 1.3 Theme A / cross-cutting gap-fill (the 2 audit agents that failed to return)

- **CF-A1 (MEDIUM, Theme A) — fluid-mode next-runnable-set resolution is referenced but never defined.** `commands/forge.md §"Flow Mode"` and `docs/policy.md §4.0.1` both say *"See runtime.md for how fluid mode resolves the next runnable set"*, but `docs/runtime.md` contains **no** fluid/runnable/enabler section (grep returns nothing). forge.md gives a one-line heuristic ("a phase is runnable when its required upstream artifacts exist") but the deferred-to definition does not exist. *Fix: add a `runtime.md §"Fluid-mode runnable-set resolution"` section (dependency→enabler table per phase) or inline the rule and drop the dangling reference.* **[fix-now]**
- **Theme A otherwise consistent:** express is a first-class `feature_mode` across forge/policy/schema/config; express's non-express phases resolve to `not_applicable` (correctly exempt from the §3 skip-reason policy); escalation is append-only upward, downgrade only at intake — no contradiction found.
- **Cross-cutting (X) remainder** is covered by §1.1 (AUD-D1–D4), the X1–X3 cross-theme block, AUD-S3 (undocumented `require_*` config keys + stale `extension.yml` config block), and CF-31/34.

---

## Part 2 — 2026 best-practice re-validation + net-new gaps

Method: 11 research angles (web) — one per user seed candidate (#1–8) plus 3 net-new angles (agent orchestration, process observability/eval, recency) — → 42 raw candidates → per-candidate verification against the repo (adversarial claim check + "already in PF?" + overload-direction) → ranked synthesis. 41 candidates verified.

**Headline numbers:** every claim held (`claim_holds: 41/41` — no hype rejected on facts). **Zero candidates were fully present in PF** (`already_in_pf`: 35 partial, 6 net-new, 0 "yes") — i.e. PF touches almost every 2026 practice but completes none, exactly matching the audit's "callout-deep" meta-finding. Overload split: **11 reduce surface, 2 neutral, 28 add** — so the high-ROI core is small and the "adds" bucket needs the high bar. 7 candidates rejected outright.

### 2.1 The 8 seed candidates, re-validated against 2026 practice + the repo

| # | Seed candidate | Verdict | Refinement from research + audit |
|---|----------------|---------|----------------------------------|
| 1 | Deterministic validators (`validate-traceability`, `spec-lint`) | **Strongly validated — becomes the Wave 5 backbone** | 2026 splits validation into **deterministic structural** (OpenSpec `validate --strict`: Zod schema, exit codes, `--json`, every Requirement→≥1 Scenario) vs **LLM semantic** (spec-kit `/analyze`, `/checklist` are *prompts*, not scripts). PF blurs them. Build the structural script over the existing `traceability.yml`/`journeys.yml` graph; keep "is this AC truly measurable" LLM-judged. Folds in EARS grammar lint (FR/NFR/AC only) + weak-word lint. **Reduces** overload; it is also the enforcement layer that *prevents* the callout-deep regressions the audit found. |
| 2 | `--ci` / headless + policy-as-code | Validated as a real gap, **opt-in only** | PF cannot run headless at all (genuine 2026 limitation). Adopt `forge --ci` mapping {phase × risk}→{auto-*recommend* / require-human / block} reusing `gates[]` + the `§4.0` triage classifier + `runtime §7` dry-run. **Hard guardrail: NO auto-approve-without-human** (contradicts `policy §1.2` / `revalidate.md:326`). Bundle gh-aw "safe-outputs" discipline (read-only default, writes only as reviewable PR/comment). `adds` — clears the bar. |
| 3 | Single consolidated review surface | Validated + sharpened | Three concrete mechanisms PF lacks: (a) one gate artifact + single `F-NNN` namespace, collapse-by-default (CodeRabbit Atlas); (b) **delta/incremental review** vs a reviewed-SHA stamp on `gates[]` (completes audit CF-29); (c) **spec-diff-as-surface** for the markdown-then-code double review (Fowler/Tessl). All **reduce** overload. Also fixes audit CF-35. |
| 4 | Lessons → prompts (close the loop) | **Premise corrected → extend, don't create** | `research.md:107–126` *already* reads/scores/injects lessons. Extend the *existing* selection to `plan` + `pre-impl-review` (strongest host = pre-impl risk register) by forwarding it through the brief→digest chain, not 3 new re-scoring steps. Add a read-side harvest hook in `retrospective §5` (overload-neutral). |
| 5 | Adversarial critic before implement | Validated but **fold in, don't add a phase** | A standalone critic phase grows the surface this wave is shrinking. Fold a "would two implementers build different things?" determinism lens into `revalidate §4A` + a Contradictions/counterfactual check into `pre-impl-review §3`. The debate-loop *harness* is rejected (reuse `revalidate #7` / `test-run §8` bounded-loop primitives if a critic ever ships). |
| 6 | Visual regression vs mockup | **Pixel-diff rejected; DOM/token conformance adopted** | Mockup-pixel-diff is "mostly noise" (static mockup vs real-data app) and PF deliberately avoids pixels — **skip**. Adopt instead a runtime **component + variant + design-token conformance** check (DOM assertions on `[data-cmp]` + computed-style/token lint) — but **in the Phase 8A Playwright generator, NOT verify-full** (Phase 7 is read-only, no running app). |
| 7 | a11y gate + SBOM/license | Validated | `@axe-core/playwright` per-journey **WCAG-AA automated floor** (fulfils `bridge.md:316`'s dangling AC) — house in release-readiness/a dedicated skill per `testing-strategy §2` scoping, not bolted into test-run. SBOM/SCA/license/provenance as **artifact-producing** rows in `release-readiness §5C` (Syft/OSV-Scanner PR-diff mode/SPDX/attest-build-provenance). Both `adds` — clear the bar. |
| 8 | Reverse sync code→spec | Validated, **minimal kernel only** | Detection already exists (sync-verify L5 + verify-full L10). Net-new kernel: enrich the orphan WARNING with **commit SHA + author** (reverse-index `task_log[].commit_sha`); route unmatched→delta via the CF-5 carrier, gated behind Theme-B repair. Optional later: `oasdiff` contract reverse-drift (rides CF-8). Full tree-sitter AST-fingerprint is out of character for a markdown extension — defer. |

### 2.2 Net-new beyond the seeds (research angles the prior doc missed)

- **Install-time package vetting against slopsquatting in `/implement`** — genuinely net-new live attack surface (PF *is* an agent that adds deps mid-build; a release SBOM can't catch it). USENIX-2025-documented. Fold minimally into the implement checkpoint + `security-check`. `adds`, clears bar.
- **Prevent-self-review / distinct-approver rule in `policy §5.2`** — salvaged from the (rejected) GitHub-Environments candidate; a real gap in the in-session role model. Cheap.
- **Process observability / eval:** PF already logs `tokens_in/out` per phase. The realistic next step is the deterministic A1 backbone as the quality signal + a stall/forward-progress counter on the `test-run §8` loop — **not** a new orchestrator ledger (duplicates `.forge-status.yml`).

### 2.3 Rejected outright (the discipline the wave demands)

ADR-retrieved-memory (no ADR *producer* → reproduces CF-1), debate-loop harness (harness for an unshipped critic), mockup pixel-diff (noise + wrong technique), Kiro edit-loop hooks (progressive-verify already does in-loop drift; couples to one harness), parallel-worktree execution (violates `policy §1.1`; PF has no execution runtime), GitHub-Environments-as-gate (architecture mismatch), evaluator-optimizer-extended (already at bridge §5 / plan §3.5 / test-run §8), orchestrator ledger (duplicates existing state). Already-shipped (don't re-add): the Req↔…↔Test matrix, AAA, the Red gate concept, forward journey-test tagging, static component conformance.

---

## Part 3 — Wave 5 roadmap (prioritized)

**Framing.** Two tracks. **Track 1 (Harden)** closes the audit's producer/consumer/carrier gaps — this is where most of the value is, it is *net surface-reducing or flat*, and it is the prerequisite for almost everything in Track 2. **Track 2 (Capability)** adds the small set of research candidates that clear the high bar, anchored to existing commands (no new phases). The single highest-leverage item — the deterministic validator backbone (W5-A1) — belongs to both: it hardens Track 1 *and* it is the mechanism that stops "callout-deep" regressions from recurring.

> **Net-surface accounting (the wave's success metric):** Track 1 removes redundant LLM prose (CF-6, CF-29, A1 fronting), collapses 3 review docs into 1 (A3), and replaces prose checklists with deterministic tools (A1, B4) — a *reduction*. Track 2 adds capability behind opt-in flags and existing hosts. The wave should net out **flat-or-lighter in human review surface** while raising enforcement.

### 3.1 Track 1 — Harden Waves 1–4: FIX-NOW batch (low-risk, high-confidence, no fork)

These make the procedure match the already-decided design. Grouped by edit kind.

**Deterministic / docs (mechanical, lowest risk):**
- **CF-31 + CF-32** — unify version stamps on a single target (**recommend `1.6.0`**): bump `extension.yml`, `commands/forge.md`, `docs/policy.md`, `docs/phases.md` title, schema intro. *(version-target is the one trivial choice below.)*
- **CF-33** — fix `CHANGELOG.md:142` anchor → `#2-state-lock-protocol-a2`.
- **CF-34** — add `rolled_back` to the schema `gates[].decision` enum + document the `rolled_back_to` field (closes X1's schema leg).
- **CF-36** — replace `README.md:130,328` `user-journey*.md` with the `journeys/` subtree.
- **CF-37** — `docs/file-structure.md:74` → per-JRN `.spec.ts × N`.
- **CF-38** — `docs/journeys.md:100,68` selector wording → "via component-map `CMP-*` ids against `manifest.yml`".
- **CF-11** — add an **ID-system section** to `docs/schema.md` (or new `docs/ids.md`) holding the prefix table; link from the traceability template.
- **CF-A1** — add a `runtime.md §"Fluid-mode runnable-set resolution"` section (dependency→enabler table) so forge/policy's deferral resolves.
- **AUD-S3** — add the `require_code_review`/`require_testing`/`require_pre_impl_review` keys to `config-template.yml` + `docs/config.md`; refresh the stale `extension.yml > config` block (or point it at `config-template.yml`).

**Contradiction / wording fixes:**
- **CF-30** — de-NewRelic the orchestrator + manifest + README + retrospective heading + config default (`telemetry.dashboards: none`), framing as "configured backend (PostHog/Sentry/Amplitude; NewRelic optional)".
- **CF-2 + CF-26** — map release-readiness verdicts onto the canonical gate enum (`ready→approved`, `conditionally_ready→approved_with_conditions`, `not_ready→Revise/Abort`) and add Rollback/Abort to its gate options (closes X1's release-readiness leg).
- **CF-35** — one-line note that verify-full Layer 10 escalates code-review Dimension 5 findings to CRITICAL/WARNING (intentional phase-appropriate mapping).
- **CF-23** — make spec-merge's trigger consistent: keep it Phase 10, fix the prior improvement doc's "trigger" wording → "after release-readiness", add a "Next step: run /spec-merge" pointer to `release-readiness §7`.
- **CF-25** — update the *prior* improvement doc + §4 table to state the spec-anchored loop is consolidated into spec-merge/verify-full (it was relocated there from implement — the better design).

**Carrier-field / procedure-deepening (the core anti-callout-deep fixes):**
- **CF-3 + CF-4** — make the Red gate real: define a `Test-first: true` task marker in `tasks §4.3`, consume it by name in `implement §2.5`, have `forge` Phase 6 invoke+verify it, and add a `phases.implement.red_gate{status,tests[],skip_reason}` field to the schema.
- **CF-5** — add a "Suggested canonical-spec updates" subsection to the `verify-report.md` template (or a `canonical_drift` row field) + add verify-report/code-review to `spec-merge` Step-1 inputs and read it in Step 4 (closes the dangling Theme-G loop).
- **CF-7** — reconcile the traceability "Owners (write)" header with reality: add explicit write-steps for `journeys`/`contracts`/`tests`/`events` columns to product-spec/bridge/plan/test-plan/test-run/tracking-plan, **or** narrow the header + reassign columns. (Pairs with CF-1 fork on REQ-* rows.)
- **CF-14 + CF-20 + CF-19** — add a `Journey:/Step|Edge:` field to the `BUG-NNN.md` template + canonical schema; add JRN/STEP/EDGE tags to the `.spec.ts` + `test-cases.md` templates; give the traceability `journeys` block per-edge `{id,priority,tests}` structure so verify-full Layer 7 can actually evaluate P0/P1 coverage.
- **CF-15 + CF-16** — add a concrete delta-spec **write step** + template to `bridge` and `change-request`, a Step-5 quality check in bridge, and record the delta path on the status file. **(Blocked on the CF-1 fork: REQ-* vs FR-* keying.)**
- **CF-21 + CF-22** — add a Step-0 idempotency guard to spec-merge (no-op if already merged/archived; upsert-by-id) + define the abort/defer fate of orphan deltas in spec-merge + policy.
- **CF-24** — make product-spec `§2E` read `default_mockup_style` as the pre-selected option and test the canonical value at the `§4E` skip gate; drop/realize the stale `generic` enum.
- **CF-6** — rewrite verify-full Layers 1–4 to iterate `traceability.yml` rows by field (fall back to raw only on null) + fix the report table columns. *(Larger; do alongside A1 so the script and the LLM layer agree on the schema.)*
- **CF-8** — add the contract-drift + doc↔code layers to `sync-verify` (renumber 1–7→1–9). *(Larger.)*
- **CF-9** — rewrite api-docs Steps 2–4 to treat `contracts/*` as authoritative input + add an AsyncAPI branch.
- **CF-10** — add PostHog/Sentry build branches to monitoring-setup Steps 2–4.
- **CF-12 + CF-13 + CF-27 + CF-29** — interaction convention: replace forge's free-form `**Gate:**` lines with the structured Gate template; add the normative interaction block + structured prompts to research/plan/tasks/test-plan/revalidate/release-readiness; emit the "Next step" handoff template in gated mode; add "diff since last approved" to revalidate/code-review.

### 3.2 Track 1 — FORKS (need a decision before implementing the dependent fixes)

| Fork | Question | Options | Recommendation |
|------|----------|---------|----------------|
| **F-A (CF-1)** | What identity anchors delta/spec-merge? | (a) **Port backfill's REQ-* minting into bridge** (map each FR→REQ); (b) **re-key the delta model on FR-*** (the ids bridge already produces) and fix the template line. | **(b) re-key on FR-*** — least new machinery, removes an unused namespace; REQ-* stays the V-Model/backfill canonical id. *(a) if a stable cross-feature canonical id is wanted long-term.* Gates CF-7/CF-15/CF-16. |
| **F-B (CF-18)** | Who promotes a traceability row to `verified`? | (a) **relax verify-full's read-only rule** to allow the single `status: verified` write; (b) designate `test-run`→`tested` + `release-readiness`/`spec-merge`→`verified`. | **(b)** keeps verify-full pure read-only; assign producers explicitly. |
| **F-C (CF-28)** | Does the FE↔BE contract map include the DB leg? | (a) **add a `db:/schema:` row field** + extend verify-full Layer 9 to assert handler→model; (b) **scope Theme F to FE↔contract↔BE** and drop the "→DB" promise from the prior doc. | **(b) scope down** for now (less surface); revisit DB-leg if drift is felt. |
| **F-D (version)** | Single target version? | `1.6.0` vs other. | **`1.6.0`** (the Wave-1–4 feature set is already tagged v1.6). |

### 3.3 Track 2 — Wave 5 new capabilities (ranked; anchored to existing hosts, no new phases)

**Group A — High-ROI / low-overload (REDUCES surface — build first):** ✅ **A2–A5 SHIPPED (Track-2 Wave 1)** — unified `gate-review.md` (single `F-NNN` namespace, collapse-by-default), `gates[].reviewed_sha` delta review, executable `scripts/gate-risk.js` risk routing, derived-artifact surface. Designed coherently as one gate redesign (not fanned out), wired into forge/code-review/pre-impl-review/verify-full + policy §9.
- **W5-A1 — Deterministic `validate-traceability` / `spec-lint` backbone** ✅ **SHIPPED this branch** (`scripts/validate-traceability.js`, zero-dep Node, `--json`/`--strict`/`--selftest`, wired as verify-full Step 0). *(seed 1; reduces; effort M)*. One non-LLM script over `traceability.yml`+`journeys.yml`+`specs/` asserting structural rules (must_have→task/code/test; no orphan task; no null link past its owning phase; JRN→EDGE/TC-E2E; US→AC; NFR→numeric signal) with exit code + JSON; fronts the LLM verify layers as a blocking pre-gate. Absorbs spec-lint, two-tier-validate, coverage-JSON, OpenSpec-validate-strict, OPA/Conftest (optional adapter). Riders on the same script: EARS grammar lint (FR/NFR/AC only), weak-word lint, `@spec`-style test-id tags (closes CF-14/19/20). **Co-sequence with the CF-1/3/4/7 producer fixes or it floods with unclosable gaps.** Honesty guardrail: structural = deterministic; semantic measurability stays LLM-judged. Joins `scripts/` next to the existing `acquire-lock.sh`.
- **W5-A2 — Delta/incremental review** *(seed 3; reduces; effort L)*. Stamp each `gates[]` decision with the reviewed artifact/git SHA; on re-run show only changed-line findings + stale-flagged prior approvals. Completes CF-29 reusing `phase-digest.md` + `task_log[].commit_sha`.
- **W5-A3 — Unified gate artifact + single `F-NNN` namespace** *(seed 3; reduces; effort M)*. Collapse pre-impl-review/code-review/verify-full findings into one collapse-by-default gate artifact grouped by journey/contract/component cohorts. Fixes CF-35. Replacement, not a 4th doc.
- **W5-A4 — Risk-routed single gate decision** *(seed 2/3; reduces; effort M)*. One risk class from existing signals → one routed gate headline; docs/config-only deltas suppress the full surface. Reuses the `§4.0` intake classifier. **Auto-*recommend*, human gate retained** (no auto-approve).
- **W5-A5 — spec-diff as the single review surface (LITE)** *(seed 3/8; reduces; effort M)*. Mark generated artifacts (mockups, `.spec.ts`, OpenAPI stubs) "derived — review the source diff" + a machine derived-vs-source gate. LITE: keep the machine gate (PF's generators are audited partial/broken — don't "trust generated code" Tessl-style).

**Group B — Quality & verification (real gaps; mostly `adds`, each cleared the bar):**
- **W5-B1 — `forge --ci` headless mode + declarative gate-policy** *(seed 2; adds; effort M; opt-in)*. {phase × risk}→{auto-recommend/require-human/block}, reuses `gates[]`+`§4.0`+`runtime §7`. Bundle gh-aw safe-outputs discipline. Uses A1 as its deterministic tier. **No auto-merge / no auto-approve.**
- **W5-B2 — axe-core a11y automated floor, JRN-scoped** *(seed 7; adds; effort L)*. Fulfils `bridge.md:316`'s dangling AC; WCAG-AA floor (manual review still required), housed per `testing-strategy §2`.
- **W5-B3 — SBOM + SCA + license + provenance in `release-readiness §5C`** *(seed 7; adds; effort M)*. Artifact-producing (Syft/OSV-Scanner PR-diff/SPDX/attest-build-provenance); tighten `code-review.md:70` to name the same SCA tool. Land with CF-2.
- **W5-B4 — `oasdiff` contract reverse-drift inside the CF-8 layer** *(seed 8/1/2; adds; effort M)*. Deterministic CLI shell-out (`contract_differ: oasdiff|none`) instead of LLM prose; rides the layer CF-8 adds anyway.
- **W5-B5 — Runtime component+token conformance in the Phase 8A generator** *(seed 6; adds≈neutral; effort L)*. DOM `[data-cmp]`+variant assertions + hardcoded-hex/token lint. **In Phase 8A, NOT verify-full** (read-only/no running app). No pixels.

**Group C — Net-new beyond seeds:**
- **W5-C1 — Out-of-band commit provenance** *(seed 8; adds-small; effort L)*. Enrich the existing orphan WARNING with commit SHA+author; route unmatched→delta via the CF-5 carrier. Gated behind Theme-B repair.
- **W5-C2 — Install-time slopsquat package vetting in `/implement`** *(net-new; adds; effort M)*. Registry-exists/age/popularity/allowlist check + dep logging, folded into the implement checkpoint + `security-check`.
- **W5-C3 — Distinct-approver rule in `policy §5.2`** *(net-new; neutral; effort L)*. Prevent self-review in the in-session role model.

**Group D — Learning loop (seed 4: extend):**
- **W5-D1 — Widen lessons read-back to `plan` + `pre-impl-review`** *(adds-small; effort L)*. Forward research's existing "Prior lessons that apply" selection through the brief→digest chain; strongest host = pre-impl risk register. Add Kiro-style `applies_to_globs` *with* a deterministic matcher procedure (not just a field).
- **W5-D2 — Read-side lesson harvest hook in `retrospective §5`** *(neutral; effort L)*. Harvest existing implement digest / code-review findings / drift reports as candidate lessons; keep human-gate-before-append.

**Group E — Adversarial critique (seed 5: fold in, no new phase):**
- **W5-E1 — Determinism lens in `revalidate §4A` + Contradictions/counterfactual check in `pre-impl-review §3`** *(adds-neutral; effort L)*.
- **W5-E2 — LLM-judge tier for subjective criteria only** *(adds; effort H; lowest priority)*. **Gated behind CF-3/CF-4** (fix the Red gate's own weaknesses first).

### 3.4 Suggested build order

1. **F-A…F-D decisions** → then the **CF-1/3/4/7 producer fixes co-sequenced with W5-A1 backbone** (or A1 floods with unclosable gaps).
2. **FIX-NOW mechanical/contradiction batch** (§3.1 first two groups — independent, low-risk) — can land immediately, in parallel with #1.
3. **W5-A2/A3/A5/A4** (overload-reducers) + remaining carrier-field fixes (CF-5/6/8/9/10/12/13).
4. **W5-D1/D2, W5-C1/C3** (low-effort/neutral; C1 gated behind CF-5).
5. **W5-B2/B3/B5** (a11y/supply-chain/conformance) → **W5-B1 `--ci`** (reuses A1) → **W5-B4** (rides CF-8) → **W5-C2**.
6. **W5-E1** (fold-in) → **W5-E2** (gated behind CF-3/4; lowest priority).

---

### 3.5 Implementation status (branch `claude/sdlc-sdd-workflow-research-dQZed`)

**Landed in this pass (Track-1 hardening + W5-A1 backbone):**
- All **§3.1 FIX-NOW** items applied across ~22 files (version unified to **1.6.0**; gate-decision enum + `rolled_back_to` in the schema; Red-gate marker `Test-first: true` wired tasks↔implement↔forge↔schema; FR-* delta keying across bridge/spec-merge/change-request/traceability; spec-merge idempotency + abort/orphan handling + drift-carrier inputs; verify-full Layers 1–4 consume the matrix by field + Layer-10 carrier section; sync-verify renumbered to **9 layers** incl. contract-drift + doc↔code; api-docs contract-first + AsyncAPI; monitoring/retrospective/release-readiness/extension/README de-NewRelic'd, `telemetry.dashboards` default `none`; structured interaction blocks + Gate templates in research/plan/revalidate/code-review/pre-impl-review/test-plan/release-readiness/forge; BUG-NNN journey field + per-edge `{id,priority,tests}` structure + JRN/STEP/EDGE test tags; ID-system home in `docs/schema.md §8`; runtime fluid-mode runnable-set section + `express` added to the pre-flight enum; `require_*` config keys documented).
- Forks resolved: **F-A = FR-*** keying · **F-B = producers** (test-run→tested, release/spec-merge→verified; verify-full stays read-only) · **F-C = FE↔contract↔BE** (DB leg dropped) · **F-D = 1.6.0**.
- **W5-A1** deterministic validator shipped (`scripts/validate-traceability.js`, self-test 11/11) and wired as verify-full Step 0.
- Verified deterministically: `pf_audit.py` shows no new broken links/anchors/dangling commands; all invariant greps pass.

**Track-2 Wave 1 — A-group gate redesign (the only `reduces` group): ✅ SHIPPED.** New executable/carrier assets: `scripts/lib-yaml.js` (shared zero-dep parser), `scripts/gate-risk.js` (deterministic risk classifier, self-test 10/10), `docs/templates/gate-review.md` (unified `F-NNN` gate surface). `validate-traceability.js` refactored onto the shared parser (self-test 16/16). Carriers: `gates[].reviewed_sha` + `gates[].risk` + the `F-` id in `schema.md §8`; `policy.md §9`. Wired into forge/code-review/pre-impl-review/verify-full. **Every `adds`-leaning item was made *executable*, not prose** (per the "callout-deep" guardrail): risk routing runs as a script; the derived-artifact gate reuses the validator.

**Track-2 Wave 2 — B/C/E tail: ✅ SHIPPED, executable-first.** Each `adds` item landed with a real carrier/command, not prose:
- **B1** `forge --ci` headless mode reading `docs/templates/gate-policy.yml` (new), gated on `gate-risk.js` + `validate-traceability.js --strict` exit codes; never auto-merges, `release_readiness`/`spec_merge` stay human.
- **B2** real `@axe-core/playwright` WCAG-AA floor code in the generated `.spec.ts` (per-JRN). **B5** real Playwright `[data-cmp]` + variant + `getComputedStyle` token-conformance assertions in the generated spec (Phase 8A, not verify-full). **B3** real `syft` SBOM + `osv-scanner` PR-diff SCA + SPDX license + `actions/attest-build-provenance` in release-readiness §5C-bis, with `osv-scanner` named in code-review's machine gate. **B4** real `oasdiff diff/breaking` in the contract-drift layer (sync-verify L8 + verify-full L9), gated on `contract_differ: oasdiff` config.
- **C1** orphan/undocumented-code WARNING enriched with commit SHA+author (`git log` + `task_log` reverse-index). **C2** install-time slopsquat package vetting (`npm view`/`pip index` + age/allowlist) at the implement checkpoint + security-check. **C3** distinct-approver rule in policy §5.2.
- **D1** plan + pre-impl-review now read the "Prior lessons that apply" section research already produces (extends the existing producer, not a new one). **D2** retrospective §5 harvests candidate lessons from implement digest / gate-review / drift reports. **E1** determinism lens in revalidate §4A + Contradictions/counterfactual in pre-impl-review §3 + tasks cross-validation. **E2** optional LLM-judge tier for subjective criteria only in verify-full Layer 3 (gated behind the now-real Red gate; verify-full stays read-only).
- New config: `contract_differ`, `a11y_gate`, `.product-forge/gate-policy.yml`. Honesty note: illustrative axe/token defaults in the generated-spec templates are marked ASSUMPTION (rebind to the project's design system).

**Nothing in Track-2 remains deferred.** Verified: both script self-tests green (16/16, 10/10), `pf_audit` shows no new broken links/anchors, all policy anchors resolve.

**Known latent item (pre-existing, out of this pass's scope):** `implement.md`/`tasks.md` write a per-phase summary under a *top-level* `implement:`/`tasks:` block in addition to `phases.<name>.status`; the schema models phase detail under `phases.<name>`. Harmonising the two is a small separate cleanup.

---

## Sources (Wave 5 additions)

- OpenSpec `validate` / `--strict` — [cli docs](https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/docs/cli.md), [thedocs.io](https://thedocs.io/openspec/cli/validate/)
- GitHub spec-kit `/analyze`, `/clarify`, `/checklist` — [analyze.md](https://raw.githubusercontent.com/github/spec-kit/main/templates/commands/analyze.md)
- EARS (Mavin) — [alistairmavin.com/ears](https://alistairmavin.com/ears/)
- CodeRabbit Atlas + incremental review — [atlas](https://www.coderabbit.ai/blog/introducing-atlas-the-first-ai-native-code-review-interface), [commands](https://docs.coderabbit.ai/guides/commands)
- Propel noise control — [propelcode.ai](https://www.propelcode.ai/blog/ai-code-review-false-positives-reducing-noise) · CodeAnt risk routing — [codeant.ai](https://www.codeant.ai/blogs/ai-based-pr-decision-making-code-review)
- gh-aw safe-outputs — [github.github.com/gh-aw](https://github.github.com/gh-aw/) · Cordum approvals — [cordum.io](https://cordum.io/blog/approvals-for-autonomous-workflows)
- Playwright a11y + DOM assertions — [accessibility-testing](https://playwright.dev/docs/accessibility-testing) · axe-core/playwright
- OSV-Scanner + build provenance — [osv-scanner action](https://github.com/marketplace/actions/osv-scanner), [attest-build-provenance](https://github.com/actions/attest-build-provenance)
- oasdiff — [API schema drift tools 2026](https://dev.to/flarecanary/api-schema-drift-detection-tools-compared-2026) · Fiberplane drift linter — [fiberplane.com](https://fiberplane.com/blog/drift-documentation-linter)
- Slopsquatting — [safedep.io](https://safedep.io/ai-native-sdlc-supply-chain-threat-model), [aikido.dev](https://aikido.dev/blog/slopsquatting) · Kiro steering — [kiro.dev/docs/steering](https://kiro.dev/docs/steering)
- Fowler/Böckeler SDD-3-tools — [martinfowler.com](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)
