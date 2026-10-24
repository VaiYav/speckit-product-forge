> Reference for `sync-verify` Layer 8 — the opt-in executable OpenAPI differ.
> Read only when the decision rule below selects the differ.

# sync-verify — Executable Contract Differ (Layer 8)

The Layer 8 shape checks are an LLM read by default. When the project opts in,
a deterministic OpenAPI differ replaces them, so contract drift is a tool exit
code instead of a prose judgement.

## Config

```yaml
sync_verify:
  contract_differ: none          # none (default) | oasdiff
  contract_regen:                # only used when contract_differ != none
    cmd: ""                      # command that emits the code-derived OpenAPI spec to stdout
    out: ".forge-tmp/openapi.from-code.yaml"   # temp path the cmd writes to (never inside contracts/)
```

Both keys are documented in `config-template.yml` and [docs/config.md](../config.md).
The prose path is the default by design; the differ is opt-in.

## Decision rule (OpenAPI only — `asyncapi.yaml` / events stay on the prose path)

- `contract_differ: oasdiff` **and** a regen source is configured
  (`contract_regen.cmd` is set, or `contract_regen.out` already exists from the
  build) **and** `oasdiff` is on `PATH` → run the differ.
- Otherwise (default `none`, no regen source, or `oasdiff` missing) → use the
  LLM prose check and note the fallback reason in the finding Evidence.

## Procedure

Regenerate the code-derived spec to the temp path, then diff it against the
committed contract (the committed contract is the base / truth):

```bash
# 1. Regenerate the OpenAPI spec FROM the code to a temp path (read-only w.r.t. the repo).
#    contract_regen.cmd is provided by the project (e.g. a framework's openapi export);
#    it writes to contract_regen.out, never into contracts/.
mkdir -p "$(dirname "$REGEN_OUT")"
eval "$REGEN_CMD" > "$REGEN_OUT"          # skip this step if contract_regen.out already exists

# 2. Breaking-change detection → CRITICAL evidence (exit 1 == ERR-level breaking change found).
oasdiff breaking "$FEATURE_DIR/contracts/openapi.yaml" "$REGEN_OUT" --fail-on ERR
BREAKING_EXIT=$?

# 3. Full structured drift surface → WARNING evidence (any non-breaking divergence).
oasdiff diff "$FEATURE_DIR/contracts/openapi.yaml" "$REGEN_OUT" -f text
oasdiff diff "$FEATURE_DIR/contracts/openapi.yaml" "$REGEN_OUT" -f json   # machine-readable for the report
```

## Mapping to DRIFT items

The exit code is evidence, not a verdict:

- `oasdiff breaking … --fail-on ERR` exits non-zero → one **CRITICAL**
  `DRIFT-NNN` (Layer 8, structural) per breaking change, with the oasdiff line as
  Evidence. It flows through Step 5 like every other finding — the human loop
  decides; the differ never auto-fails a gate ([policy §9.3](../policy.md)).
- `oasdiff diff` shows non-breaking divergence → **WARNING** `DRIFT-NNN` items
  (contract ↔ code shape drift) carrying the diff hunks as Evidence.
- Clean (`breaking` exit 0, empty `diff`) → the Layer 8 contract-shape check is ✅.
