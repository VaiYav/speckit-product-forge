#!/usr/bin/env node
// scripts/validate-traceability.js
//
// Wave 5 (W5-A1) — deterministic validate-traceability / spec-lint backbone.
//
// A zero-dependency, CI-friendly STRUCTURAL validator over a feature's
// `traceability.yml` (+ optional `product-spec/journeys/journeys.yml`,
// `spec.md`, `tasks.md`). It fronts the LLM `verify-full` layers as a hard
// pre-gate: it answers the deterministic half of "is the chain complete?"
// (every must-have requirement reaches a task/code/test; no orphan task; no
// null link past the phase that owns it; every Must-Have journey + P0/P1 edge
// has a test; every NFR has a measurable signal) so the LLM layers can focus on
// the semantic half ("is this AC genuinely measurable / correct").
//
// Honesty boundary (matches docs/improvements/2026-05-wave5-roadmap.md A1):
//   - STRUCTURAL checks here are deterministic (presence / linkage / shape).
//   - SEMANTIC checks (is an AC truly measurable, is coverage complete in
//     meaning) stay in the LLM verify-full / code-review layers. This script
//     never claims to judge meaning.
//
// Usage:
//   node scripts/validate-traceability.js --feature-dir features/<slug> [--strict] [--json]
//   node scripts/validate-traceability.js --feature <slug> [--features-dir features]
//   node scripts/validate-traceability.js --selftest
//
// Exit codes:
//   0  clean (no errors; warnings allowed unless --strict)
//   1  validation failed (>=1 error, or any warning under --strict)
//   2  usage error / unreadable inputs
//
// Phase-awareness: reads `.forge-status.yml` (best-effort, line-oriented) to
// learn which phases are completed, so a null `code`/`tests` column is only an
// ERROR once the phase that fills it (implement / test-run) has completed.
// Before then it is informational, not a failure.

"use strict";

const fs = require("node:fs");
const path = require("node:path");

// ───────────────────────────────────────────────────────────────────────────
// YAML subset parser (shared, zero-dep) — see scripts/lib-yaml.js
// ───────────────────────────────────────────────────────────────────────────

const { parseYaml } = require("./lib-yaml");
const { resolveOrExit } = require("./lib-paths");

// ───────────────────────────────────────────────────────────────────────────
// Findings
// ───────────────────────────────────────────────────────────────────────────

function makeReporter() {
  const findings = [];
  return {
    error: (rule, msg) => findings.push({ severity: "error", rule, msg }),
    warn: (rule, msg) => findings.push({ severity: "warning", rule, msg }),
    findings,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Status-file phase awareness (line-oriented, best-effort)
// ───────────────────────────────────────────────────────────────────────────

function readCompletedPhases(featureDir) {
  const completed = new Set();
  const p = path.join(featureDir, ".forge-status.yml");
  if (!fs.existsSync(p)) return completed;
  const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);
  let currentPhase = null;
  for (const line of lines) {
    // phases:\n  <name>:\n    status: "completed"
    const phaseHeader = line.match(/^  ([a-z0-9_]+):\s*$/);
    if (phaseHeader) { currentPhase = phaseHeader[1]; continue; }
    const statusInline = line.match(/^  ([a-z0-9_]+):\s*"?(completed|approved|completed_with_known_issues|tested|verified)"?\s*$/);
    if (statusInline) { completed.add(statusInline[1]); continue; }
    const statusLine = line.match(/^    status:\s*"?(completed|approved|completed_with_known_issues)"?\s*$/);
    if (statusLine && currentPhase) completed.add(currentPhase);
    if (/^[a-z]/.test(line)) currentPhase = null; // left the phases block
  }
  return completed;
}

// ───────────────────────────────────────────────────────────────────────────
// Checks
// ───────────────────────────────────────────────────────────────────────────

const WEAK_WORDS = [
  "fast", "slow", "quick", "scalable", "secure", "robust", "efficient",
  "user-friendly", "intuitive", "adequate", "appropriate", "proper",
  "reasonable", "acceptable", "minimal", "maximal", "minimize", "maximize",
  "optimize", "as needed", "if necessary", "etc", "and so on", "tbd",
  "several", "some", "many", "usually", "maybe", "approximately",
];

function nonEmptyList(v) { return Array.isArray(v) && v.length > 0; }

function checkTraceability(tr, completed, rep) {
  if (!tr || typeof tr !== "object") {
    rep.error("schema", "traceability.yml did not parse into a mapping");
    return;
  }
  const rows = Array.isArray(tr.rows) ? tr.rows : [];
  if (rows.length === 0) rep.warn("rows", "traceability.yml has no rows[] — nothing to check yet");

  const implementDone = completed.has("implement");
  const testDone = completed.has("test_run");

  const seenTasks = new Set();
  for (const row of rows) {
    if (!row || typeof row !== "object") { rep.error("rows", "a row is not a mapping"); continue; }
    const id = row.req || row.story || JSON.stringify(row).slice(0, 40);
    if (!row.req) rep.warn("row.req", `row ${id} has no req id (canonical/FR-* link)`);
    const mustHave = row.must_have === true;

    // tasks present (always expected once a row exists post-Phase-5B)
    if (mustHave && !nonEmptyList(row.tasks)) {
      rep.error("must_have.tasks", `must_have row ${id} has no tasks[]`);
    }
    // code present once implement completed
    if (mustHave && implementDone && !nonEmptyList(row.code)) {
      rep.error("must_have.code", `must_have row ${id} has no code[] but implement is completed`);
    }
    // tests present once test_run completed
    if (mustHave && testDone && !nonEmptyList(row.tests)) {
      rep.error("must_have.tests", `must_have row ${id} has no tests[] but test_run is completed`);
    }
    for (const t of (row.tasks || [])) seenTasks.add(String(t));
  }

  // Journeys: every journey -> >=1 test; every P0/P1 edge -> >=1 test.
  const journeys = Array.isArray(tr.journeys) ? tr.journeys : [];
  for (const j of journeys) {
    if (!j || typeof j !== "object") continue;
    const jid = j.id || "JRN-?";
    const jTests = nonEmptyList(j.tests);
    const edges = Array.isArray(j.edges) ? j.edges : [];
    // journey-level coverage (only enforced once testing ran). A journey with
    // its own edges still needs at least one journey-level test; edge coverage
    // is checked separately in the loop below, so do NOT skip when edges exist.
    if (testDone && !jTests) {
      rep.error("journey.tests", `journey ${jid} has no tests[] but test_run is completed`);
    }
    for (const e of edges) {
      // edge may be a flow object {id, priority, tests} (per CF-19) or a bare id string
      if (e && typeof e === "object") {
        const eid = e.id || "EDGE-?";
        const pr = String(e.priority || "").toUpperCase();
        const hasTest = nonEmptyList(e.tests);
        // The tests[] column is filled by test-plan/test-run, so a missing test
        // is only an ERROR once test_run has completed (phase-aware, matches
        // verify-full Layer 7 which runs after the testing phases). Before that
        // it is a planning warning.
        if (!hasTest) {
          if (testDone && (pr === "P0" || pr === "P1")) {
            rep.error("edge.tests", `${pr} edge ${eid} (journey ${jid}) has no tests[] but test_run is completed`);
          } else {
            rep.warn("edge.tests", `edge ${eid} (journey ${jid}) has no tests[]${pr ? " (" + pr + ")" : " (no priority)"}`);
          }
        }
      }
      // bare-id edges can't carry priority/tests → can't be checked here (warn once below)
    }
    if (edges.some((e) => typeof e === "string")) {
      rep.warn("edge.shape", `journey ${jid} has bare-string edges; use {id, priority, tests} objects so P0/P1 coverage is checkable (CF-19)`);
    }
  }

  return { seenTasks };
}

function checkTasksMd(featureDir, seenTasks, rep) {
  // Orphan-task detection: a task id in tasks.md that no traceability row references.
  const p = path.join(featureDir, "tasks.md");
  if (!fs.existsSync(p) || !seenTasks) return;
  const text = fs.readFileSync(p, "utf8");
  // Accept every documented task-id form: T001, T-001, TASK-001, TASK009.
  const re = /^\s*-\s*\[[ xX]\]\s*((?:TASK|T)-?\d{1,4})\b/gm;
  // Canonicalize to `T<int>` (strip prefix + leading zeros) and compare by
  // EXACT equality. Substring matching mis-fires (T1 spuriously matches T10/T100).
  const normTask = (s) => {
    const mm = String(s).toUpperCase().match(/^(?:TASK|T)-?0*(\d+)$/);
    return mm ? "T" + mm[1] : String(s).toUpperCase();
  };
  const referencedIds = new Set([...seenTasks].map(normTask));
  const ids = new Set();
  let m;
  while ((m = re.exec(text)) !== null) ids.add(m[1]);
  for (const id of ids) {
    if (!referencedIds.has(normTask(id))) {
      rep.warn("orphan.task", `task ${id} in tasks.md is not referenced by any traceability row`);
    }
  }
}

function checkSpecLint(featureDir, rep) {
  // spec-lint riders: NFR-without-signal + weak-word lint over spec.md FR/NFR/AC text.
  const p = path.join(featureDir, "spec.md");
  if (!fs.existsSync(p)) return;
  const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);
  let inNfrContract = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^##+\s+NFR Measurement Contract/i.test(line)) { inNfrContract = true; continue; }
    if (/^##+\s/.test(line) && inNfrContract && !/NFR Measurement Contract/i.test(line)) inNfrContract = false;
    // NFR table rows: | NFR | How | Signal | Threshold |
    if (inNfrContract && /^\|/.test(line) && !/^\|\s*-+/.test(line) && !/How to Measure|^\|\s*NFR\b/i.test(line)) {
      const cells = line.split("|").map((c) => c.trim()).filter((_, idx, a) => idx > 0 && idx < a.length - 1);
      if (cells.length >= 3) {
        const signal = cells[2];
        if (!signal || /^\{.*\}$/.test(signal) || signal === "—" || signal.toLowerCase() === "tbd") {
          rep.error("nfr.signal", `NFR "${cells[0].slice(0, 50)}" has no measurable Signal/Query (line ${i + 1})`);
        }
      }
    }
    // weak-word lint on FR / AC / NFR lines
    if (/\bAC:|\bFR-\d|\bNFR\b|acceptance criteria/i.test(line)) {
      const low = " " + line.toLowerCase() + " ";
      for (const w of WEAK_WORDS) {
        const re = new RegExp("\\b" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
        if (re.test(low)) { rep.warn("weak-word", `possible vague requirement (weak word "${w}") on line ${i + 1}`); break; }
      }
    }
  }
}

// ───────────────────────────────────────────────────────────────────────────
// CLI
// ───────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const o = { featureDir: null, feature: null, featuresDir: "features", strict: false, json: false, selftest: false };
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    // value-taking flags accept both "--flag=value" and "--flag value"
    const valOf = (name) => {
      if (a === name) { return args[++i]; }      // space form
      if (a.startsWith(name + "=")) return a.slice(name.length + 1);
      return undefined;
    };
    let v;
    if (a === "--strict") o.strict = true;
    else if (a === "--json") o.json = true;
    else if (a === "--selftest") o.selftest = true;
    else if (a === "--help" || a === "-h") { printHelp(); process.exit(0); }
    else if ((v = valOf("--feature-dir")) !== undefined) o.featureDir = v;
    else if ((v = valOf("--features-dir")) !== undefined) o.featuresDir = v;
    else if ((v = valOf("--feature")) !== undefined) o.feature = v;
    else { console.error("Unknown argument: " + a); printHelp(); process.exit(2); }
  }
  return o;
}

function printHelp() {
  console.log([
    "Usage: node scripts/validate-traceability.js --feature-dir <path> [--strict] [--json]",
    "       node scripts/validate-traceability.js --feature <slug> [--features-dir features]",
    "       node scripts/validate-traceability.js --selftest",
    "",
    "Deterministic structural validator over a feature's traceability.yml",
    "(+ journeys.yml / spec.md / tasks.md). Exit 0 clean, 1 failed, 2 usage.",
    "--strict promotes warnings to errors.",
  ].join("\n"));
}

function resolveFeatureDir(o) {
  if (o.featureDir) return o.featureDir;
  // --feature <slug> resolves through the Path-Resolution Contract (lib-paths),
  // so it works under flat AND domain-nested layouts (and errors on ambiguity).
  if (o.feature) return resolveOrExit(o.feature, o.featuresDir);
  return null;
}

function runOnFeatureDir(featureDir, rep) {
  const trPath = path.join(featureDir, "traceability.yml");
  if (!fs.existsSync(trPath)) {
    return { skipped: true, reason: "no traceability.yml yet (pre-Phase-5B) — nothing to validate" };
  }
  let tr;
  try { tr = parseYaml(fs.readFileSync(trPath, "utf8")); }
  catch (e) { rep.error("parse", "failed to parse traceability.yml: " + (e && e.message)); return { skipped: false }; }
  const completed = readCompletedPhases(featureDir);
  const { seenTasks } = checkTraceability(tr, completed, rep) || {};
  checkTasksMd(featureDir, seenTasks, rep);
  checkSpecLint(featureDir, rep);
  return { skipped: false, completed: [...completed] };
}

function emit(o, featureDir, info, rep) {
  const errors = rep.findings.filter((f) => f.severity === "error");
  const warnings = rep.findings.filter((f) => f.severity === "warning");
  const failed = errors.length > 0 || (o.strict && warnings.length > 0);
  if (o.json) {
    console.log(JSON.stringify({
      feature_dir: featureDir, skipped: !!info.skipped, reason: info.reason || null,
      completed_phases: info.completed || [], errors: errors.length, warnings: warnings.length,
      strict: o.strict, passed: !failed && !info.skipped ? true : (info.skipped ? true : !failed),
      findings: rep.findings,
    }, null, 2));
  } else {
    if (info.skipped) { console.log(`⏭  ${featureDir}: ${info.reason}`); }
    else {
      for (const f of rep.findings) {
        console.log(`${f.severity === "error" ? "❌" : "⚠️ "} [${f.rule}] ${f.msg}`);
      }
      const verdict = failed ? "FAIL" : (warnings.length ? "PASS (with warnings)" : "PASS");
      console.log(`\n${failed ? "❌" : "✅"} ${featureDir}: ${verdict} — ${errors.length} error(s), ${warnings.length} warning(s)${o.strict ? " [strict]" : ""}`);
    }
  }
  return failed ? 1 : 0;
}

// ── Self-test: parse embedded fixtures and assert checks fire correctly ──────
function selftest() {
  let pass = 0, fail = 0;
  const assert = (cond, name) => { if (cond) { pass++; } else { fail++; console.error("  ✗ " + name); } };

  // 1) parser: nested map + seq + flow objects
  const sample = `schema_version: 1
feature: "demo"
rows:
  - req: "FR-001"
    must_have: true
    tasks: ["TASK-001"]
    code: ["backend:src/a.ts"]
    tests: ["TC-E2E-001"]
  - req: "FR-002"
    must_have: true
    tasks: []
journeys:
  - id: "JRN-001"
    tests: ["TC-E2E-001"]
    edges:
      - {id: EDGE-001, priority: P1, tests: [TC-E2E-002]}
      - {id: EDGE-002, priority: P1, tests: []}
`;
  const tr = parseYaml(sample);
  assert(tr && tr.feature === "demo", "parse top scalar");
  assert(Array.isArray(tr.rows) && tr.rows.length === 2, "parse rows seq");
  assert(tr.rows[0].req === "FR-001" && tr.rows[0].must_have === true, "parse row map");
  assert(Array.isArray(tr.rows[0].tasks) && tr.rows[0].tasks[0] === "TASK-001", "parse inline flow seq");
  assert(Array.isArray(tr.rows[1].tasks) && tr.rows[1].tasks.length === 0, "parse empty flow seq");
  assert(tr.journeys[0].edges[0].id === "EDGE-001" && tr.journeys[0].edges[0].priority === "P1", "parse flow map in seq");
  assert(Array.isArray(tr.journeys[0].edges[0].tests) && tr.journeys[0].edges[0].tests[0] === "TC-E2E-002", "parse nested flow seq in flow map");

  // 2) checks: FR-002 missing tasks -> error; EDGE-002 P1 no tests -> error
  const rep = makeReporter();
  checkTraceability(tr, new Set(["tasks", "implement", "test_run"]), rep);
  const errs = rep.findings.filter((f) => f.severity === "error");
  assert(errs.some((e) => e.rule === "must_have.tasks"), "detect must_have row without tasks");
  assert(errs.some((e) => e.rule === "edge.tests"), "detect P1 edge without tests");
  // FR-001 is fully linked -> should not error
  assert(!errs.some((e) => e.msg.includes("FR-001")), "fully-linked row produces no error");

  // 3) phase-awareness: before implement, missing code is NOT an error
  const rep2 = makeReporter();
  const tr2 = parseYaml(`rows:\n  - req: "FR-003"\n    must_have: true\n    tasks: ["TASK-009"]\n`);
  checkTraceability(tr2, new Set(["tasks"]), rep2);
  assert(!rep2.findings.some((f) => f.rule === "must_have.code"), "no code-error before implement completes");

  // 4) BLOCK-SEQUENCE shape — the form docs/templates/traceability-matrix.md
  // actually documents for code:/tests: (a block sequence nested inside a
  // block-sequence row item, the parser's trickiest path). Must parse identically
  // to the flow form and a fully-linked row must produce no error.
  const blockSample = [
    "rows:",
    '  - req: "FR-010"',
    "    must_have: true",
    "    tasks:",
    '      - "TASK-010"',
    '      - "TASK-011"',
    "    code:",
    '      - "frontend:apps/web/src/prefs/PrefsModal.tsx"',
    '      - "backend:apps/api/src/prefs/handler.ts"',
    "    tests:",
    '      - "TC-E2E-010"',
  ].join("\n");
  const trB = parseYaml(blockSample);
  assert(Array.isArray(trB.rows) && trB.rows.length === 1, "block-seq: parse single row");
  assert(Array.isArray(trB.rows[0].code) && trB.rows[0].code.length === 2, "block-seq: parse nested block sequence (code)");
  assert(trB.rows[0].code[1] === "backend:apps/api/src/prefs/handler.ts", "block-seq: nested block-seq values intact");
  assert(Array.isArray(trB.rows[0].tasks) && trB.rows[0].tasks[0] === "TASK-010", "block-seq: sibling block sequence (tasks)");
  const repB = makeReporter();
  checkTraceability(trB, new Set(["tasks", "implement", "test_run"]), repB);
  assert(repB.findings.filter((f) => f.severity === "error").length === 0, "block-seq: fully-linked row yields no error");

  console.log(`\nselftest: ${pass} passed, ${fail} failed`);
  return fail === 0 ? 0 : 1;
}

function main() {
  const o = parseArgs(process.argv);
  if (o.selftest) process.exit(selftest());
  const featureDir = resolveFeatureDir(o);
  if (!featureDir) { console.error("Provide --feature-dir <path> or --feature <slug>."); printHelp(); process.exit(2); }
  if (!fs.existsSync(featureDir)) { console.error("Feature dir not found: " + featureDir); process.exit(2); }
  const rep = makeReporter();
  const info = runOnFeatureDir(featureDir, rep);
  process.exit(emit(o, featureDir, info, rep));
}

main();
