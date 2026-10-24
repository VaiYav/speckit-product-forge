# V-Model Integration

> **Status:** normative
> **Applies when:** `feature_mode: v-model`
> **External dependency:** [leocamello/spec-kit-v-model](https://github.com/leocamello/spec-kit-v-model) v0.5.0 or higher
> **Companions:** [policy.md §4](./policy.md#4-feature-modes-e1), [runtime.md](./runtime.md)

Product Forge does not implement the V-Model itself. Instead, it
delegates the formal V-Model artifact progression to the external
**V-Model Extension Pack** and orchestrates around it. This document
describes how the two plugins cooperate.

---

## 1. Why V-Model mode

Pick `feature_mode: v-model` when any of these applies:

- Regulated domain: medical device (IEC 62304), automotive (ISO 26262),
  avionics (DO-178C), functional safety (ISO 14971 hazard analysis).
- Audit-grade traceability required: every requirement must map to a
  design element, an implementation, and a test case.
- Formal test planning at every level (system / integration / unit) with
  named techniques per ISO 29119.

If you do not need these, prefer `feature_mode: standard` — the
V-Model adds significant per-feature overhead (documentation, review
gates, compliance artifacts) that is wasted on unregulated work.

---

## 2. Installation

The V-Model Extension Pack is an **optional dependency**. Product Forge
does not bundle it; projects that need it install it explicitly:

```bash
specify extension add v-model \
  --from https://github.com/leocamello/spec-kit-v-model/archive/refs/tags/v0.5.0.zip
```

To verify the install, check that `speckit.v-model.requirements` is
available in your slash-command list.

### Version pinning

Product Forge tracks compatibility via the `optional_extensions` block
in its own `extension.yml`. The currently supported V-Model version
range is `>=0.5.0`. If the V-Model plugin publishes a breaking change,
Product Forge's range is updated in a minor release and the new
expected commands are wired into `forge.md`.

---

## 3. Detection and fallback

At the start of a v-model feature, the orchestrator detects whether the
plugin is installed by probing for the command
`speckit.v-model.requirements`.

| Detection result | Behaviour |
|------------------|-----------|
| Installed, version matches | Proceed with v-model phase map (§4 below). |
| Installed, version below required | Abort with upgrade instructions. Do NOT fall back to standard — version mismatches cause silent artifact incompatibility. |
| Not installed | Abort with install command. Do NOT fall back to standard — regulated work must not silently degrade to unregulated. |
| User toggles `feature_mode: v-model` on a feature created with `standard` | Warn that a mid-feature mode change is unusual for formal work; require explicit confirmation; re-run the backfill of missing V-Model artifacts from existing product-spec / plan if any. |

### Domain configuration

The V-Model plugin accepts `v-model-config.yml` with domain selection:

```yaml
# v-model-config.yml — placed at project root alongside .product-forge/config.yml
domain: "iec_62304"   # iec_62304 | iso_26262 | do_178c | generic
```

Product Forge reads this file (if present) and passes the domain to
every delegated V-Model command so their templates pick the right
regulatory vocabulary.

---

## 4. Phase map in v-model mode

The v-model lifecycle runs **every Product Forge phase it runs in `standard`**
and inserts the formal V-Model progression around them — nothing is replaced.
Per-mode applicability comes from
[`schema/phase-map.yml`](./schema/phase-map.yml), the single source; this section
only places the V-phases.

- **Phases 0–4 run as in standard.** Phase 2 product-spec stays the product
  source (journeys, wireframes, acceptance criteria); Phase 3 revalidates it;
  Phase 4 bridge writes `spec.md` and, because `feature_mode: v-model` forces
  `speckit_mode: v-model`, hands off to V1.
- **V1–V11 run between bridge and Phase 5 plan.** V1 derives `REQ-NNN` from
  `spec.md` + `product-spec/`; the level pairs follow with V10 trace checkpoints.
- **Phase 5 plan and 5B tasks build on the approved V-Model design**: the plan
  must stay consistent with `SYS` / `ARCH` / `MOD`, and tasks derive from
  `MOD-NNN`.
- **V12 runs after Phase 8B; V13 gates Phase 9.**

```
PRODUCT FORGE           ║  V-MODEL EXTENSION PACK       ║  PHASE ID
════════════════════════╬═══════════════════════════════╬══════════
Phase 0 problem-discov. ║                               ║  0   (opt)
Phase 1 research        ║                               ║  1
Phase 2 product-spec    ║                               ║  2
Phase 2H design-system  ║                               ║  2H  (opt)
Phase 3 revalidation    ║                               ║  3
Phase 4 bridge          ║                               ║  4   (writes spec.md, forces speckit_mode)
                        ║  v-model.requirements         ║  V1
                        ║  v-model.hazard-analysis (opt║  V2  (safety-critical only)
                        ║  v-model.acceptance           ║  V3
                        ║  v-model.system-design        ║  V4
                        ║  v-model.system-test          ║  V5
                        ║  v-model.architecture-design  ║  V6
                        ║  v-model.integration-test     ║  V7
                        ║  v-model.module-design        ║  V8
                        ║  v-model.unit-test            ║  V9
                        ║  v-model.trace (checkpoint)   ║  V10
                        ║  v-model.peer-review (opt)    ║  V11 (cross-cutting)
Phase 4.5 i18n-harvest  ║                               ║  4.5 (opt, cond)
Phase 5 plan            ║                               ║  5   (consistent with SYS/ARCH/MOD)
Phase 5B tasks          ║                               ║  5B  (derives from V8 MOD-NNN)
Phase 5.5 migration-plan║                               ║  5.5 (opt, cond)
Phase 5C pre-impl-review║                               ║  5C  (opt)
Phase 6 implement       ║                               ║  6
Phase 6B code-review    ║                               ║  6B  (opt)
Phase 7 verify-full     ║                               ║  7   (cross-checks against V10 matrix)
Phase 8A test-plan      ║                               ║  8A  (opt, supplements V5/V7/V9)
Phase 8B test-run       ║                               ║  8B  (opt)
                        ║  v-model.test-results         ║  V12 (ingests JUnit/Cobertura)
                        ║  v-model.audit-report         ║  V13 (pre-ship compliance gate)
Phase 9 release-readines║                               ║  9   (opt)
```

### Phase detail

#### V1 — Requirements (after Phase 4 bridge)

- Command: `speckit.v-model.requirements`
- Input: `spec.md` from the bridge, the approved `product-spec/`, research
  outputs, hypotheses from Phase 0. V1 formalises the product spec into
  traceable requirements; it does not replace it.
- Output: `requirements.md` with `REQ-NNN` traceable IDs.
- Gate: user approval; drift from research captured in gates[].

#### V2 — Hazard analysis (optional, conditional)

- Command: `speckit.v-model.hazard-analysis`
- Trigger: domain is `iec_62304`, `iso_26262`, or user explicitly enables.
- Output: FMEA with `HAZ-NNN` IDs per ISO 14971 / ISO 26262.
- The gate is more formal: hazards classified as "unacceptable" block
  progression until mitigations are wired back into the requirements.

#### V3 — Acceptance test plan

- Command: `speckit.v-model.acceptance`
- Runs AFTER requirements. Forces test-first thinking at the system
  boundary before any design begins.
- Output: three-tier ATP (`ATP-NNN`) with 100% requirement coverage
  validation + BDD scenarios.

#### V4 / V5 — System design + test (paired)

- `speckit.v-model.system-design` → IEEE 1016-compliant system components
  (`SYS-NNN`) with four design views.
- `speckit.v-model.system-test` → ISO 29119 system test plan
  (`STP-NNN`) with named techniques per component.
- Gate: pair must be approved together. Peer-review recommended.

#### V6 / V7 — Architecture design + integration test (paired)

- `speckit.v-model.architecture-design` → IEEE 42010 / Kruchten 4+1
  architecture modules (`ARCH-NNN`).
- `speckit.v-model.integration-test` → ISO 29119-4 integration tests
  (`ITP-NNN`) with four named techniques per module.

#### V8 / V9 — Module design + unit test (paired)

- `speckit.v-model.module-design` → low-level designs (`MOD-NNN`)
  compliant with DO-178C / ISO 26262.
- `speckit.v-model.unit-test` → white-box unit tests (`UTP-NNN`) with
  five named techniques per module.
- The approved V4 / V6 / V8 designs are inputs for our Phase 5 plan, and the
  output of V9 is the input for our Phase 5B tasks: every `MOD-NNN`
  becomes one or more tasks, every `UTP-NNN` becomes one or more unit
  tests in Phase 8B / test-plan §5E.

#### V10 — Trace (checkpoint, runnable anytime)

- Command: `speckit.v-model.trace`
- Builds / updates the bidirectional traceability matrix
  (`REQ → SYS → ARCH → MOD → Code`) plus the test chain
  (`REQ → ATP`, `SYS → STP`, `ARCH → ITP`, `MOD → UTP`).
- Run automatically by the orchestrator at each level-pair boundary
  (after V4-V5, V6-V7, V8-V9). Re-run after any change request.

#### V11 — Peer review (optional, runnable on any artifact)

- Command: `speckit.v-model.peer-review`
- Stateless linter against the relevant standard (IEEE 29148 for
  requirements, IEEE 1016 for design, ISO 29119 for tests).
- Emits `PRF-{ARTIFACT}-NNN` findings. Run for any artifact that goes
  through external audit.

#### V12 — Test results (after Phase 8B)

- Command: `speckit.v-model.test-results`
- Ingests JUnit XML + optional Cobertura XML from Phase 8B (or from CI)
  and populates the traceability matrix with PASS / FAIL / coverage.

#### V13 — Audit report (before Phase 9)

- Command: `speckit.v-model.audit-report`
- Monolithic release-audit-report cross-referenced against waivers and
  compliance requirements. Gates Phase 9 — release-readiness cannot
  approve until the audit report is `COMPLIANT` or has signed waivers.

---

## 5. Cross-cutting integrations

### Impact analysis on change request

When `/speckit.product-forge.change-request` runs for a v-model
feature, it delegates the downward / upward impact walk to
`speckit.v-model.impact-analysis`. The formal V-Model knows the exact
artifact dependency graph and is strictly more precise than the
generic product-forge change tracker.

### Sync-verify + V-Model trace

`/speckit.product-forge.sync-verify` in v-model mode adds V-Model
trace completeness as an 8th check layer. Any orphan requirement or
design element without a test pair is flagged CRITICAL.

### Peer-review integration

Any phase gate in v-model mode CAN request peer-review before
approval. The orchestrator offers: *"Run peer-review on this
artifact?"* — delegates to `speckit.v-model.peer-review`, attaches
findings to the gate entry.

---

## 6. Status file changes

In v-model mode, `.forge-status.yml` gains one v-model-specific block
populated by the delegated commands (our plugin only reads it):

```yaml
v_model:
  domain: "iec_62304"                  # copied from v-model-config.yml
  version: "0.5.0"                     # detected extension version
  artifacts:
    REQ: 42                            # count of REQ-NNN records
    HAZ: 7
    SYS: 12
    ARCH: 28
    MOD: 85
    ATP: 42                            # one ATP per REQ (100% coverage)
    STP: 12                            # one STP per SYS
    ITP: 28                            # one ITP per ARCH
    UTP: 85                            # one UTP per MOD
    PRF: 14                            # peer-review findings, open
  trace:
    last_rebuild: "2026-04-24T10:15:00Z"
    orphan_count: 0                    # gates: zero before proceeding
    coverage_pct: 100
  audit:
    last_report: "audit-reports/release-candidate-1.md"
    verdict: "COMPLIANT"
    waivers_open: 0
```

Writers: the V-Model plugin's commands. Reader: Product Forge
orchestrator (for gate decisions and verify-full).

---

## 7. Orchestrator contract in v-model mode

- **Never bypass** a level-pair: V4 (system-design) cannot start before
  V1 (requirements) is approved.
- **Trace at every checkpoint**: V10 runs between each level pair, not
  only at the end.
- **No silent fallbacks**: missing plugin → abort with install instruction,
  not degradation to standard mode.
- **Peer-review is opt-in at the gate, not configurable away**: even
  solo-mode users see the peer-review offer on formal artifacts.
- **Audit is a gate, not a suggestion**: V13 audit-report must return
  `COMPLIANT` (or waivers) before Phase 9.

---

## 8. Limits and non-goals

- Product Forge does not duplicate V-Model functionality. If the plugin
  is absent, v-model mode is unavailable — full stop.
- The V-Model plugin owns the artifact formats and the regulatory
  vocabulary. Product Forge should not second-guess or rewrite them.
- Cross-feature concerns (portfolio view, flag cleanup, i18n harvest)
  are agnostic to mode — they work identically in v-model mode.
- Lite mode is incompatible with v-model (lite omits too many levels).
  Requesting v-model from a lite feature is rejected; the user must
  start a new feature in v-model mode.
