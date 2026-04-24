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

Read `.product-forge/config.yml` from the project root (or `config-template.yml`
from the extension if none exists).

Extract:

- `project_name`
- `project_tech_stack`
- `project_domain`
- `codebase_path` (single-root projects, legacy)
- `codebase.root` / `codebase.paths` / `codebase.workspace_type` (monorepo mode, v1.5+)
- `features_dir`
- `default_speckit_mode`
- `default_feature_mode` (new in v1.5.0; default `"standard"`)
- `progressive_verify_interval`
- `auto_sync_between_phases`
- `require_skip_reason`
- `release_readiness` (`required` | `optional` | `skip`)

If the config is missing, prompt the user for project name, tech stack, domain,
and codebase path, and save the answers to `.product-forge/config.yml`.

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

- `scripts/acquire-lock.sh` uses atomic primitives (`mv -n` with `ln` fallback)
  that work on Linux, macOS, and WSL. It refuses fresh locks and takes over
  stale ones as described in §2.2.
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

- If `FEATURE_DESCRIPTION` is provided: slugify it → `{features_dir}/<slug>/`.
- If no `FEATURE_DESCRIPTION`: list existing feature dirs, prompt the user to
  pick or enter a new name.

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
   - `feature_mode` MUST be one of `"lite" | "standard" | "v-model"`.
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
| Phase 6 → Phase 6B | Layers 5, 6 (tasks ↔ code, spec ↔ code) |
| Phase 6B → Phase 7 | Full (all 7 layers) |
| Phase 7 → Phase 8A | Layer 7 (cross-links only) |

### 5.2 Quick-sync behavior

- Only check layers relevant to the transition.
- Only report `CRITICAL` items (suppress `WARNING` / `INFO`).
- If zero CRITICAL: auto-proceed with note *"Quick sync: clean"*.
- If CRITICAL found: pause and present to user before allowing phase transition.
- Update `sync_runs` on `.forge-status.yml`.

### 5.3 Full sync on demand

At any time, the user can run `/speckit.product-forge.sync-verify` for a full
7-layer check. The orchestrator also suggests this before Phase 7 if it has
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
