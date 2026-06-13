#!/usr/bin/env node
// scripts/lint-docs.js
//
// Deterministic consistency-linter for the Product Forge documentation corpus.
//
// Product Forge is "spec-as-product": its correctness IS the internal
// consistency of ~140 markdown/yaml documents that an LLM must parse and
// execute. There is no compiler — so a contradiction between two docs is a
// silent runtime bug. This script is the missing compiler: a zero-dependency,
// CI-friendly STRUCTURAL validator over the repo's own docs/commands/manifests.
//
// It productizes the recurring multi-agent self-audit into a script that runs
// on every push (see scripts/doctor.js + .github/workflows/ci.yml), so the
// "callout-deep, not procedure-deep" defect class cannot silently return.
//
// Checks (each is a named rule; --json emits machine-readable findings):
//   XREF        — every relative ../docs|commands|scripts ref + #anchor resolves,
//                 and NONE escapes the plugin root (../.. is forbidden — the
//                 plugin is copied to ~/.claude/plugins/cache at install).
//   CMD-COUNT   — commands/*.md  ==  extension.yml provides.commands  ==  count
//                 claimed in README/how-it-works/claude-plugin/QA docs.
//   VERSION     — extension.yml version == .claude-plugin/plugin.json version,
//                 and no stale "v1.5 adds"/"vN.N adds" narrative below current.
//   ENUM        — feature_mode / gate-decision / phase-status enums are
//                 byte-identical everywhere they are enumerated.
//   PHASEMAP    — forge.md Phase Map rows == execution-map rows == the count
//                 every doc claims (no "18 rows" vs "20 rows" drift).
//   CONFIG-READER — every config key documented in config-template.yml is read
//                 by >=1 command (catches dead switches like a11y_gate).
//   SCRIPT-PATH — no command invokes `node scripts/...` or require('./scripts/')
//                 by bare relative path (must go through ${PLUGIN_ROOT}).
//   ID-FORMAT   — task-id form is consistent (T001 canonical, not TASK-012).
//
// Usage:
//   node scripts/lint-docs.js [--json] [--root <repo-root>]
//   node scripts/lint-docs.js --selftest
//
// Exit codes: 0 = clean, 1 = findings, 2 = usage/IO error.

"use strict";

const fs = require("node:fs");
const path = require("node:path");
let parseYaml;
try { ({ parseYaml } = require("./lib-yaml")); } catch { parseYaml = null; }

// ── tiny helpers ─────────────────────────────────────────────────────────────
const read = (p) => fs.readFileSync(p, "utf8");
const exists = (p) => fs.existsSync(p);
const lines = (s) => s.split(/\r?\n/);

function listFiles(dir, ext) {
  if (!exists(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(ext)).map((f) => path.join(dir, f)).sort();
}

// Parse the canonical `phases:` key set from forge-status-v3.schema.yml. Returns
// the phase keys (top-level children of `phases:`) — used by GATE-POLICY to
// validate that gate-policy.yml only references real phases. Best-effort: returns
// [] if the file/parser is unavailable so the rule degrades to action-only checks.
function canonicalPhaseKeys(schemaPath) {
  if (!exists(schemaPath)) return [];
  const out = [];
  const ls = lines(read(schemaPath));
  let inPhases = false, baseIndent = null;
  for (const line of ls) {
    if (/^phases:\s*$/.test(line)) { inPhases = true; continue; }
    if (!inPhases) continue;
    if (/^\S/.test(line) && line.trim() !== "") break;          // dedented to col 0 → block ended
    const m = line.match(/^(\s+)([a-z][a-z0-9_]+):\s*(#.*)?$/);  // key: (optional trailing comment)
    if (!m) continue;
    const indent = m[1].length;
    if (baseIndent === null) baseIndent = indent;
    if (indent === baseIndent) out.push(m[2]);                  // only direct children, not nested fields
  }
  return out;
}

function walk(dir, exts, out = []) {
  if (!exists(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".git")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, exts, out);
    else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}

// GitHub-style heading slug (best-effort, matches the repo's existing anchors).
// NOTE: GitHub maps EACH whitespace char to a hyphen (so "a & b" → "a--b" once
// the "&" is stripped), so we replace \s individually, NOT collapse \s+.
function slug(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")   // drop punctuation
    .replace(/\s/g, "-");
}

// Feature-runtime artifacts: paths the WORKFLOWS generate inside a feature
// directory at runtime, NOT plugin files. Command/doc prose references them with
// relative links (e.g. `./research/README.md`, `./spec.md`) — documented in
// docs/claude-plugin.md §"Caching caveat". They must be EXCLUDED from xref
// existence checks (the prior audit confirmed ~46 such false positives).
const FEATURE_DIRS = new Set([
  "research", "product-spec", "design-system", "journeys", "wireframes",
  "mockups", "testing", "bugs", "contracts", "flags", "monitoring",
  "migrations", "i18n", "api-docs", "tracking", "experiment", "specs",
  "playwright-tests", "playwright-results", "problem-discovery", "_portfolio",
  "_archived",
]);
const FEATURE_FILES = new Set([
  "spec.md", "plan.md", "tasks.md", "review.md", "verify-report.md",
  "test-report.md", "release-readiness.md", "retrospective.md",
  "security-check.md", "implementation-log.md", "pre-impl-review.md",
  "code-review.md", "change-log.md", "backlog.md", "gate-review.md",
  "traceability.yml", ".forge-status.yml", "gaps-report.md", "metrics.md",
  "competitors.md", "ux-patterns.md", "codebase-analysis.md", "tech-stack.md",
  "metrics-roi.md", "product-spec.md", "wireframes.md", "component-map.yml",
  "manifest.yml", "journeys.yml", "env.md", "snippets.md", "tracking-plan.md",
  "openapi.yml", "openapi.yaml", "asyncapi.yaml", "postman-collection.json",
  "sync-report.md", "sync-report.json", "experiment.yml", "alerts.yml",
  "dashboard.json", "slo.md", "keys.yml", "registry.yml", "domains.yml",
]);
function isFeatureArtifact(ref) {
  const segs = ref.split("/").filter((s) => s && s !== "." && s !== "..");
  if (segs.some((s) => FEATURE_DIRS.has(s))) return true;
  const base = segs[segs.length - 1] || "";
  return FEATURE_FILES.has(base);
}

function headingSlugs(text) {
  const out = new Set();
  for (const l of lines(text)) {
    const m = l.match(/^#{1,6}\s+(.*?)\s*$/);
    if (m) out.add(slug(m[1]));
  }
  return out;
}

// ── the linter ───────────────────────────────────────────────────────────────
function lint(root) {
  const findings = [];
  const add = (rule, severity, file, msg) => findings.push({ rule, severity, file, msg });

  const R = (p) => path.join(root, p);
  const rel = (p) => path.relative(root, p);

  // Source corpus = everything that ships in the plugin payload.
  // EXCLUDE docs/improvements/ — dated design memos that intentionally quote old
  // text, stale counts, and pre-fix code under audit; linting them is noise.
  const inImprovements = (p) => /\bimprovements\b/.test(p);
  const corpus = [
    ...walk(R("commands"), [".md"]),
    ...walk(R("docs"), [".md", ".yml", ".yaml"]).filter((p) => !inImprovements(p)),
    ...listFiles(root, ".md").filter((f) => /README|CHANGELOG|CONTRIBUTING/.test(f)),
  ];

  // ── XREF: relative refs resolve + no escape above plugin root ──────────────
  // Longest-extension-first alternation so ".json" is not clipped to ".js".
  // Lookbehind excludes \w ` . / so we never match the TAIL of a longer path
  // (e.g. the "./config-template.yml" suffix of "../config-template.yml").
  const refRe = /(?<![\w`./])((?:\.\.?\/)+[A-Za-z0-9_./-]+\.(?:yaml|yml|json|md|ts|js))(#[A-Za-z0-9_-]+)?/g;
  for (const f of corpus) {
    const txt = read(f);
    const baseDir = path.dirname(f);
    let m;
    while ((m = refRe.exec(txt)) !== null) {
      const ref = m[1];
      const anchor = m[2];
      // Escape check FIRST: a ref that climbs above the plugin root is always an
      // error (the plugin is copied to ~/.claude/plugins/cache; ../.. breaks).
      const resolved = path.resolve(baseDir, ref);
      if (!resolved.startsWith(root + path.sep) && resolved !== root) {
        add("XREF", "error", rel(f), `reference escapes plugin root: ${ref}`);
        continue;
      }
      // Runtime feature artifacts (./research/, ./spec.md, …) are generated at
      // runtime, not plugin files — skip existence check (documented convention).
      if (isFeatureArtifact(ref)) continue;
      if (!exists(resolved)) {
        add("XREF", "error", rel(f), `dangling reference: ${ref}`);
        continue;
      }
      if (anchor) {
        const slugs = headingSlugs(read(resolved));
        const want = anchor.slice(1);
        if (!slugs.has(want)) add("XREF", "warn", rel(f), `anchor not found: ${ref}${anchor}`);
      }
    }
  }

  // ── CMD-COUNT: files == manifest == claimed counts ─────────────────────────
  const cmdFiles = listFiles(R("commands"), ".md");
  const cmdCount = cmdFiles.length;
  const ext = exists(R("extension.yml")) ? read(R("extension.yml")) : "";
  const manifestCmds = (ext.match(/file:\s*"commands\/[^"]+\.md"/g) || []).length;
  if (manifestCmds !== cmdCount) {
    add("CMD-COUNT", "error", "extension.yml", `provides.commands has ${manifestCmds} entries but commands/ has ${cmdCount} files`);
  }
  // frontmatter name parity
  for (const f of cmdFiles) {
    const fm = read(f).match(/^name:\s*(\S+)/m);
    const want = "speckit.product-forge." + path.basename(f, ".md");
    if (!fm) add("CMD-COUNT", "warn", rel(f), "no frontmatter name:");
    else if (fm[1] !== want) add("CMD-COUNT", "error", rel(f), `frontmatter name ${fm[1]} != expected ${want}`);
  }
  // any "<N> slash command(s)"/"<N> command files" claim that disagrees
  const countClaimRe = /(\d{1,3})\s+(?:slash[- ]command|command files|commands)/gi;
  for (const f of corpus) {
    const txt = read(f);
    let m;
    while ((m = countClaimRe.exec(txt)) !== null) {
      const n = parseInt(m[1], 10);
      if (n >= 20 && n <= 60 && n !== cmdCount) {
        add("CMD-COUNT", "warn", rel(f), `claims ${n} commands; actual is ${cmdCount}`);
      }
    }
  }

  // ── VERSION: extension.yml == plugin.json ──────────────────────────────────
  const extVer = (ext.match(/^\s*version:\s*"([^"]+)"/m) || [])[1];
  const pj = exists(R(".claude-plugin/plugin.json")) ? JSON.parse(read(R(".claude-plugin/plugin.json"))) : {};
  if (extVer && pj.version && extVer !== pj.version) {
    add("VERSION", "error", ".claude-plugin/plugin.json", `plugin.json version ${pj.version} != extension.yml ${extVer}`);
  }
  // stale "vX.Y adds" narrative below the current minor. CHANGELOG.md is exempt:
  // by design it documents every past release (and quotes fixed text), so old
  // "vN.N adds" phrases there are history, not drift.
  if (extVer) {
    const [maj, min] = extVer.split(".").map(Number);
    const staleRe = /v(\d+)\.(\d+)\s+adds\b/gi;
    for (const f of corpus) {
      if (/CHANGELOG\.md$/.test(f)) continue;
      let m;
      const txt = read(f);
      while ((m = staleRe.exec(txt)) !== null) {
        const fa = Number(m[1]), fb = Number(m[2]);
        if (fa < maj || (fa === maj && fb < min)) {
          add("VERSION", "warn", rel(f), `stale "v${m[1]}.${m[2]} adds" narrative (current is ${extVer})`);
        }
      }
    }
  }

  // ── ENUM: single-source parity against docs/schema/enums.yml ───────────────
  // enums.yml is the canonical source (step 2 of the schema-as-source design
  // note). Rather than guess which prose lines are enumerations (fragile against
  // tables / multi-line wraps), we check a curated set of ANCHORED sites — the
  // normative spots that are supposed to list a full enum. Each site isolates
  // the enumeration substring with a regex; the rule extracts the quoted/
  // backticked literals from JUST that substring and asserts the full canonical
  // set is present with no foreign members. Adding a value to enums.yml then
  // fails every site that doesn't list it (single-source enforcement).
  const enumsPath = R("docs/schema/enums.yml");
  let enums = null;
  if (parseYaml && exists(enumsPath)) {
    try { enums = (parseYaml(read(enumsPath)) || {}).enums || null; } catch { /* fall through */ }
  }
  if (enums) {
    const setOf = (name) => new Set((enums[name] && enums[name].values) || []);
    const extrasOf = (name) => new Set((enums[name] && enums[name].allowed_extras) || []);
    const litsIn = (s) => [...s.matchAll(/[`"']?([a-z][a-z0-9_-]+)[`"']?(?=\s*(?:\||$|\)|`|"|'))/g)].map((m) => m[1]);
    // Anchored enumeration sites: { file, enum, find: regex capturing the list substring }
    const ENUM_SITES = [
      // feature_mode — full 4-value lists
      { file: "docs/schema/forge-status-v3.schema.yml", enum: "feature_mode", find: /Valid values:\s*([^\n.]+)/ },
      { file: "docs/schema.md", enum: "feature_mode", find: /`feature_mode`[^\n]*?`("express"[^`]+)`/ },
      { file: "commands/forge.md", enum: "feature_mode", find: /resolved value MUST be one of\s*\n?\s*`([^`]+)`/ },
      // gate_decision — the canonical 6-value list in schema.yml + runtime.md
      { file: "docs/schema/forge-status-v3.schema.yml", enum: "gate_decision", find: /decision:[^#]*#\s*(approved[^\n]+)/ },
      { file: "docs/runtime.md", enum: "gate_decision", find: /decision:\s*"\{([^}]+)\}"/ },
      // phase_status — schema.md single-line "one of ..." enumeration
      { file: "docs/schema.md", enum: "phase_status", find: /`phases\.<name>\.status`[^\n]*?one of\s*`([^`]+)`/ },
    ];
    for (const site of ENUM_SITES) {
      const p = R(site.file);
      if (!exists(p)) continue;
      const m = read(p).match(site.find);
      if (!m) { add("ENUM", "warn", site.file, `could not locate the ${site.enum} enumeration site (anchor moved? update lint-docs ENUM_SITES)`); continue; }
      const present = new Set(litsIn(m[1]));
      const canon = setOf(site.enum), extras = extrasOf(site.enum);
      const missing = [...canon].filter((v) => !present.has(v));
      const foreign = [...present].filter((l) => !canon.has(l) && !extras.has(l));
      if (missing.length) add("ENUM", "warn", site.file, `${site.enum} enumeration missing ${missing.map((x) => `'${x}'`).join(", ")} (canonical in enums.yml)`);
      if (foreign.length) add("ENUM", "warn", site.file, `${site.enum} enumeration has non-canonical member(s) ${foreign.map((x) => `'${x}'`).join(", ")}`);
    }
  } else {
    // Legacy spot-check fallback when enums.yml / lib-yaml unavailable.
    const fmDocs = [R("docs/config.md"), R("config-template.yml"), R("docs/schema/migration-v2-to-v3.md"),
                    R("docs/phases.md"), R("commands/forge.md")];
    for (const f of fmDocs.filter(exists)) {
      const txt = read(f);
      if (/\blite\b/.test(txt) && /\bstandard\b/.test(txt) && /\bv-model\b/.test(txt) && !/\bexpress\b/.test(txt)) {
        add("ENUM", "warn", rel(f), "names lite/standard/v-model but never express (feature_mode drift)");
      }
    }
  }

  // ── GATE-POLICY: docs/templates/gate-policy.yml shape ──────────────────────
  // forge --ci reads this; a malformed policy = a silently-wrong CI gate. Assert
  // every phase key is a real phase and every routing value is a canonical action.
  const gpPath = R("docs/templates/gate-policy.yml");
  if (parseYaml && exists(gpPath)) {
    let gp = null;
    try { gp = parseYaml(read(gpPath)); } catch { add("GATE-POLICY", "error", "docs/templates/gate-policy.yml", "does not parse as YAML"); }
    if (gp) {
      const actions = new Set((enums && enums.gate_policy_action && enums.gate_policy_action.values) || ["auto-recommend", "require-human", "block"]);
      const knownPhases = new Set(canonicalPhaseKeys(R("docs/schema/forge-status-v3.schema.yml")));
      const riskKeys = ["low", "medium", "high"];
      const checkBlock = (block, where) => {
        if (!block || typeof block !== "object") return;
        for (const rk of riskKeys) {
          if (block[rk] !== undefined && !actions.has(String(block[rk]))) {
            add("GATE-POLICY", "error", "docs/templates/gate-policy.yml", `${where}.${rk} = '${block[rk]}' is not a valid action (${[...actions].join(" | ")})`);
          }
        }
      };
      checkBlock(gp.defaults, "defaults");
      if (gp.phases && typeof gp.phases === "object") {
        for (const [ph, block] of Object.entries(gp.phases)) {
          if (knownPhases.size && !knownPhases.has(ph)) {
            add("GATE-POLICY", "warn", "docs/templates/gate-policy.yml", `phases.${ph} is not a known phase key`);
          }
          checkBlock(block, `phases.${ph}`);
        }
      }
    }
  }

  // ── CARRIER: every cross-phase carrier field has BOTH a producer and a ─────
  // consumer that name it. This is the structural antidote to the "callout-deep"
  // defect class: a field written by one phase but read by no one (or read but
  // written by no one) is a broken contract that prose review keeps missing
  // (it is exactly how the a11y_gate / red-gate-class gaps slipped past two
  // prior audits). `token` is the literal field name; `producer`/`consumer` are
  // files that MUST mention it (the schema is always allowed as a co-declarer).
  const CARRIER_FIELDS = [
    {
      token: "red_gate",
      producer: ["commands/implement.md"],          // writes phases.implement.red_gate
      consumer: ["commands/forge.md"],              // forge Phase 6 records/verifies it
    },
    {
      token: "reviewed_sha",
      producer: ["commands/forge.md"],              // stamped at the gate
      consumer: ["commands/verify-full.md", "docs/policy.md"],  // delta review reads it
    },
    {
      token: "Suggested canonical-spec updates",     // the doc↔code drift carrier (CF-5)
      producer: ["commands/verify-full.md"],
      consumer: ["commands/spec-merge.md"],
    },
    {
      token: "commit_sha",
      producer: ["commands/implement.md"],          // task_log[].commit_sha
      consumer: ["commands/verify-full.md", "commands/sync-verify.md"],  // provenance / reverse-index
    },
    {
      token: "produced_by",
      producer: ["docs/policy.md"],                 // distinct-approver rule defines write
      consumer: ["docs/policy.md"],                 // and reads it (approved_by != produced_by)
    },
    {
      token: "reviewed_by_model",
      producer: ["commands/code-review.md"],        // stamped on the gate entry when --cross-model ran
      consumer: ["docs/templates/gate-review.md"],  // gate surface documents/reads the cross-model stamp
    },
    {
      token: "cross_model_findings",
      producer: ["commands/code-review.md"],        // count stamped on the gate entry
      consumer: ["docs/schema/forge-status-v3.schema.yml"],  // canonical gates[] shape declares it
    },
    {
      token: "skills_promoted",
      producer: ["commands/retrospective.md"],      // Step 5B writes the promoted skill names
      consumer: ["commands/retrospective.md"],      // Step 5B item 4 reads it back for patch-vs-create idempotency
    },
  ];
  for (const cf of CARRIER_FIELDS) {
    const mentions = (f) => exists(R(f)) && read(R(f)).includes(cf.token);
    const prod = cf.producer.filter(mentions);
    const cons = cf.consumer.filter(mentions);
    if (prod.length === 0) {
      add("CARRIER", "error", cf.producer[0], `carrier field "${cf.token}" has no producer that names it (expected in ${cf.producer.join(" / ")}) — written by nobody?`);
    }
    if (cons.length === 0) {
      add("CARRIER", "error", cf.consumer[0], `carrier field "${cf.token}" has no consumer that names it (expected in ${cf.consumer.join(" / ")}) — read by nobody (callout-deep)?`);
    }
  }

  // ── PHASEMAP: forge.md Phase Map row count vs claims ───────────────────────
  let phaseMapRows = null;
  if (exists(R("commands/forge.md"))) {
    const txt = read(R("commands/forge.md"));
    const i = txt.indexOf("## Phase Map (standard mode)");
    if (i >= 0) {
      const j = txt.indexOf("\n## ", i + 5);
      const block = txt.slice(i, j > 0 ? j : txt.length);
      phaseMapRows = lines(block).filter((l) => /^\|\s*\d/.test(l)).length;
    }
  }
  if (phaseMapRows) {
    const claimRe = /Phase Map (?:has|=)\s*(\d{1,2})\s*rows|(\d{1,2})\s+phase\s+slots|(\d{1,2})\s+rows/gi;
    for (const f of corpus) {
      const txt = read(f);
      let m;
      while ((m = claimRe.exec(txt)) !== null) {
        const n = parseInt(m[1] || m[2] || m[3], 10);
        if (n >= 10 && n <= 30 && n !== phaseMapRows) {
          add("PHASEMAP", "warn", rel(f), `claims ${n} phase rows; forge.md Phase Map has ${phaseMapRows}`);
        }
      }
    }
  }

  // ── PHASEMAP single-source: docs/schema/phase-map.yml ↔ forge.md tables ────
  // phase-map.yml is the canonical phase set + per-mode applicability (step 3 of
  // the schema-as-source design note). Assert the two forge.md tables render it
  // faithfully: (1) the standard-mode "Phase Map" lists exactly the canonical
  // phase ids; (2) the "Phase execution map by mode" cells match each phase's
  // declared modes. Adding/removing a phase or changing a mode in the data then
  // fails until the rendered tables agree.
  const pmPath = R("docs/schema/phase-map.yml");
  if (parseYaml && exists(pmPath) && exists(R("commands/forge.md"))) {
    let pm = null;
    try { pm = parseYaml(read(pmPath)); } catch { add("PHASEMAP", "error", "docs/schema/phase-map.yml", "does not parse as YAML"); }
    const canon = (pm && Array.isArray(pm.phases)) ? pm.phases : null;
    if (canon) {
      const forge = read(R("commands/forge.md"));
      const canonIds = canon.map((p) => String(p.id));
      // id extractor for a table row's first cell, e.g. "2H. Design System…" → "2H"
      const idOf = (cell) => { const m = cell.match(/^\s*([0-9]+(?:\.[0-9]+)?[A-Z]?)\.\s/); return m ? m[1] : null; };
      // (1) standard-mode Phase Map: canonical count + every id present
      if (phaseMapRows !== null && phaseMapRows !== canonIds.length) {
        add("PHASEMAP", "warn", "commands/forge.md", `standard-mode Phase Map has ${phaseMapRows} rows but phase-map.yml declares ${canonIds.length} phases`);
      }
      const stdStart = forge.indexOf("## Phase Map (standard mode)");
      if (stdStart >= 0) {
        const stdBlock = forge.slice(stdStart, forge.indexOf("\n## ", stdStart + 5));
        const stdIds = new Set(lines(stdBlock).filter((l) => l.startsWith("|")).map((l) => idOf(l.split("|")[1] || "")).filter(Boolean));
        for (const id of canonIds) if (!stdIds.has(id)) add("PHASEMAP", "warn", "commands/forge.md", `phase '${id}' is in phase-map.yml but missing from the standard-mode Phase Map table`);
      }
      // (2) per-mode table cells ↔ phase-map.yml modes
      const modeStart = forge.indexOf("### Phase execution map by mode");
      if (modeStart >= 0) {
        const modeBlock = forge.slice(modeStart, forge.indexOf("\n## ", modeStart + 5));
        // Classify a rendered cell. Symbol vocabulary (✅/opt/—) is what the real
        // tables use; also accept the word forms so a typo'd cell is judged, not
        // skipped. Returns null only for a truly empty cell.
        const cellVal = (c) => {
          const t = c.trim();
          if (t === "") return "";                       // empty cell — explicit, see below
          if (/✅/.test(t) || /\byes\b/i.test(t)) return "yes";
          if (/\bopt\b/i.test(t)) return "opt";
          if (/—/.test(t) || /\bno\b/i.test(t) || /^-+$/.test(t)) return "no";
          return "?";                                    // non-empty but unclassifiable
        };
        const rowById = {};
        for (const l of lines(modeBlock)) {
          if (!l.startsWith("|")) continue;
          const cells = l.split("|").slice(1, -1).map((c) => c.trim());
          const id = idOf(cells[0] || "");
          if (id) rowById[id] = cells;
        }
        const modeOrder = ["express", "lite", "standard", "v-model"];
        for (const p of canon) {
          const cells = rowById[String(p.id)];
          if (!cells) { add("PHASEMAP", "warn", "commands/forge.md", `phase '${p.id}' missing from the per-mode table (in phase-map.yml)`); continue; }
          modeOrder.forEach((mode, k) => {
            const rendered = cellVal(cells[k + 1] || "");
            const declared = p.modes && p.modes[mode];
            if (!declared) return;
            // An empty or unclassifiable cell that should carry a declared value
            // is itself a finding — don't let a blanked cell pass silently.
            if (rendered === "" || rendered === "?") {
              add("PHASEMAP", "warn", "commands/forge.md", `phase '${p.id}' ${mode}: cell is ${rendered === "" ? "empty" : "unclassifiable (\"" + (cells[k + 1] || "").trim() + "\")"} but phase-map.yml declares '${declared}'`);
            } else if (rendered !== declared) {
              add("PHASEMAP", "warn", "commands/forge.md", `phase '${p.id}' ${mode}: table shows '${rendered}' but phase-map.yml declares '${declared}'`);
            }
          });
        }
      }
    }
  }

  // ── LAYER-COUNT: sync-verify / verify-full layer-count parity ──────────────
  // Each command DEFINES its layers as "### Layer N: …" headings; prose all over
  // the corpus then claims "N-layer" / "all N layers". A mismatch is the same
  // drift class as command-count (P1-C added Layer 10/11 and several prose
  // sites). Source of truth = the max defined "Layer N" heading in the command.
  const layerOwners = [
    { file: "commands/sync-verify.md", label: "sync-verify" },
    { file: "commands/verify-full.md", label: "verify-full" },
  ];
  for (const owner of layerOwners) {
    const p = R(owner.file);
    if (!exists(p)) continue;
    const defined = [...read(p).matchAll(/^#{2,4}\s+Layer\s+(\d{1,2})\b/gm)].map((m) => parseInt(m[1], 10));
    if (!defined.length) continue;
    const maxLayer = Math.max(...defined);
    // "N-layer" / "N layer" / "all N layers" claims anywhere in the corpus that
    // sit near this owner's name (same line) must equal its max defined layer.
    const claimRe = /(\d{1,2})[ -]layers?\b|all\s+(\d{1,2})\s+layers\b/gi;
    for (const f of corpus) {
      if (/CHANGELOG\.md$/.test(f)) continue;   // CHANGELOG documents past layer counts (history, not drift)
      for (const line of lines(read(f))) {
        // Only judge a line that names THIS owner. If it names BOTH owners (e.g.
        // "verify-full extends sync-verify's layers"), attribution is ambiguous
        // and a count would be mis-charged to one of them — skip it.
        if (!new RegExp(owner.label).test(line)) continue;
        if (/sync-verify/.test(line) && /verify-full/.test(line)) continue;
        let m;
        claimRe.lastIndex = 0;
        while ((m = claimRe.exec(line)) !== null) {
          const n = parseInt(m[1] || m[2], 10);
          if (n >= 5 && n <= 30 && n !== maxLayer) {
            add("LAYER-COUNT", "warn", rel(f), `${owner.label} claims ${n} layers but it defines ${maxLayer} (max "Layer N" heading): "${line.trim().slice(0, 70)}"`);
          }
        }
      }
    }
  }

  // ── CONFIG-READER: every documented config key has a reader ────────────────
  // A "reader" is a command file body OR an orchestrator-level normative doc
  // (policy.md / runtime.md) that names the key — those docs ARE where the
  // orchestrator's config-driven behaviour is specified. A key named nowhere is
  // a dead switch (the a11y_gate class).
  const tmpl = exists(R("config-template.yml")) ? read(R("config-template.yml")) : "";
  const readerBlob = [
    cmdFiles.map(read).join("\n"),
    exists(R("docs/policy.md")) ? read(R("docs/policy.md")) : "",
    exists(R("docs/runtime.md")) ? read(R("docs/runtime.md")) : "",
  ].join("\n");
  const keyRe = /^([a-z][a-z0-9_]+):/gm;
  const ignore = new Set(["codebase", "telemetry", "sync_verify", "design_system", "supply_chain"]); // nested handled separately
  const declared = new Set();
  let km;
  while ((km = keyRe.exec(tmpl)) !== null) declared.add(km[1]);
  // Stylistic prompt-default keys whose value feeds an LLM prompt default rather
  // than being read by a literal key-name grep (e.g. default_wireframe_detail →
  // WIREFRAME_DETAIL in product-spec). Identity keys used only in prompts too.
  const readerExempt = new Set([
    "project_name", "project_tech_stack", "project_domain",
    "max_tokens_per_doc", "output_language", "default_competitors",
    "default_tech_research", "default_metrics_research",
    "default_wireframe_detail", "default_mockup_style",
  ]);
  for (const key of declared) {
    if (ignore.has(key) || readerExempt.has(key)) continue;
    if (!new RegExp(`\\b${key}\\b`).test(readerBlob)) {
      add("CONFIG-READER", "warn", "config-template.yml", `config key '${key}' is documented but no command/orchestrator-doc reads it (dead switch?)`);
    }
  }

  // ── SCRIPT-PATH: no bare-relative node script invocation in commands ───────
  // Per-OCCURRENCE, not per-file: a file that correctly uses ${PLUGIN_ROOT} for
  // one call must still be flagged for a DIFFERENT bare `node scripts/…` call
  // elsewhere in it. The correct form `node ${PLUGIN_ROOT}/scripts/…` does not
  // match the bare regex at all; the only legitimate bare form is
  // `cd ${PLUGIN_ROOT} && node scripts/…` — so exempt only when the PLUGIN_ROOT
  // token is on the SAME line as the bare invocation (tightest correct rule).
  const bareLineRe = /node\s+scripts\//;
  const requireLineRe = /require\((['"])\.\/scripts\//;
  const pluginRootToken = /\$\{?PLUGIN_ROOT|\$\{?CLAUDE_PLUGIN_ROOT|specify extension path/;
  for (const f of cmdFiles) {
    const ls = lines(read(f));
    const bad = [];
    for (let i = 0; i < ls.length; i++) {
      if (!bareLineRe.test(ls[i]) && !requireLineRe.test(ls[i])) continue;
      if (pluginRootToken.test(ls[i])) continue;   // same-line cd ${PLUGIN_ROOT} && node scripts/…
      bad.push(i + 1);
    }
    if (bad.length) {
      add("SCRIPT-PATH", "error", rel(f),
        `invokes a bundled script by bare relative path (lines ${bad.join(", ")}) — won't resolve from the plugin cache; route through \${PLUGIN_ROOT}`);
    }
  }

  // ── ID-FORMAT: task-id form consistency ────────────────────────────────────
  // Canonical task-id is T0NN (tasks.md + schema). The ID registry may keep a
  // `TASK-` row ONLY if it also states the canonical `T0NN` form (alias note);
  // a bare `TASK-` row with no T0NN/T<int> canonicalization is the drift.
  const idHome = R("docs/schema.md");
  if (exists(idHome)) {
    const txt = read(idHome);
    if (/\|\s*`TASK-`/.test(txt) && !/T0NN|T<int>|`T001`/.test(txt)) {
      add("ID-FORMAT", "warn", "docs/schema.md", "ID registry lists prefix `TASK-` but never states the canonical `T0NN` form; tasks.md/schema.yml emit `T001`");
    }
    // also flag the legacy TASK-012 form appearing as a task id in templates
  }
  for (const f of [R("docs/templates/traceability-matrix.md"), R("commands/verify-full.md")].filter(exists)) {
    if (/\bTASK-\d/.test(read(f))) {
      add("ID-FORMAT", "warn", rel(f), "uses legacy `TASK-NNN` task-id form; canonical is `T0NN` (e.g. T012)");
    }
  }

  return findings;
}

// ── CLI ──────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const o = { json: false, selftest: false, root: process.cwd() };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") o.json = true;
    else if (a === "--selftest") o.selftest = true;
    else if (a === "--root") o.root = path.resolve(argv[++i]);
    else if (a === "--help" || a === "-h") { printHelp(); process.exit(0); }
    else { console.error("Unknown argument: " + a); process.exit(2); }
  }
  return o;
}

function printHelp() {
  console.log([
    "Usage: node scripts/lint-docs.js [--json] [--root <repo-root>]",
    "       node scripts/lint-docs.js --selftest",
    "",
    "Deterministic consistency-linter over the Product Forge doc corpus.",
    "Rules: XREF, CMD-COUNT, VERSION, ENUM, PHASEMAP, CONFIG-READER, SCRIPT-PATH, ID-FORMAT.",
    "Exit 0 = clean, 1 = findings, 2 = usage/IO error.",
  ].join("\n"));
}

function emit(o, findings) {
  if (o.json) { console.log(JSON.stringify({ findings, count: findings.length }, null, 2)); return; }
  if (findings.length === 0) { console.log("✅ lint-docs: clean — no consistency findings"); return; }
  const byRule = {};
  for (const f of findings) (byRule[f.rule] ||= []).push(f);
  for (const rule of Object.keys(byRule).sort()) {
    console.log(`\n## ${rule} (${byRule[rule].length})`);
    for (const f of byRule[rule]) {
      const icon = f.severity === "error" ? "❌" : "⚠️ ";
      console.log(`  ${icon} ${f.file}: ${f.msg}`);
    }
  }
  const errs = findings.filter((f) => f.severity === "error").length;
  console.log(`\nlint-docs: ${findings.length} finding(s) — ${errs} error, ${findings.length - errs} warn`);
}

// ── self-test (fixture tree) ──────────────────────────────────────────────────
function selftest() {
  const os = require("node:os");
  let pass = 0, fail = 0;
  const assert = (c, n) => { if (c) pass++; else { fail++; console.error("  ✗ " + n); } };

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pf-lint-"));
  const W = (p, c) => { fs.mkdirSync(path.dirname(path.join(tmp, p)), { recursive: true }); fs.writeFileSync(path.join(tmp, p), c); };
  try {
    // a clean-ish minimal tree
    W("extension.yml", 'version: "1.6.0"\nprovides:\n  commands:\n    - name: "speckit.product-forge.forge"\n      file: "commands/forge.md"\n');
    W(".claude-plugin/plugin.json", '{"version":"1.6.0"}');
    W("commands/forge.md", "---\nname: speckit.product-forge.forge\n---\n## Phase Map (standard mode)\n| 1 | a |\n| 2 | b |\n## Next\n");
    W("config-template.yml", 'project_name: "x"\nsome_used_key: "v"\ndead_key: "v"\n');
    W("README.md", "ok\n");
    let fnd = lint(tmp);
    // dead_key has no reader → CONFIG-READER warn; some_used_key referenced below
    W("commands/forge.md", read(path.join(tmp, "commands/forge.md")) + "\nreads some_used_key here\n");
    fnd = lint(tmp);
    assert(fnd.some((f) => f.rule === "CONFIG-READER" && /dead_key/.test(f.msg)), "detects dead config key");
    assert(!fnd.some((f) => f.rule === "CONFIG-READER" && /some_used_key/.test(f.msg)), "does not flag a read key");

    // version mismatch
    W(".claude-plugin/plugin.json", '{"version":"1.5.0"}');
    assert(lint(tmp).some((f) => f.rule === "VERSION" && /!=/.test(f.msg)), "detects version mismatch");
    W(".claude-plugin/plugin.json", '{"version":"1.6.0"}');

    // bare script path
    W("commands/verify.md", "---\nname: speckit.product-forge.verify\n---\nRun `node scripts/x.js --json`\n");
    // extension has only 1 cmd entry but now 2 files → CMD-COUNT, plus SCRIPT-PATH
    let f2 = lint(tmp);
    assert(f2.some((f) => f.rule === "SCRIPT-PATH"), "detects bare relative script path");
    assert(f2.some((f) => f.rule === "CMD-COUNT"), "detects command count mismatch");

    // PLUGIN_ROOT form is NOT flagged
    W("commands/verify.md", "---\nname: speckit.product-forge.verify\n---\nRun `node ${PLUGIN_ROOT}/scripts/x.js`\n");
    assert(!lint(tmp).some((f) => f.rule === "SCRIPT-PATH"), "PLUGIN_ROOT form passes");

    // dangling xref + escape
    W("docs/a.md", "see [b](../docs/missing.md) and [up](../../evil.md)\n");
    const f3 = lint(tmp);
    assert(f3.some((f) => f.rule === "XREF" && /dangling/.test(f.msg)), "detects dangling xref");
    assert(f3.some((f) => f.rule === "XREF" && /escapes/.test(f.msg)), "detects plugin-root escape");

    // stale version narrative
    W("docs/c.md", "v1.5 adds a thing\n");
    assert(lint(tmp).some((f) => f.rule === "VERSION" && /stale/.test(f.msg)), "detects stale vN.N adds");

    // ENUM single-source: a schema enums.yml + a doc site that omits a member.
    W("docs/schema/enums.yml", "enums:\n  feature_mode:\n    values: [\"express\", \"lite\", \"standard\", \"v-model\"]\n");
    W("docs/schema/forge-status-v3.schema.yml", 'phases:\n  implement:\n    status: "x"\n# Valid values: "express" | "lite" | "standard"\n'); // missing v-model
    assert(lint(tmp).some((f) => f.rule === "ENUM" && /feature_mode.*missing 'v-model'/.test(f.msg)),
      "ENUM detects a missing canonical member at an anchored site");
    // fix it → no ENUM finding for that site
    W("docs/schema/forge-status-v3.schema.yml", 'phases:\n  implement:\n    status: "x"\n# Valid values: "express" | "lite" | "standard" | "v-model"\n');
    assert(!lint(tmp).some((f) => f.rule === "ENUM" && /schema\.yml/.test(f.file) && /missing/.test(f.msg)),
      "ENUM passes when the site lists the full canonical set");

    // GATE-POLICY: bad action value + unknown phase key.
    W("docs/templates/gate-policy.yml", "version: 1\ndefaults:\n  low: auto-recommend\n  medium: require-human\n  high: nuke\nphases:\n  implement:\n    low: auto-recommend\n  not_a_phase:\n    low: block\n");
    W("docs/schema/enums.yml", read(path.join(tmp, "docs/schema/enums.yml")) +
      "  gate_policy_action:\n    values: [\"auto-recommend\", \"require-human\", \"block\"]\n");
    const gpf = lint(tmp);
    assert(gpf.some((f) => f.rule === "GATE-POLICY" && /nuke.*not a valid action/.test(f.msg)), "GATE-POLICY detects invalid action");
    assert(gpf.some((f) => f.rule === "GATE-POLICY" && /not_a_phase.*not a known phase/.test(f.msg)), "GATE-POLICY detects unknown phase key");

    // CARRIER: a field with a producer but no consumer.
    // The lint registry is hard-coded against real repo files; in the fixture
    // those files don't exist, so every carrier reports both ends missing.
    // Assert the rule FIRES (producer-missing) — proving it's wired — without
    // depending on the fixture having the real command files.
    assert(lint(tmp).some((f) => f.rule === "CARRIER"), "CARRIER rule fires when carrier files are absent");

    // LAYER-COUNT: a command defines Layers 1..N; a prose claim of a different
    // count on a line naming that command is drift.
    W("commands/sync-verify.md", "---\nname: speckit.product-forge.sync-verify\n---\n### Layer 1: a\n### Layer 2: b\n### Layer 3: c\nRun the full sync-verify 9-layer scan.\n");
    const lc = lint(tmp);
    assert(lc.some((f) => f.rule === "LAYER-COUNT" && /claims 9 layers but it defines 3/.test(f.msg)), "LAYER-COUNT detects a mismatched layer claim");
    // matching claim → no finding
    W("commands/sync-verify.md", "---\nname: speckit.product-forge.sync-verify\n---\n### Layer 1: a\n### Layer 2: b\n### Layer 3: c\nRun the full sync-verify 3-layer scan.\n");
    assert(!lint(tmp).some((f) => f.rule === "LAYER-COUNT"), "LAYER-COUNT passes when the claim matches the definition");

    // PHASEMAP single-source: phase-map.yml ↔ forge.md per-mode table.
    W("docs/schema/phase-map.yml", "phases:\n  - id: \"1\"\n    name: R\n    modes: { express: no, lite: no, standard: yes, v-model: yes }\n  - id: \"2\"\n    name: P\n    modes: { express: yes, lite: yes, standard: yes, v-model: yes }\n");
    // forge table that AGREES → no PHASEMAP mode finding
    W("commands/forge.md", [
      "---", "name: speckit.product-forge.forge", "---",
      "## Phase Map (standard mode)",
      "| Phase | Command |", "|---|---|",
      "| 1. R | x |", "| 2. P | y |",
      "## Mode", "### Phase execution map by mode",
      "| Phase | express | lite | standard | v-model |",
      "|---|---|---|---|---|",
      "| 1. R | — | — | ✅ | ✅ |",
      "| 2. P | ✅ | ✅ | ✅ | ✅ |",
      "## End", "",
    ].join("\n"));
    assert(!lint(tmp).some((f) => f.rule === "PHASEMAP" && /declares/.test(f.msg)), "PHASEMAP passes when forge tables match phase-map.yml");
    // now break one cell (phase 1 express ✅ but data says no) → finding
    W("commands/forge.md", [
      "---", "name: speckit.product-forge.forge", "---",
      "## Phase Map (standard mode)",
      "| Phase | Command |", "|---|---|",
      "| 1. R | x |", "| 2. P | y |",
      "## Mode", "### Phase execution map by mode",
      "| Phase | express | lite | standard | v-model |",
      "|---|---|---|---|---|",
      "| 1. R | ✅ | — | ✅ | ✅ |",
      "| 2. P | ✅ | ✅ | ✅ | ✅ |",
      "## End", "",
    ].join("\n"));
    assert(lint(tmp).some((f) => f.rule === "PHASEMAP" && /phase '1' express/.test(f.msg)), "PHASEMAP detects a per-mode cell that disagrees with phase-map.yml");

    // PHASEMAP regression (review R1#3): an EMPTY or word-form cell that should
    // carry a declared value must be a finding, not silently skipped.
    W("commands/forge.md", [
      "---", "name: speckit.product-forge.forge", "---",
      "## Phase Map (standard mode)",
      "| Phase | Command |", "|---|---|",
      "| 1. R | x |", "| 2. P | y |",
      "## Mode", "### Phase execution map by mode",
      "| Phase | express | lite | standard | v-model |",
      "|---|---|---|---|---|",
      "| 1. R | — | — |   | ✅ |",          // standard blank, data says yes
      "| 2. P | ✅ | ✅ | ✅ | no |",         // v-model word 'no', data says yes
      "## End", "",
    ].join("\n"));
    const pmEdge = lint(tmp);
    assert(pmEdge.some((f) => f.rule === "PHASEMAP" && /phase '1' standard: cell is empty/.test(f.msg)), "PHASEMAP flags an empty cell that should carry a value");
    assert(pmEdge.some((f) => f.rule === "PHASEMAP" && /phase '2' v-model/.test(f.msg)), "PHASEMAP judges a word-form cell ('no' vs declared yes)");

    // LAYER-COUNT regression (review R1#2): a line naming BOTH owners must be
    // skipped (ambiguous attribution), not mis-charged to one owner.
    W("commands/sync-verify.md", "---\nname: speckit.product-forge.sync-verify\n---\n### Layer 1: a\n### Layer 2: b\n### Layer 3: c\n");
    W("commands/verify-full.md", "---\nname: speckit.product-forge.verify-full\n---\n### Layer 1: a\n### Layer 2: b\n");
    W("docs/both.md", "The verify-full pass runs 2 layers; it extends the sync-verify 3 layers with a check.\n");
    assert(!lint(tmp).some((f) => f.rule === "LAYER-COUNT"), "LAYER-COUNT skips a line that names both owners (no false positive)");
    fs.rmSync(path.join(tmp, "docs/both.md"));
    fs.rmSync(path.join(tmp, "commands/verify-full.md"));

    // SCRIPT-PATH regression (review R1#4): a bare `node scripts/…` must be
    // flagged even in a file that ALSO uses ${PLUGIN_ROOT} correctly elsewhere.
    W("commands/mixed.md", "---\nname: speckit.product-forge.mixed\n---\nGood: `node ${PLUGIN_ROOT}/scripts/ok.js`\nBad: `node scripts/evil.js --json`\n");
    assert(lint(tmp).some((f) => f.rule === "SCRIPT-PATH" && /commands\/mixed\.md/.test(f.file)), "SCRIPT-PATH flags a bare call even when the file also uses ${PLUGIN_ROOT}");
    // same-line cd ${PLUGIN_ROOT} && node scripts/… is exempt
    W("commands/mixed.md", "---\nname: speckit.product-forge.mixed\n---\nRun: `cd ${PLUGIN_ROOT} && node scripts/ok.js`\n");
    assert(!lint(tmp).some((f) => f.rule === "SCRIPT-PATH" && /commands\/mixed\.md/.test(f.file)), "SCRIPT-PATH exempts a same-line cd ${PLUGIN_ROOT} && node scripts/ form");
    fs.rmSync(path.join(tmp, "commands/mixed.md"));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log(`\nselftest: ${pass} passed, ${fail} failed`);
  return fail === 0 ? 0 : 1;
}

function main() {
  const o = parseArgs(process.argv);
  if (o.selftest) process.exit(selftest());
  let findings;
  try { findings = lint(o.root); }
  catch (e) { console.error("lint-docs error: " + (e && e.message)); process.exit(2); }
  emit(o, findings);
  process.exit(findings.some((f) => f.severity === "error") ? 1 : (findings.length ? 1 : 0));
}

if (require.main === module) main();
module.exports = { lint };
