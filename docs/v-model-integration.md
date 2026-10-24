# V-Model Integration

> **Status:** normative
> **Applies when:** `feature_mode: v-model`
> **External dependency:** [leocamello/spec-kit-v-model](https://github.com/leocamello/spec-kit-v-model) v0.5.0 or higher
> **Companions:** [policy.md §4](./policy.md#4-feature-modes-e1), [runtime.md](./runtime.md)

Product Forge delegates the formal V-Model artifact progression to the external
**V-Model Extension Pack** and orchestrates around it. This document describes how
the two plugins cooperate.

---

## 1. Why V-Model mode

Pick `feature_mode: v-model` when any of these applies:

- Regulated domain: medical device (IEC 62304), automotive (ISO 26262),
  avionics (DO-178C), functional safety (ISO 14971 hazard analysis).
- Audit-grade traceability required: every requirement must map to a
  design element, an implementation, and a test case.
- Formal test planning at every level (system / integration / unit) with
  named techniques per ISO 29119.

Otherwise prefer `feature_mode: standard` — the V-Model's per-feature overhead
(documentation, review gates, compliance artifacts) is wasted on unregulated work.

---

## 2. Installation

The V-Model Extension Pack is an **optional dependency**, not bundled; projects
that need it install it explicitly:

```bash
specify extension add v-model \
  --from https://github.com/leocamello/spec-kit-v-model/archive/refs/tags/v0.5.0.zip
```

Verify the install: `speckit.v-model.requirements` is in your slash-command list.

### Version pinning

Compatibility is tracked in the `optional_extensions` block of Product Forge's
`extension.yml`; the supported V-Model range is `>=0.5.0`. A breaking V-Model
change is absorbed in a Product Forge minor release (range updated, new commands
wired into `forge.md`).

---

## 3. Detection and fallback

At the start of a v-model feature, the orchestrator probes for the command
`speckit.v-model.requirements`.

| Detection result | Behaviour |
|------------------|-----------|
| Installed, version matches | Proceed with v-model phase map (§4 below). |
| Installed, version below required | Abort with upgrade instructions; stay in v-model (never fall back to standard) — version mismatches cause silent artifact incompatibility. |
| Not installed | Abort with the install command; stay in v-model (never fall back to standard) — regulated work must not silently degrade to unregulated. |
| User toggles `feature_mode: v-model` on a feature created with `standard` | Warn that a mid-feature mode change is unusual for formal work; require explicit confirmation; re-run the backfill of missing V-Model artifacts from existing product-spec / plan if any. |

### Domain configuration

The V-Model plugin accepts `v-model-config.yml` with domain selection:

```yaml
# v-model-config.yml — placed at project root alongside .product-forge/config.yml
domain: "iec_62304"   # iec_62304 | iso_26262 | do_178c | generic
```

Product Forge reads this file (if present) and passes the domain to every
delegated V-Model command so its templates use the right regulatory vocabulary.

---

## 4. Phase map in v-model mode

The v-model lifecycle runs **every Product Forge phase `standard` runs** and
inserts the formal V-Model progression around them — nothing is replaced.
Per-mode applicability is [`schema/phase-map.yml`](./schema/phase-map.yml); this
section only places the V-phases.

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

| V | Command | Output and rules |
|---|---------|------------------|
| V1 | `speckit.v-model.requirements` | After Phase 4. Input: `spec.md` from the bridge, the approved `product-spec/`, research outputs, Phase 0 hypotheses. Output: `requirements.md` with `REQ-NNN` traceable IDs — formalises the product spec, does not replace it. Gate: user approval; drift from research captured in `gates[]`. |
| V2 | `speckit.v-model.hazard-analysis` | Optional; triggered when the domain is `iec_62304` or `iso_26262`, or the user enables it. FMEA with `HAZ-NNN` IDs per ISO 14971 / ISO 26262. Hazards classified "unacceptable" block progression until mitigations are wired back into the requirements. |
| V3 | `speckit.v-model.acceptance` | Runs AFTER requirements, before any design (test-first at the system boundary). Three-tier ATP (`ATP-NNN`) with 100% requirement coverage validation + BDD scenarios. |
| V4 / V5 | `speckit.v-model.system-design` / `speckit.v-model.system-test` | IEEE 1016 system components (`SYS-NNN`, four design views) paired with an ISO 29119 system test plan (`STP-NNN`, named techniques per component). The pair is approved together; peer review recommended. |
| V6 / V7 | `speckit.v-model.architecture-design` / `speckit.v-model.integration-test` | IEEE 42010 / Kruchten 4+1 architecture modules (`ARCH-NNN`) paired with ISO 29119-4 integration tests (`ITP-NNN`, four named techniques per module). |
| V8 / V9 | `speckit.v-model.module-design` / `speckit.v-model.unit-test` | Low-level designs (`MOD-NNN`, DO-178C / ISO 26262) paired with white-box unit tests (`UTP-NNN`, five named techniques per module). The approved V4 / V6 / V8 designs feed Phase 5 plan; V9 output feeds Phase 5B tasks — every `MOD-NNN` becomes ≥1 task, every `UTP-NNN` ≥1 unit test (test-plan `TC-UNIT-NNN`, run in Phase 8B). |
| V10 | `speckit.v-model.trace` | Checkpoint, runnable anytime. Builds the bidirectional matrix `REQ → SYS → ARCH → MOD → Code` plus the test chain (`REQ → ATP`, `SYS → STP`, `ARCH → ITP`, `MOD → UTP`). Run automatically after V4-V5, V6-V7, V8-V9, and after any change request. |
| V11 | `speckit.v-model.peer-review` | Optional, on any artifact. Stateless linter against the relevant standard (IEEE 29148 requirements, IEEE 1016 design, ISO 29119 tests); emits `PRF-{ARTIFACT}-NNN` findings. Run for any artifact that goes through external audit. |
| V12 | `speckit.v-model.test-results` | After Phase 8B. Ingests JUnit XML + optional Cobertura XML (from Phase 8B or CI) into the traceability matrix as PASS / FAIL / coverage. |
| V13 | `speckit.v-model.audit-report` | Before Phase 9. Release-audit report cross-referenced against waivers and compliance requirements; release-readiness approves only once it is `COMPLIANT` or has signed waivers. |

---

## 5. Cross-cutting integrations

### Impact analysis on change request

For a v-model feature, `/speckit.product-forge.change-request` delegates the
downward / upward impact walk to `speckit.v-model.impact-analysis`, which knows the
exact artifact dependency graph.

### Sync-verify + V-Model trace

`/speckit.product-forge.sync-verify` in v-model mode adds a V-Model
trace-completeness check on top of its 10 layers. Any orphan requirement or
design element without a test pair is flagged CRITICAL.

### Peer-review integration

Any phase gate in v-model mode CAN request peer-review before approval: the
orchestrator offers *"Run peer-review on this artifact?"*, delegates to
`speckit.v-model.peer-review`, and attaches findings to the gate entry.

---

## 6. Status file changes

In v-model mode, `.forge-status.yml` gains one `v_model` block, written by the
V-Model plugin's commands and read by the Product Forge orchestrator (gate
decisions, verify-full):

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

---

## 7. Orchestrator contract in v-model mode

- **Respect level order**: V4 (system-design) starts only after V1
  (requirements) is approved; never bypass a level pair.
- **Trace at every checkpoint**: V10 runs between each level pair, not
  only at the end.
- **No silent fallbacks**: missing or outdated plugin → abort (§3).
- **Peer-review is opt-in at the gate, not configurable away**: even
  solo-mode users see the peer-review offer on formal artifacts.
- **Audit is a gate, not a suggestion**: V13 audit-report must return
  `COMPLIANT` (or waivers) before Phase 9.

---

## 8. Limits and non-goals

- Product Forge does not duplicate V-Model functionality; without the plugin,
  v-model mode is unavailable.
- The V-Model plugin owns the artifact formats and the regulatory vocabulary;
  Product Forge uses them as delivered.
- Cross-feature concerns (portfolio view, flag cleanup, i18n harvest) work
  identically in v-model mode.
- Lite mode is incompatible with v-model (lite omits too many levels). Requesting
  v-model from a lite feature is rejected; start a new feature in v-model mode.
