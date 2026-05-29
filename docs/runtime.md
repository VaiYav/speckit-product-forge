# Product Forge — Runtime

> **Status:** normative for v1.5.0+
> **Consumers:** `commands/forge.md` and every sub-skill that mutates
> `.forge-status.yml`.
> **Companions:** [policy.md](./policy.md), [schema.md](./schema.md).

This document describes the orchestration runtime — how the forge skill loads
config, resumes state, transitions between phases, writes to status files
safely, and runs sync-verify.

---

## 1. Step 0 — Load Config

Build the effective config by deep-merging FOUR file/document layers
(lowest → highest precedence; rightmost wins), then applying environment
overrides last:

1. **Shipped defaults** — `config-template.yml` from the installed extension.
   ALWAYS-LOADED BASE (supplies every key's default). Locate via
   `specify extension path product-forge`.
2. **Global** — `~/.product-forge/config.yml` (user-level, cross-project).
   Skip silently if absent. If `$XDG_CONFIG_HOME` is set, also check
   `$XDG_CONFIG_HOME/product-forge/config.yml`.
3. **Project** — `<project-root>/.product-forge/config.yml`. Skip silently if
   absent.
4. **Per-feature** — `config_override` on `<FEATURE_DIR>/.forge-status.yml`
   (applied once a feature is selected).

Apply the **deep-merge rule** (below) between every adjacent pair. Then apply
`PRODUCT_FORGE_*` env vars over the merged result.

This mirrors git's `system → global → local` precedence, with `config_override`
and env as two Product-Forge-specific top layers. Layers 1, 3, 4, and 5 already
exist today; the **global layer (2) is the only structural addition**. The
global file is **hand-authored** (like a personal global git config) — the
runtime **reads** it but **NEVER prompt-and-saves** to it.

### 1.1 Deep-merge rule

Used between every adjacent pair of layers:

- **Maps merge recursively, key by key.** A higher layer that sets only
  `telemetry.dashboards` leaves the lower layer's `telemetry.product_analytics`
  intact.
- **Scalars and lists REPLACE wholesale.** A higher layer's list value fully
  replaces the lower one — e.g. a project `default_competitors` **replaces**
  (does not append to) a global list. By design.
- **Nested maps that MUST be deep-merged** (not clobbered): `codebase`,
  `telemetry`, `design_system`, and `sync_verify` (including `drift_budget`,
  `auto_resolve`, `contract_regen`). Example: a global config may set
  `sync_verify.contract_differ: oasdiff` (a machine/personal trait) while the
  project sets `sync_verify.contract_regen.cmd` (intrinsically repo-specific) —
  both must survive in the merged `sync_verify`.
- **Env scope.** `PRODUCT_FORGE_*` addresses **top-level scalar keys only**
  (e.g. `PRODUCT_FORGE_CODEBASE_PATH`). Nested-key env addressing is undefined
  and out of scope.

### 1.2 Extract

Extract (from the MERGED result):

- `project_name`
- `project_tech_stack`
- `project_domain`
- `codebase_path` (single-root projects, legacy)
- `codebase.root` / `codebase.paths` / `codebase.workspace_type` (monorepo mode, v1.5+)
- `features_dir`
- `storage_strategy` (default `"flat"`; see [§12](#12-path-resolution-contract))
- `default_speckit_mode`
- `default_feature_mode` (default `"standard"`)
- `flow_mode` (`gated` | `fluid`, default `gated`)
- `default_track_hint`
- `progressive_verify_interval`
- `auto_sync_between_phases`
- `require_skip_reason`
- `release_readiness` (`required` | `optional` | `skip`)
- `e2e_runner`
- `a11y_gate`
- `telemetry.*`
- `sync_verify.*`
- `output_language`
- `max_tokens_per_doc`

**Missing identity:** if required project identity (name, tech stack, domain,
codebase path) is still unset after merging, prompt the user and SAVE the
answers to the **PROJECT** config (`<project-root>/.product-forge/config.yml`) —
**never** to the global file.

---

## 2. State Lock Protocol (A2)

Every writer to `.forge-status.yml` — the orchestrator and every sub-skill —
MUST follow this protocol to prevent concurrent-writer corruption.

### 2.1 Lock file

Location: `<FEATURE_DIR>/.forge-status.yml.lock` (next to the status file).

Format (JSON, single line):

```json
{"pid": 12345, "session_id": "claude-session-abc", "acquired_at": "2026-04-19T10:00:00Z", "ttl_seconds": 1800}
```

- `pid` — operating system process id of the writer.
- `session_id` — stable identifier for the orchestration session
  (e.g. an agent session id). Preferred over `pid` for correctness when
  processes are short-lived.
- `acquired_at` — ISO-8601 UTC timestamp of lock acquisition.
- `ttl_seconds` — self-reported TTL. Default `1800` (30 minutes).

### 2.2 Acquisition

```
acquire(feature_dir):
  lock_path = feature_dir + "/.forge-status.yml.lock"
  if file exists at lock_path:
    payload = read JSON
    age_seconds = now - parse(payload.acquired_at)
    if age_seconds < payload.ttl_seconds:
      ABORT with "lock held by {session_id}, retry after {ttl remaining}s"
    else:
      WARN  "stale lock ({age_seconds}s old) — taking over"
      delete lock_path
  write lock_path atomically with current payload   # use O_EXCL equivalent
  register cleanup handler that deletes lock_path on exit
```

### 2.3 Writes

All writes to `.forge-status.yml` use the temp-file + rename pattern to keep
the file readable even if the writer crashes mid-write:

```
write_status(feature_dir, new_content):
  tmp = feature_dir + "/.forge-status.yml.tmp"
  write new_content to tmp
  rename tmp → feature_dir + "/.forge-status.yml"   # atomic on POSIX
```

### 2.4 Release

Release the lock in a `finally` block (or shell `trap`) so that exceptions,
aborts, and SIGINT still clean up:

```
release(feature_dir):
  lock_path = feature_dir + "/.forge-status.yml.lock"
  if file exists at lock_path:
    delete lock_path
```

### 2.5 Stale lock recovery

If a user reports being blocked by a lock that never releases (crash scenario):

1. Check the lock file age. If > `ttl_seconds` — the next writer will take
   over automatically; no action required.
2. If < `ttl_seconds` but the holding session is confirmed dead — manually
   delete `.forge-status.yml.lock`.

### 2.6 Scope

Only `.forge-status.yml` is protected by this lock. Other artifacts
(research files, plan.md, tasks.md, etc.) are either append-only or owned by
a single phase and do not require locking.

### 2.7 Reference shell helpers

The plugin ships portable shell helpers implementing the protocol above:

```bash
# In a sub-skill that mutates .forge-status.yml:
trap 'scripts/release-lock.sh "$FEATURE_DIR" "$FORGE_SESSION_ID"' EXIT INT TERM
scripts/acquire-lock.sh "$FEATURE_DIR" 1800 "$FORGE_SESSION_ID"
# ... write `.forge-status.yml` via temp + rename ...
```

- `scripts/acquire-lock.sh` uses `ln` (hardlink) as its atomic acquisition
  primitive, followed by a `session_id` verification step that confirms the
  writer owns the lock it just created. `ln` is used deliberately instead of
  `mv -n` (BSD `mv -n` silently skips on an existing target with exit 0,
  defeating the race guard); `ln` exits non-zero on an existing target on both
  GNU and BSD, so it works on Linux, macOS, and WSL. The script refuses fresh
  locks and takes over stale ones as described in §2.2.
- `scripts/release-lock.sh` is idempotent and refuses to delete a lock held
  by a different `session_id`, preventing takeover-race foot-guns.

Sub-skills that cannot run shell (pure in-LLM flows) should document which
writes they perform on `.forge-status.yml` and call out that they rely on
the LLM following the protocol voluntarily. This is best-effort — see
the caveat in OB-3 of the code review.

---

## 3. Step 1 — Feature Detection & Resume

Check `{features_dir}/` for a folder matching the feature name.

### 3.1 Detect FEATURE_DIR

The feature root is computed **only** through the Path-Resolution Contract
([§12](#12-path-resolution-contract)) — `resolve(slug)` for an existing or new
feature. Do not inline a `{features_dir}/<slug>/` join here; the path logic
lives in one place.

- If `FEATURE_DESCRIPTION` is provided: slugify it → `FEATURE_DIR = resolve(slug)`
  (under the default `flat` strategy this is `{features_dir}/<slug>/`, byte-for-byte
  today's behavior).
- If no `FEATURE_DESCRIPTION`: enumerate existing feature roots
  (§12.3 `enumerate()`), prompt the user to pick or enter a
  new name, then `FEATURE_DIR = resolve(slug)`.

### 3.2 Read `.forge-status.yml`

Acquire the state lock (§2) before reading. Once read, decide the resume point:

- If the file does not exist → create it with v3 defaults (see
  [schema.md](./schema.md)) and begin from the first phase of the selected
  feature mode.
- If `schema_version` is absent or `< 3` → apply the lazy migration from
  [schema.md §2](./schema.md#2-migration-from-v2-to-v3) before reading the
  phase table.
- The resume phase is the first non-completed, non-skipped phase in the
  mode-specific phase map (see [policy.md §4](./policy.md#4-feature-modes-e1)).

Release the lock after the decision is recorded.

---

## 4. Step 2 — Pre-flight Check

Before starting any delegation:

1. Ensure `FEATURE_DIR` exists. If not, create it and initialize
   `.forge-status.yml` (v3).
2. **Validate status-file enums.** Before using any value from
   `.forge-status.yml`:
   - `feature_mode` MUST be one of `"express" | "lite" | "standard" | "v-model"`.
     See [commands/forge.md §Mode Resolution](../commands/forge.md) step 4
     for the exact abort message.
   - Every `phases.<name>.status` MUST be one of
     `"pending" | "in_progress" | "completed" | "skipped" |
     "not_applicable" | "completed_with_known_issues"`, plus the
     legacy literal `"approved"` on `phases.revalidation.status` which
     is treated as equivalent to `"completed"` per
     [schema.md](./schema.md).
   - Every `gates[].decision` MUST be one of
     `"approved" | "approved_with_conditions" | "revised" |
     "skipped" | "rolled_back" | "aborted"` per
     [policy.md §2](./policy.md#2-gate-decisions).
   - On any invalid value: abort with
     *"Invalid {field}: '{value}' in .forge-status.yml. Expected one
     of {enum}. Fix and re-run."* Do NOT auto-correct, silently
     re-run the phase, or coerce the value — a typo in the status
     file is a user error that must be surfaced.
3. Summarize prior-phase outputs if resuming.
4. Show the full phase checklist using `TodoWrite`. Mark optional phases
   (`5C`, `6B`, `8A`, `8B`, `9`) as "optional" and skipped phases as
   "skipped — reason: ...".
5. Ask the user: *"Ready to start/resume from Phase N: [phase name]? Any
   changes to the feature description?"*

---

## 5. Sync-Verify Integration

### 5.1 Automatic quick sync

If `auto_sync_between_phases: true` (default), the orchestrator runs a
lightweight sync-verify between every phase transition. No separate command
delegation is needed — the orchestrator handles it internally.

| Transition | Sync Layers |
|------------|-------------|
| Phase 1 → Phase 2 | (none — research is input) |
| Phase 2 → Phase 3 | Layer 1 (research ↔ product-spec) |
| Phase 3 → Phase 4 | Layer 1 |
| Phase 4 → Phase 5 | Layer 2 (product-spec ↔ spec.md) |
| Phase 5 → Phase 5B | Layer 3 (spec.md ↔ plan.md) |
| Phase 5B → Phase 5C | Layer 4 (plan.md ↔ tasks.md) |
| Phase 5C → Phase 6 | Layers 3, 4 |
| Phase 6 → Phase 6B | Layers 5, 6, 8, 9 (tasks ↔ code, spec ↔ code, contract drift, doc ↔ code) |
| Phase 6B → Phase 7 | Full (all 9 layers) |
| Phase 7 → Phase 8A | Layer 7 (cross-links only) |

### 5.2 Quick-sync behavior

- Only check layers relevant to the transition.
- Only report `CRITICAL` items (suppress `WARNING` / `INFO`).
- If zero CRITICAL: auto-proceed with note *"Quick sync: clean"*.
- If CRITICAL found: pause and present to user before allowing phase transition.
- Update `sync_runs` on `.forge-status.yml`.

### 5.3 Full sync on demand

At any time, the user can run `/speckit.product-forge.sync-verify` for a full
9-layer check. The orchestrator also suggests this before Phase 7 if it has
not been run recently.

---

## 6. Gate Audit Trail

After every gate decision, append to `gates:`:

```yaml
gates:
  - phase: "{phase_name}"
    decision: "{approved | approved_with_conditions | revised | skipped | rolled_back | aborted}"
    timestamp: "{ISO timestamp}"
    notes: "{user's reasoning or empty}"
    conditions: []            # required when decision == "approved_with_conditions"
    sync_result: "{clean | N_critical | N_warning}"
    approvals:                # present only when role_approvals.solo_mode is false
      pm: { approved_by: "...", at: "..." }   # or null for pending
      eng: { approved_by: "...", at: "..." }
      qa: null
    skip_reason: null         # required when decision == "skipped" and require_skip_reason is true
    rolled_back_to: null      # required when decision == "rolled_back" (phase name to rewind to)
    reviewed_sha: "abc1234"   # W5-A2 — git SHA / artifact stamp reviewed; enables delta/incremental review on re-run
    risk: "low"               # W5-A4 — gate risk class (low | medium | high) from scripts/gate-risk.js
```

See [docs/policy.md §2](./policy.md#2-gate-decisions) for the full list of
decision literals and their required fields.

The gate trail is the primary traceability artifact for retrospectives and
audits. Do not mutate past entries; only append.

---

## 7. Dry-Run Semantics

This section is a forward-looking contract for sub-skills. Runtime
enforcement is planned for a later wave (A3).

When invoked with `--dry-run`:

- All LLM calls may still run; artifacts may still be computed.
- Writes are redirected to `.forge-dry-run/<phase>/` instead of real paths.
- `.forge-status.yml` is NOT updated.
- At completion, produce a diff report listing files that would have changed.

Sub-skills are expected to support `--dry-run` when feasible. Not all do yet —
absence is not an error in this version.

---

## 8. Phase Digest Requirement (A4)

Every major phase **that is in scope for the feature's mode** MUST produce
a digest file before the orchestrator marks the phase `completed`.

"In scope for the feature's mode" is resolved per
[docs/policy.md §4](./policy.md#4-feature-modes-e1):

| Mode | Phases that require a digest |
|------|------------------------------|
| `lite` | `product_spec`, `plan`, `implement`, `verify` |
| `standard` | `research`, `product_spec`, `plan`, `tasks`, `implement`, `verify` |
| `v-model` | same as standard plus V-Model artifact phases when implemented |

Phases marked `not_applicable` (for example in `backfill`-ed features) are
exempt regardless of mode.

### 8.1 Contract

- File path: `<FEATURE_DIR>/<phase>/digest.md`.
- Template: [`docs/templates/phase-digest.md`](./templates/phase-digest.md).
- Sections (required): Key decisions, Artifacts produced, Open risks, Handoff notes.
- Length: soft 300 words, hard 600 words.

### 8.2 Enforcement

At phase transitions the orchestrator checks:

1. `.forge-status.yml` has `phases.<name>.digest_path` set.
2. The referenced file exists and is non-empty.
3. The file does not exceed 600 words (advisory warning, not a block).

If either (1) or (2) fails for an in-scope phase of a v3-native feature,
the phase is treated as not yet complete regardless of the `status` field,
and the sub-skill is asked to produce the digest before the gate is
presented.

### 8.3 Grandfathering (backwards compatibility)

Features created on v1.3 / v1.4 did not write digests. Enforcement is
softened for those features to preserve the "no action required on
upgrade" promise in the v1.5.0 migration notes.

A feature is considered **v2-native** (and therefore subject to hard
digest enforcement) only when all of these are true:

- `.forge-status.yml` has `schema_version: 3` set by a v2-aware writer.
- `created_at` is on or after the v1.5.0 release date, OR the field
  `v2_native: true` has been explicitly set on the status file.

For features that do NOT satisfy both conditions:

- Missing digests are surfaced as WARNING, not CRITICAL.
- The orchestrator proceeds through gates without blocking.
- On first write by a v2-aware sub-skill, if a phase is `completed` but
  has no `digest_path`, a minimal stub digest is synthesised at
  `<phase>/digest.md` with the banner *"legacy migration — digest stub,
  no original capture"*. This preserves the rule shape for future reads
  without fabricating content.

The grandfathering is explicit and visible: every stubbed digest says so
in its opening line. Nothing is silently upgraded to "looks native".

### 8.4 Downstream consumers

| Consumer | Uses digest for |
|----------|-----------------|
| `verify-full` | initial scan; pulls full artifacts only on demand |
| `code-review` | per-phase context entry |
| `portfolio` | feature-scan without full-artifact reads |
| `retrospective` | cross-phase learning extraction |

Downstream consumers MUST tolerate stub digests (§8.3) — they contain
the banner instead of sections.

---

## 9. Monorepo-Aware Operations (B1.5)

When `.product-forge/config.yml` contains a `codebase.paths` block,
every command becomes **workspace-aware**. Single-root projects
(only `codebase_path` set) are unchanged.

### 9.1 Resolver contract

Sub-skills that scan code MUST resolve scope as follows:

```
1. Read project config.
2. If `codebase.paths` present → monorepo mode:
     workspaces = dict of { name: absolute_path }
     root = codebase.root (resolved to absolute path)
3. Else if `codebase_path` present → single-root mode:
     workspaces = { "default": absolute_path }
     root = codebase_path
4. Else:
     workspaces = { "default": "." }
     root = "."

Feature scope:
5. Read `.forge-status.yml` scope.paths.
6. If set → limit scan to those workspaces only.
7. If unset and in monorepo mode:
     → prompt user or default to primary workspace.
8. If in single-root mode → scope is trivially { "default" }.
```

### 9.2 Path format conventions

In monorepo mode, file paths in user-visible artifacts are prefixed
with the workspace name:

```
Paths: backend:src/modules/users/users.service.ts, frontend:src/features/profile/profile.vue
```

In `task_log[].paths` the same prefix is preserved:

```yaml
task_log:
  - id: T007
    paths: ["backend:src/modules/users/users.service.ts"]
```

Single-root mode omits the workspace prefix for brevity — paths stay
relative to `codebase_path`.

### 9.3 Test-runner resolution

When `codebase.workspace_type` is set, test commands are built from
these templates:

| workspace_type | Template |
|----------------|----------|
| `pnpm` | `pnpm --filter=<workspace> <script>` |
| `yarn` | `yarn workspace <workspace> <script>` |
| `npm` | `npm run <script> -w <workspace>` |
| `turbo` | `turbo run <script> --filter=<workspace>` |
| `nx` | `nx run <workspace>:<script>` |
| `rush` | `rush <script> --to <workspace>` |
| `lerna` | `lerna run <script> --scope=<workspace>` |
| `none` | `(cd <path> && <script>)` |

Sub-skills substitute `<script>` with the detected command (`test`,
`test:unit`, `lint`, `build`).

### 9.4 Per-workspace progressive verify

In monorepo mode, `progressive_verify_interval` is evaluated per
workspace, not globally. A feature touching two workspaces with
interval=3 runs verify every 3 completed tasks **per workspace**, not
every 3 tasks total. This keeps the signal meaningful even when tasks
are unevenly distributed.

### 9.5 Cross-workspace change propagation

When a change request affects code in a workspace outside the feature's
original `scope.paths`, the orchestrator:

1. Widens `scope.paths` to include the new workspace.
2. Sets `scope.cross_workspace: true`.
3. Flags the expanded scope in the next gate entry as an
   `approved_with_conditions` + condition "scope widened to include
   <workspace>".
4. Re-runs sync-verify Layer 5 (tasks ↔ code) across the new workspaces.

### 9.6 Portfolio conflict detection per workspace

`/portfolio` computes file conflicts **per workspace** first, then
aggregates. Two features touching `backend:src/users.ts` conflict
(HIGH). Two features touching `backend:src/users.ts` and
`frontend:src/users.ts` respectively do NOT conflict — different
workspaces, different files despite identical sub-paths.

The report groups conflicts under a "By workspace" heading so a team
splitting by workspace can see their own conflicts without filtering.

### 9.7 V-Model mode in monorepo

V-Model artifacts (REQ / SYS / ARCH / MOD) stay at the feature level
regardless of workspace count. Scope annotations refer to which
workspaces the MOD-level artifacts are implemented in. See
[v-model-integration.md](./v-model-integration.md) for details.

---

## 10. Context-Budget Behavior

At phase transitions, the orchestrator estimates remaining context by
comparing prior-phase digest sizes (see §8). If the cumulative context is
projected to exceed the active model's window during the next phase:

1. Offer to summarize prior phases and continue in a fresh session with
   auto-resume via `.forge-status.yml`.
2. Do not auto-truncate — prefer a clean handoff over silent loss.

The digest-first reading strategy keeps the baseline low. Full artifacts are
read only when a specific cross-artifact check requires them.

---

## 11. Fluid-Mode Runnable-Set Resolution

Under `flow_mode: fluid` (see [policy.md §4.0.1](./policy.md#401-flow-mode-gated-vs-fluid)
and [commands/forge.md §"Flow Mode"](../commands/forge.md)), the orchestrator
does not force the single next phase after each transition. Instead it presents
the **set of currently-runnable phases** and lets the user pick. This section is
the authoritative definition of how that set is computed; forge.md Flow Mode and
policy §4.0.1 defer here.

### 11.1 The dependency-to-enabler rule

A phase is **runnable** when *all of its required upstream artifacts already
exist*. Dependencies are **enablers** ("Plan is ready to run because `spec.md`
exists"), not strict order gates. A phase is omitted from the runnable set only
when an upstream artifact it needs is still missing — never merely because an
earlier phase was skipped or because it is "out of order".

This resolves **runnability only**. Which phases are *in scope* for the feature
still defers entirely to the mode-specific phase maps in
[policy.md §4](./policy.md#4-feature-modes-e1) (and the
[forge.md phase execution map](../commands/forge.md)). The runnable set is the
intersection: `{ in-scope for the mode } ∩ { upstream artifacts present }`,
minus any phase already `completed` (re-runs are offered explicitly, not as part
of the default set).

### 11.2 Per-phase required upstream artifacts

Artifact prerequisites are drawn from the sync-verify artifact map
([commands/sync-verify.md](../commands/sync-verify.md), "Determine which
artifacts exist") and the phase execution map. A phase becomes runnable once the
artifacts in its row are present under `<FEATURE_DIR>/`.

| Phase | Required upstream artifact(s) | Enabler note |
|-------|-------------------------------|--------------|
| 0. Problem Discovery | (none) | always runnable |
| 1. Research | (none) | always runnable |
| 2. Product Spec | `research/README.md` (standard/v-model); none for express/lite | runnable once research exists (or immediately in express/lite) |
| 3. Revalidation | `product-spec/README.md` | runnable once the product spec exists |
| 4. Bridge → SpecKit | `product-spec/README.md` | runnable once the product spec exists |
| 5. Plan | `spec.md` | runnable once `spec.md` exists |
| 5B. Tasks | `plan.md` | runnable once `plan.md` exists |
| 5C. Pre-Impl Review | `tasks.md` | runnable once `tasks.md` exists |
| 6. Implement | `tasks.md` | runnable once `tasks.md` exists |
| 6B. Code Review | code files from completed tasks | runnable once code exists |
| 7. Verify Full | `spec.md` + code files | runnable once code exists to verify against |
| 8A. Test Plan | `journeys/` + code files | runnable once journeys and code exist |
| 8B. Test Run | `.spec.ts` from Phase 8A | runnable once generated tests exist |
| 9. Release Readiness | verify-full + (when in scope) test-run results | runnable once verification has run |

Optional / conditional phases (`0`, `4.5`, `5.5`, `5C`, `6B`, `8A`, `8B`, `9`,
`9.5`, `9B`) appear in the runnable set only when both their artifact
prerequisites are met **and** they are in scope per the mode map. V-Model phases
follow the same rule against their own artifact prerequisites (see
[v-model-integration.md](./v-model-integration.md)).

### 11.3 Worked example

A standard-mode feature has produced `research/`, `product-spec/`, and `spec.md`,
but no `plan.md` yet. The runnable set is:

- **Plan** — runnable (`spec.md` exists).
- **Revalidation**, **Bridge** — runnable (`product-spec/` exists; re-runnable).
- **Tasks**, **Implement**, **Verify Full** — *not* runnable (`plan.md` /
  `tasks.md` / code do not exist yet).

The orchestrator presents `{ Plan, Revalidation, Bridge }` as the structured
`Next step` prompt (recommended-first: Plan), runs `sync-verify` at the chosen
transition, and records the gate decision exactly as in gated mode.

---

## 12. Path-Resolution Contract

This is the **single normative rule** for computing where a feature lives on
disk. Every one of the 31 commands and both deterministic scripts consult it
rather than inlining their own path logic — the path logic lives in **ONE
place** (here). It is parameterized by the merged `storage_strategy`
([§1.2](#12-extract)).

Configurability is scoped to **feature-root PLACEMENT only**. The internal
artifact tree under each feature (`research/`, `product-spec/journeys/`,
`contracts/`, `.forge-status.yml`, `testing/`, …) is **INVARIANT** across every
strategy — every command keeps its feature-relative internal paths verbatim.
The *only* thing a strategy changes is how a single `FEATURE_DIR` is composed
from `features_dir` and the feature slug.

### 12.1 Storage strategies

| Strategy | `config_value` | Feature root | Status |
| --- | --- | --- | --- |
| **Flat** | `flat` | `{features_dir}/<slug>/` | **Active — default.** Status quo, formalized. Every feature is an immediate child of `features_dir`; the filesystem enforces global slug uniqueness. Resolve is a deterministic one-level join with no scan. An absent `storage_strategy` key resolves to `flat`. |
| **Domain-nested** | `domain-nested` | `{features_dir}/<domain>/<slug>/` | **Active — first-class (opt-in).** One extra grouping folder by area/team/surface. A single depth-tolerant discovery rule subsumes flat (depth 1) and the existing `_archived/<date-slug>` (depth 2). Mixed flat+nested layouts coexist. |
| **DDD bounded-context** | `ddd` | `{features_dir}/<context>/<slug>/` | **Active (opt-in).** Groups by bounded context mirroring `specs/<domain>/`, backed by a `features/domains.yml` registry for O(1) slug → context resolution (read by `scripts/lib-paths.js`; healed by the orchestrator). |
| **Workspace-aligned** | `workspace` | `{features_dir}/<workspace>/<slug>/` | **Active (opt-in, monorepo).** Each feature under its primary monorepo workspace (`scope.primary`), mirroring `codebase.paths`. Same on-disk depth as `domain-nested`. |

`flat` is the zero-config default and the only value an absent key resolves to.
Grouping is opt **into**, never implicit. `storage_strategy` is validated at
Step 0: it must be one of the four enum values (`flat`, `domain-nested`, `ddd`,
`workspace`); an unknown value is rejected — do not silently fall back to
`flat`. `workspace` additionally requires monorepo mode (a `codebase.paths`
block); selecting it without one is rejected. Although `storage_strategy` is
global-eligible, once a repo has features the effective strategy MUST be pinned
at the **project** layer (same lock-after-creation concern as `features_dir`).

The contract exposes exactly **two operations**. No command computes a feature
path any other way.

### 12.2 `resolve(slug) → FEATURE_DIR`

Given a feature slug (or a qualified reference), return the single `FEATURE_DIR`
the invariant internal tree hangs off.

| `storage_strategy` | resolve(slug) |
| --- | --- |
| `flat` | `join(features_dir, slug)` — direct join, **no scan**, no disambiguation possible. |
| `domain-nested` | Match `{features_dir}/*/<slug>/.forge-status.yml` plus the legacy-flat fallback `{features_dir}/<slug>/.forge-status.yml`, skipping `_`-prefixed top-level dirs. 0 → not found (CREATE). 1 → use it. More than 1 → require a qualified `<domain>/<slug>` reference or prompt; **never silently pick the first**. |
| `ddd` | PRIMARY: read `features/domains.yml`, map slug → context, build `join(features_dir, context, slug)` in O(1) (`scripts/lib-paths.js` does this read-only). Miss/stale entry → glob `{features_dir}/*/<slug>/` → flat fallback; the **orchestrator** heals the registry on a single hit (the deterministic resolver never writes). More than 1 → require qualified `<context>/<slug>`. |
| `workspace` | Scan `{features_dir}/*/<slug>/` (two levels, skip `_`-prefixed first-level dirs), with a depth-1 `{features_dir}/<slug>/` fallback for unmigrated/single-root features. More than 1 → require `--workspace <ws>` or a `workspace/slug` path-style reference. |

**CREATE (new feature) — placement:**

| `storage_strategy` | FEATURE_DIR on create |
| --- | --- |
| `flat` | `join(features_dir, slugify(description))`. |
| `domain-nested` | `join(features_dir, <domain>, slug)`; `<domain>` from an explicit `<domain>/<slug>` / `--domain`, else interactive pick of existing domains plus "new", else `project_domain` as last-resort fallback. Reject `_`-prefixed and multi-segment domains. |
| `ddd` | `join(features_dir, <context>, slug)`; `<context>` derived from the targeted `specs/<domain>` (or `scope` / prompt), confirmed with the user, then written as a `slug → context` row in `domains.yml` (registry heal). |
| `workspace` | `join(features_dir, scope.primary, slug)`. A cross-workspace feature gets exactly ONE home under its primary — never split or duplicated. |

### 12.3 `enumerate() → [FEATURE_DIR, …]`

Return every feature root for cross-feature operations (portfolio, status,
bridge, sync-verify, flag-cleanup).

**Universal rule (depth-tolerant, strategy-agnostic):**

> Descend from `features_dir`. The **first** directory containing a
> `.forge-status.yml` IS a feature root — record it and **stop descending** into
> that subtree. Skip any directory whose name starts with `_` at the top level
> (reserved namespaces). Skip the `domains.yml` file (`ddd`).

This single rule cleanly subsumes:

- `flat` features at depth 1,
- `domain-nested`, `ddd`, and `workspace` features at depth 2,
- the existing `_archived/<date-slug>/` convention (already depth 2, excluded
  via the top-level `_`-skip),
- mixed flat + nested layouts during migration.

`.forge-status.yml` lives **only** at the feature root and never deeper, so
"stop on first hit" is unambiguous.

### 12.4 Reserved namespaces (shared by all strategies)

`_`-prefixed top-level children of `features_dir` are excluded from
`enumerate()`, and `resolve()` never returns one:

- `_portfolio/` — cross-feature report output (`portfolio.md`,
  `flag-cleanup-{date}.md`). Stays top-level under every strategy.
- `_archived/` — `spec-merge` archives (`_archived/<date>-<slug>/`, depth 2).
  Stays top-level. Under the `ddd` strategy, new archives MAY be
  context-keyed (`_archived/<context>/<date>-<slug>/`) to mirror the live
  taxonomy.

> **`workspace` caveat (surfaced not hidden):** under `workspace`,
> archived features sit at the **same depth (2)** as real features, so the
> top-level `_`-skip becomes **load-bearing** — a bug there silently pulls
> archived features into every report.

### 12.5 Sites that MUST adopt the contract

Every site below stops inlining path logic and calls `resolve()` /
`enumerate()`.

**Executable directory scan:**

- `scripts/migrate-status-v2-to-v3.js` — `findStatusFiles()` one-level
  `readdirSync` → the depth-tolerant `enumerate()` walk (prune-on-match), via
  the shared `scripts/lib-paths.js`. (Its `.ts` sibling is only a deprecation
  stub that prints a redirect and exits 64 — it performs no scan and needs no
  change.)

**Cross-feature enumeration (prose globs in command files):**

- `commands/portfolio.md` — "each immediate child of `{features_dir}/`" →
  `enumerate()`. Output still `{features_dir}/_portfolio/portfolio.md`.
- `commands/status.md` — "list all directories in `{features_dir}/`" →
  `enumerate()`.
- `commands/bridge.md` — "list all feature directories in `{features_dir}/`" →
  `enumerate()`; skip-if-empty unchanged.
- `commands/sync-verify.md` — no-slug "list features and ask which" →
  `enumerate()`. Per-layer inputs stay `{FEATURE_DIR}/...` (invariant tree).
- `commands/feature-flag-cleanup.md` — `{features_dir}/*/flags/registry.yml` →
  `enumerate()` then `<root>/flags/registry.yml`. Report still under
  `_portfolio/`.

**Single-feature resolution:**

- `scripts/validate-traceability.js` and `scripts/gate-risk.js` — the explicit
  `--feature-dir <path>` form is placement-agnostic for ALL strategies. The
  `--feature <slug>` shorthand now resolves **through the contract** as well
  (shared `scripts/lib-paths.js` → `resolveFeatureDir()`): it matches the flat
  path plus depth-2 `{features_dir}/*/<slug>/`, and **errors on an ambiguous
  bare slug**, asking for a qualified `<group>/<slug>` reference. The
  orchestrator MAY still pass the resolved `--feature-dir` for zero ambiguity.
- `commands/research.md`, `commands/backfill.md`,
  `commands/monitoring-setup.md` — replace the inline join with
  `FEATURE_DIR = resolve(slug)`.

**No glob, operates within one FEATURE_DIR (no change beyond upstream resolve):**

- `commands/forge.md` and all per-feature commands — consume `FEATURE_DIR` from
  the resolver; internal literals (`flags/registry.yml`,
  `monitoring/dashboard.json`, `contracts/openapi.yaml`, …) are untouched.

### 12.6 Qualified-reference caveat for `depends_on`

`dependencies.depends_on` in `.forge-status.yml` (see
[schema.md](./schema.md)) stores **bare sibling slugs**. Under any nesting
strategy a bare slug can be ambiguous. Nesting strategies SHOULD store qualified
refs (`<domain>/<slug>`, and — when those strategies ship — `<context>/<slug>`
or `<workspace>/<slug>`); a bare slug that resolves to more than 1 candidate
falls back to the same disambiguation prompt as `resolve()`. This is an extra
real cost the nesting strategies carry and `flat` does not.
