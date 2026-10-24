> Reference for `verify-full` — the two opt-in procedures: the Layer 3
> subjective-AC judge and the Layer 9 deterministic contract diff. Read a section
> only when its config switch is on.

# verify-full — Opt-in Layer Procedures

## Layer 3 — LLM judge for subjective ACs (`verify.ac_judge`)

Gated, lowest-priority, and off by default:

```yaml
# config.yml
verify:
  ac_judge: false        # default off; set true to enable the subjective-AC LLM judge
```

When `verify.ac_judge: true`, judge each AC classified **judgeable** in Layer 3 —
and only those; an `executable` AC that a test already covers is never re-judged.
Evaluate the rendered / observed behaviour against the AC wording:

- UI-text ACs ("error message is descriptive"): read the actual string the `code`
  path emits (the literal in the handler/component, or the message the E2E test
  captured) and judge it against the criterion.
- Verdict: `judge: pass | weak | fail`, with a one-line rationale and the exact
  evidence string cited.

Flags:

- `judge: fail` on a `must_have` AC → ⚠️ WARNING (advisory — a human gate, not a
  blocker; the judge is non-deterministic by nature).
- `judge: weak` → note only.

The judge reads emitted strings and observed output; it edits no code and
promotes no `status`. Its verdicts are WARNING or notes, never CRITICAL — only
the deterministic **unmeasurable** classification is CRITICAL. Keep
`verify.ac_judge` off in CI unless a reviewer wants it.

## Layer 9 — Deterministic contract-drift diff (`contract_differ: oasdiff`)

`contracts/openapi.yaml` is the approved contract authored by `bridge` / `plan`.
Diff the **working-tree** copy against the **last-approved baseline** — the
`gates[].reviewed_sha` of the last contract-touching gate, else `HEAD` — to
surface drift since approval. Read-only and reproducible:

```bash
# config.yml → sync_verify.contract_differ: oasdiff   (default: unset → prose check)
SPEC={FEATURE_DIR}/contracts/openapi.yaml
BASE_SHA=$(git -C {FEATURE_DIR} rev-parse HEAD)   # or gates[].reviewed_sha of the last contract gate

# Breaking-change gate (non-zero exit ⇒ breaking drift since baseline):
git -C {FEATURE_DIR} show "$BASE_SHA:contracts/openapi.yaml" > /tmp/openapi.base.yaml 2>/dev/null \
  && oasdiff breaking /tmp/openapi.base.yaml "$SPEC" --fail-on ERR

# Full structured diff (machine-readable, for the report rows):
oasdiff diff /tmp/openapi.base.yaml "$SPEC" -f json
```

Map the output into the Layer 9 flags:

- each `oasdiff breaking` finding (removed endpoint, narrowed type, new required
  param) → ❌ CRITICAL;
- each non-breaking `oasdiff diff` change (added optional field, new endpoint) →
  ⚠️ WARNING noting the contract evolved since approval;
- `oasdiff` not installed → a SKIPPED row with the install hint
  (`go install github.com/oasdiff/oasdiff@latest`), never a silent pass.

Fill the report's `oasdiff (if on)` column with `no breaking` /
`BREAKING: {change}` / `non-breaking: {change}` / `SKIPPED (oasdiff not installed)`.
