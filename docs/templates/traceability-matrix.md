# Traceability Matrix Template

> **Purpose:** one **live** artifact that links every requirement to its story,
> journey, task, code, test, and telemetry event — maintained incrementally as the
> feature progresses, and *consumed* (not re-derived) by `verify-full`.
>
> **Path:** `<FEATURE_DIR>/traceability.yml`
>
> **Owners (write) — maintained today:** only `tasks` (seeds rows + the `tasks`
> column, sets `status: planned`) and `implement` (fills `code` + advances
> `status` to `implemented`) write this file.
>
> **Should-write (columns stay null until that producer is wired):** `product-spec`
> → `journeys`; `bridge` → `contracts` (`FR-*`/`API-*`); `test-plan`/`test-run` →
> `tests`; `tracking-plan` → `events`. Until each producer writes its column, that
> column is `null` (a gap `verify-full` flags).
>
> **Readers:** `verify-full`, `code-review`, `sync-verify`, `retrospective`,
> `spec-merge` (which also advances `status` to `verified`).

This replaces re-deriving traceability from scratch on every `verify-full` run.
Each phase updates the rows it owns; verification checks the matrix for gaps.

---

## ID system (first-class cross-links)

> The canonical home for the ID system is [`docs/schema.md` §8](../schema.md#8-cross-artifact-id-system).
> This table mirrors it for convenience next to the matrix; keep the two in sync.

| Prefix | Artifact | Source phase |
|--------|----------|--------------|
| `REQ-` | Canonical requirement | V-Model pack / `backfill` / canonical `specs/` |
| `US-`  | User story | product-spec |
| `JRN-` | User journey (`STEP-`, `EDGE-` nested) | product-spec (journeys) |
| `FR-`  | Functional requirement | bridge / plan |
| `CMP-` | Design-system component | design-system-harvest / component-map |
| `API-` | Endpoint / event contract | bridge / plan (OpenAPI + AsyncAPI) |
| `TASK-`| Implementation task | tasks |
| `REV-` | Code-review finding | code-review |
| `TC-`  | Test case (`TC-SMK/E2E/API/UNIT/INT/REG`) | test-plan |
| `EVT-` | Telemetry event | tracking-plan |

IDs are stable across artifacts. Every downstream artifact references upstream IDs
rather than restating content (de-duplication, Theme C).

In the standard forward flow, delta specs / `spec-merge` key on `FR-*` (minted by
`bridge`); `REQ-*` is the canonical id only for the V-Model pack / `backfill`
reverse-engineering path. On a forward-flow row, `req` may therefore be `null`.

---

## File shape

```yaml
schema_version: 1
feature: "{feature-slug}"
last_updated: "{ISO-8601}"

# One row per requirement-level unit of behavior. Fields are filled in as the
# feature moves through phases; unknown links stay null (a gap verify-full flags).
rows:
  - req: "REQ-001"
    story: "US-001"
    journeys: ["JRN-001"]            # may map to several
    frs: ["FR-001", "FR-002"]
    must_have: true
    components: ["CMP-Button", "CMP-Modal"]   # FE surfaces (Theme E)
    contracts: ["API-getPrefs", "API-savePrefs"]  # FE↔BE (Theme F)
    tasks: ["TASK-012", "TASK-013"]
    code:                            # filled by implement
      - "frontend:apps/web/src/prefs/PrefsModal.tsx"
      - "backend:apps/api/src/prefs/handler.ts"
    tests: ["TC-E2E-003", "TC-UNIT-021"]   # filled by test-plan
    events: ["EVT-prefs_saved"]      # telemetry (Theme D)
    status: "implemented"            # planned (tasks) | implemented (implement)
                                     #   | tested (test-run) | verified
                                     #   (release-readiness / spec-merge)

# Journey detail mirrors product-spec/journeys/journeys.yml for test mapping.
journeys:
  - id: "JRN-001"
    title: "Save notification preferences"
    steps: ["STEP-001", "STEP-002"]
    edges:                           # error / alternate flows, per-edge
      - {id: EDGE-001, priority: P1, tests: [TC-E2E-004]}
    tests: ["TC-E2E-003"]           # journey-level E2E; each step should map to ≥1 test
```

---

## What verify-full checks against the matrix

- Every `must_have: true` row has ≥1 `task`, ≥1 `code` path, and (when testing
  ran) ≥1 `test`.
- Every `JRN`/`STEP`/`EDGE` maps to ≥1 `TC-E2E`/`TC-SMK` (Theme H).
- Every `component` used by a row exists in `design-system/manifest.yml` (Theme E).
- Every `contract` is implemented on both FE and BE (Theme F).
- No orphan tasks (a `TASK-` with no `req`) and no undocumented code (a `code`
  path with no row) — the doc↔code reconciliation (Theme G).

Gaps become `verify-report.md` findings; the matrix is the single source the
report is computed from.
