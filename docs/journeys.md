# Product Forge — Structured Journeys (E2E source of truth)

> **Status:** normative for v1.6.0+
> **Consumers:** `commands/product-spec.md` (authors journeys),
> `commands/test-plan.md` / `commands/test-run.md` (generate + run E2E),
> `commands/verify-full.md` (coverage), the live
> [traceability matrix](./templates/traceability-matrix.md).
> **Template:** [templates/journey-spec.md](./templates/journey-spec.md).

User journeys in Product Forge are **first-class structured artifacts**, not
free-form prose. A journey fully describes how a feature behaves — stages,
branches, and edge cases — in a shape that **deterministically drives end-to-end
tests**. The committed E2E runner is **`playwright-cli`**; the schema is
runner-agnostic so other MCP/CLI runners can consume it, but Playwright is the
default implementation.

This replaces the old free-form `user-journey.md`.

---

## 1. Layout

```
product-spec/journeys/
├── journeys.yml            # machine-readable index of ALL journeys (source of truth)
├── JRN-001-{slug}.md       # human-readable detail, one file per journey
├── JRN-002-{slug}.md
└── ...
```

`journeys.yml` is authoritative for test generation; the per-journey markdown
files are the human-readable narrative. They must stay in sync (sync-verify checks).

---

## 2. ID system

| ID | Meaning |
|----|---------|
| `JRN-NNN` | A complete user journey (one goal, one primary actor). |
| `STEP-NNN` | An ordered step within a journey (an action + expected result). |
| `EDGE-NNN` | An alternate / error / boundary case branching off a step or journey. |

IDs are stable and referenced from `traceability.yml`, tests (`TC-E2E-*`), and the
design-system component map (`CMP-*`). Every user story (`US-NNN`) maps to ≥1
`JRN-NNN`; every `JRN/STEP/EDGE` maps to ≥1 `TC-E2E`/`TC-SMK` once testing runs.

---

## 3. `journeys.yml` schema

```yaml
schema_version: 1
feature: "{feature-slug}"
journeys:
  - id: "JRN-001"
    title: "Save notification preferences"
    actor: "signed-in user"
    stories: ["US-001"]              # user stories this journey realizes
    entry: "Settings → Notifications"
    success: "Preferences persisted and reflected on reload"
    preconditions:
      - "User is authenticated"
      - "Feature flag notif_prefs is on"
    steps:
      - id: "STEP-001"
        action: "Open the Notifications settings screen"
        ui: "CMP-SettingsNav"        # CMP-* id; component-map.yml resolves it to design-system/manifest.yml (which owns the selector)
        expect: "Notification toggles render with current values"
        contracts: ["API-getPrefs"]  # FE↔BE contract (Theme F)
      - id: "STEP-002"
        action: "Toggle 'Product updates' off and click Save"
        ui: "CMP-Toggle, CMP-Button"
        expect: "Success toast; toggle stays off after reload"
        contracts: ["API-savePrefs"]
        events: ["EVT-prefs_saved"]  # telemetry (Theme D)
    edges:
      - id: "EDGE-001"
        of: "STEP-002"
        case: "Save fails (network/500)"
        given: "API-savePrefs returns 500"
        when: "User clicks Save"
        then: "Error toast shown, toggle reverts, no telemetry event"
        priority: "P1"
    e2e:
      runner: "playwright-cli"        # default; runner-agnostic schema
      smoke: true                     # include in smoke suite
```

Each step uses **action / expect**; each edge uses **GIVEN / WHEN / THEN** so the
happy path, alternate flows, and error cases are all explicit — nothing implicit.

---

## 4. Journey → Playwright-cli pipeline

1. **Author** (Phase 2, `product-spec`): write `journeys.yml` + per-journey md.
2. **Generate** (Phase 8A, `test-plan`): emit one Playwright `.spec.ts` per
   journey — `STEP.action` → Playwright actions, `STEP.expect` / `EDGE.then` →
   assertions, selectors resolved via `mockups/component-map.yml` `CMP-*` ids
   against `design-system/manifest.yml` (the manifest owns the selector) (Theme E).
   Smoke journeys (`smoke: true`) also seed the `TC-SMK-*` suite.
3. **Run** (Phase 8B, `test-run`): execute via `playwright-cli` in
   Smoke → E2E order; map any failure back to its `JRN/STEP/EDGE` ID in
   `bugs/BUG-NNN.md`.
4. **Verify** (Phase 7, `verify-full`): fail if any Must-Have journey or P0/P1
   edge case lacks an E2E test, using `traceability.yml`.

---

## 5. Authoring rules

1. **One goal per journey.** If a flow has two distinct goals, make two journeys.
2. **Every branch is an `EDGE`.** Don't bury error handling in prose; give it an ID,
   a priority (P0–P3), and GIVEN/WHEN/THEN.
3. **Reference components, not pixels.** Steps point at design-system components
   (`CMP-*`) so tests get stable selectors and the UI maps to real code (Theme E).
4. **Reference contracts.** Steps that hit the backend list their `API-*` contract
   (Theme F) so FE↔BE traceability is maintained.
5. **Keep `journeys.yml` authoritative.** The markdown narrative must not introduce
   steps that aren't in the YAML.
6. **Actor and preconditions are journey-scoped.** They are declared once on the
   journey; every `STEP`/`EDGE` inherits them and must not re-declare its own actor.
