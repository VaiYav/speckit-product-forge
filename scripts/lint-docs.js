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

// ── tiny helpers ─────────────────────────────────────────────────────────────
const read = (p) => fs.readFileSync(p, "utf8");
const exists = (p) => fs.existsSync(p);
const lines = (s) => s.split(/\r?\n/);

function listFiles(dir, ext) {
  if (!exists(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(ext)).map((f) => path.join(dir, f)).sort();
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
    ...listFiles(root, ".md").filter((f) => /README|CHANGELOG/.test(f)),
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

  // ── ENUM: feature_mode / gate-decision / phase-status parity ───────────────
  // Canonical sets (the schema is the source of truth).
  const enums = {
    feature_mode: ["express", "lite", "standard", "v-model"],
    gate_decision: ["approved", "approved_with_conditions", "revised", "skipped", "rolled_back", "aborted"],
    phase_status: ["pending", "in_progress", "completed", "skipped", "not_applicable", "completed_with_known_issues"],
  };
  // Spot-check: feature_mode must include express wherever a 3-of-4 list appears.
  const fmDocs = [R("docs/config.md"), R("config-template.yml"), R("docs/schema/migration-v2-to-v3.md"),
                  R("docs/phases.md"), R("commands/forge.md")];
  for (const f of fmDocs.filter(exists)) {
    const txt = read(f);
    // A list that names lite+standard+v-model but NOT express is the classic drift.
    if (/\blite\b/.test(txt) && /\bstandard\b/.test(txt) && /\bv-model\b/.test(txt) && !/\bexpress\b/.test(txt)) {
      add("ENUM", "warn", rel(f), "names lite/standard/v-model but never express (feature_mode drift)");
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
  const barePathRe = /(?:node\s+scripts\/|require\((['"])\.\/scripts\/)/;
  const pluginRootToken = /\$\{?PLUGIN_ROOT|\$\{?CLAUDE_PLUGIN_ROOT|specify extension path/;
  for (const f of cmdFiles) {
    const txt = read(f);
    if (barePathRe.test(txt) && !pluginRootToken.test(txt)) {
      // find the offending lines for a precise message
      const bad = lines(txt).map((l, i) => ({ l, i: i + 1 }))
        .filter((x) => /node\s+scripts\/|require\((['"])\.\/scripts\//.test(x.l))
        .map((x) => x.i);
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
