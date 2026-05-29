#!/usr/bin/env node
// scripts/gate-risk.js
//
// Wave 5 (W5-A4) — deterministic gate risk classifier.
//
// Computes ONE risk class (low | medium | high) for a feature from signals that
// already exist in `.forge-status.yml` (+ gate-review.md / verify-report.md when
// present), and maps it to a recommended gate routing. This is the EXECUTABLE
// backbone behind the "risk-routed single gate decision" (A4) and the `--ci`
// gate policy (B1): a real computation, not a prose heuristic.
//
// It NEVER auto-approves a human gate. In interactive mode the risk class is a
// one-line headline that routes how much review surface to present; in `--ci`
// the routing is consumed by the gate-policy (low → auto-recommend + record,
// medium → require human, high → block until explicit human approval).
//
// Usage:
//   node scripts/gate-risk.js --feature-dir features/<slug> [--json]
//   node scripts/gate-risk.js --feature <slug> [--features-dir features]
//   node scripts/gate-risk.js --selftest
//
// Exit codes: 0 always on a successful classification (the class is data, not a
// pass/fail); 2 on usage/unreadable input. (`--ci` decides blocking from the
// class + policy, not from this script's exit code.)

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { parseYaml } = require("./lib-yaml");
const { resolveOrExit } = require("./lib-paths");

// Default risk → gate routing. Projects may override via gate-policy.yml (B1).
const DEFAULT_ROUTING = {
  low: "auto-recommend",   // present a compact summary; human still records the decision
  medium: "require-human", // present the full review surface; human must approve
  high: "block",           // require explicit human approval; --ci blocks here
};

function classify(status, findings) {
  const signals = {};
  const reasons = [];
  let level = 0; // 0 low, 1 medium, 2 high
  const bump = (to, why) => { if (to > level) level = to; reasons.push(why); };

  // feature_mode bias
  const mode = status.feature_mode || "standard";
  signals.feature_mode = mode;
  if (mode === "v-model") bump(2, "v-model (regulated/safety-critical) feature");
  if (mode === "express") signals.express = true; // bias toward low; no bump

  // task_log sizes
  const taskLog = Array.isArray(status.task_log) ? status.task_log : [];
  const sizes = taskLog.map((t) => (t && t.size ? String(t.size).toUpperCase() : "")).filter(Boolean);
  signals.task_count = taskLog.length;
  signals.xl_tasks = sizes.filter((s) => s === "XL").length;
  signals.l_tasks = sizes.filter((s) => s === "L").length;
  if (signals.xl_tasks > 0) bump(2, `${signals.xl_tasks} XL-sized task(s)`);
  else if (signals.l_tasks > 0) bump(1, `${signals.l_tasks} L-sized task(s)`);
  if (taskLog.length > 10) bump(1, `${taskLog.length} tasks (>10)`);

  // monorepo blast radius
  const scope = status.scope || {};
  if (scope.cross_workspace === true) { signals.cross_workspace = true; bump(2, "cross-workspace change"); }

  // schema / migration changes
  const phases = status.phases || {};
  const migStatus = phases.migration_plan && phases.migration_plan.status;
  if (migStatus === "completed") { signals.schema_changes = true; bump(2, "data-model / migration changes"); }

  // change requests that forced a phase rollback
  const crs = Array.isArray(status.change_requests) ? status.change_requests : [];
  const rollbackCrs = crs.filter((c) => c && c.phase_rollback && c.phase_rollback !== "null" && c.phase_rollback !== null);
  if (rollbackCrs.length > 0) { signals.cr_rollbacks = rollbackCrs.length; bump(1, `${rollbackCrs.length} change-request(s) forced a phase rollback`); }

  // open gate / verify findings
  signals.critical_findings = findings.critical;
  signals.high_findings = findings.high;
  if (findings.critical > 0) bump(2, `${findings.critical} open CRITICAL finding(s)`);
  else if (findings.high > 0) bump(1, `${findings.high} open HIGH finding(s)`);

  const risk = level === 2 ? "high" : level === 1 ? "medium" : "low";
  return { risk, signals, reasons, routing: DEFAULT_ROUTING[risk] };
}

function countFindings(featureDir) {
  // Count OPEN CRITICAL/HIGH findings, anchored to finding LINES so summary-table
  // legends ("CRITICAL", "HIGH" as column headers) are not miscounted as findings.
  // Primary source: the unified gate-review.md (one F-NNN bullet per finding).
  // Fallback (legacy, when gate-review.md is absent): per-phase report markers.
  const gr = path.join(featureDir, "gate-review.md");
  if (fs.existsSync(gr)) {
    let critical = 0, high = 0;
    for (const line of fs.readFileSync(gr, "utf8").split(/\r?\n/)) {
      if (!/\bF-\d+\b/.test(line)) continue;          // only finding bullets, not the legend
      // Count only OPEN findings. A resolved/acknowledged/waived finding carries
      // one of those words or a ✅/🔶/⚪ marker on its bullet (see
      // docs/templates/gate-review.md). This matches forge.md's auto-recommend
      // pre-gate grep, so the CI no_open_critical gate clears once findings are fixed.
      if (/✅|🔶|⚪|\b(?:resolved|acknowledged|waived)\b/i.test(line)) continue;
      if (/\bCRITICAL\b/.test(line)) critical++;
      else if (/\bHIGH\b/.test(line)) high++;
    }
    return { critical: Math.min(critical, 99), high: Math.min(high, 99) };
  }
  let critical = 0, high = 0;
  const vr = path.join(featureDir, "verify-report.md");
  if (fs.existsSync(vr)) critical += (fs.readFileSync(vr, "utf8").match(/^#{1,6}\s*CRITICAL-\d+/gm) || []).length;
  const cr = path.join(featureDir, "code-review.md");
  if (fs.existsSync(cr)) {
    const t = fs.readFileSync(cr, "utf8");
    critical += (t.match(/REV-\d+[^\n]*\[CRITICAL\]/g) || []).length;
    high += (t.match(/REV-\d+[^\n]*\[HIGH\]/g) || []).length;
  }
  return { critical: Math.min(critical, 99), high: Math.min(high, 99) };
}

function run(featureDir) {
  const p = path.join(featureDir, ".forge-status.yml");
  if (!fs.existsSync(p)) return { error: "no .forge-status.yml in " + featureDir };
  let status;
  try { status = parseYaml(fs.readFileSync(p, "utf8")) || {}; }
  catch (e) { return { error: "failed to parse .forge-status.yml: " + (e && e.message) }; }
  const findings = countFindings(featureDir);
  return classify(status, findings);
}

// ── CLI ──────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const o = { featureDir: null, feature: null, featuresDir: "features", json: false, selftest: false };
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const valOf = (n) => (a === n ? args[++i] : a.startsWith(n + "=") ? a.slice(n.length + 1) : undefined);
    let v;
    if (a === "--json") o.json = true;
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
    "Usage: node scripts/gate-risk.js --feature-dir <path> [--json]",
    "       node scripts/gate-risk.js --feature <slug> [--features-dir features]",
    "       node scripts/gate-risk.js --selftest",
    "",
    "Computes a deterministic gate risk class (low|medium|high) + recommended",
    "routing from .forge-status.yml signals. Never auto-approves a human gate.",
  ].join("\n"));
}

function selftest() {
  let pass = 0, fail = 0;
  const assert = (c, n) => { if (c) pass++; else { fail++; console.error("  ✗ " + n); } };

  // low: small standard feature, no risky signals
  const low = classify(parseYaml('feature_mode: "standard"\ntask_log:\n  - {id: T1, size: S}\n  - {id: T2, size: M}\n'), { critical: 0, high: 0 });
  assert(low.risk === "low", "low: small standard feature");
  assert(low.routing === "auto-recommend", "low: routing auto-recommend");

  // medium: an L task + >10 tasks
  const medStatus = "feature_mode: \"standard\"\ntask_log:\n" + Array.from({ length: 11 }, (_, i) => `  - {id: T${i}, size: ${i === 0 ? "L" : "S"}}`).join("\n") + "\n";
  const med = classify(parseYaml(medStatus), { critical: 0, high: 0 });
  assert(med.risk === "medium", "medium: L task + >10 tasks");

  // high: XL task
  const hi1 = classify(parseYaml('task_log:\n  - {id: T1, size: XL}\n'), { critical: 0, high: 0 });
  assert(hi1.risk === "high", "high: XL task");
  assert(hi1.routing === "block", "high: routing block");

  // high: cross-workspace
  const hi2 = classify(parseYaml('scope:\n  cross_workspace: true\n'), { critical: 0, high: 0 });
  assert(hi2.risk === "high", "high: cross-workspace");

  // high: migration completed
  const hi3 = classify(parseYaml('phases:\n  migration_plan:\n    status: "completed"\n'), { critical: 0, high: 0 });
  assert(hi3.risk === "high", "high: schema/migration changes");

  // high: open CRITICAL finding
  const hi4 = classify(parseYaml('feature_mode: "standard"\n'), { critical: 1, high: 0 });
  assert(hi4.risk === "high", "high: open CRITICAL finding");

  // medium: open HIGH finding only
  const med2 = classify(parseYaml('feature_mode: "standard"\n'), { critical: 0, high: 2 });
  assert(med2.risk === "medium", "medium: open HIGH finding");

  // high: v-model
  const vm = classify(parseYaml('feature_mode: "v-model"\n'), { critical: 0, high: 0 });
  assert(vm.risk === "high", "high: v-model feature");

  console.log(`\nselftest: ${pass} passed, ${fail} failed`);
  return fail === 0 ? 0 : 1;
}

function emit(o, featureDir, result) {
  if (result.error) { console.error(result.error); process.exit(2); }
  if (o.json) { console.log(JSON.stringify({ feature_dir: featureDir, ...result }, null, 2)); return; }
  const icon = result.risk === "high" ? "🔴" : result.risk === "medium" ? "🟡" : "🟢";
  console.log(`${icon} Gate risk: ${result.risk.toUpperCase()} → routing: ${result.routing}`);
  if (result.reasons.length) for (const r of result.reasons) console.log(`   • ${r}`);
  else console.log("   • no elevated-risk signals");
}

function main() {
  const o = parseArgs(process.argv);
  if (o.selftest) process.exit(selftest());
  // --feature <slug> resolves through the Path-Resolution Contract (lib-paths),
  // so it works under flat AND domain-nested layouts (and errors on ambiguity).
  const featureDir = o.featureDir || (o.feature ? resolveOrExit(o.feature, o.featuresDir) : null);
  if (!featureDir) { console.error("Provide --feature-dir <path> or --feature <slug>."); printHelp(); process.exit(2); }
  if (!fs.existsSync(featureDir)) { console.error("Feature dir not found: " + featureDir); process.exit(2); }
  emit(o, featureDir, run(featureDir));
}

main();
