# Traceability Matrix Template

> **Purpose:** one **live** artifact that links every requirement to its story,
> journey, task, code, test, and telemetry event — maintained incrementally as the
> feature progresses, and *consumed* (not re-derived) by `verify-full`.
>
> **Path:** `<FEATURE_DIR>/traceability.yml`
> **Owners (write):** `tasks` (seeds rows), `implement` (fills code + test paths),
> `bridge`/`plan` (contracts), `product-spec` (journeys), `test-plan`/`test-run`
> (tests). **Readers:** `verify-full`, `code-review`, `sync-verify`, `retrospective`.

This replaces re-deriving traceability from scratch on every `verify-full` run.
Each phase updates the rows it owns; verification checks the matrix for gaps.

---

## ID system (first-class cross-links)

| Prefix | Artifact | Source phase |
|--------|----------|--------------|
| `REQ-` | Canonical requirement | bridge / canonical `specs/` |
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
    status: "implemented"            # planned | implemented | tested | verified

# Journey detail mirrors product-spec/journeys/journeys.yml for test mapping.
journeys:
  - id: "JRN-001"
    title: "Save notification preferences"
    steps: ["STEP-001", "STEP-002"]
    edges: ["EDGE-001"]              # error / alternate flows
    tests: ["TC-E2E-003"]           # each step/edge should map to ≥1 test
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
