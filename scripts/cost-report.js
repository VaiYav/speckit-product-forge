#!/usr/bin/env node
// scripts/cost-report.js
//
// P3-C — surfaces the token/tool-call telemetry that the orchestrator records
// per phase (phases.<name>.tokens_in / tokens_out / tool_calls) WHEN the host
// exposes per-phase usage accounting (see docs/runtime.md §8.1a). Turns that
// data into the cost visibility Hermes users want (Cost Optimization is a whole
// category in the Hermes user-stories corpus). When a host records no usage,
// the rollup reports "no per-phase token telemetry recorded" rather than zeros.
//
// Two scopes:
//   --feature-dir <path> / --feature <slug>   per-phase rollup for one feature
//   --portfolio [--features-dir features]      rollup across every feature
//
// Cost is OPTIONAL and only shown when --rate is given (or PRODUCT_FORGE_COST_*
// env): tokens are always real (captured), dollars require the caller's price.
// We never hard-code provider prices (they drift); the script does arithmetic,
// the caller supplies the rate.
//
// Usage:
//   node scripts/cost-report.js --feature-dir features/<slug> [--json]
//   node scripts/cost-report.js --feature <slug> [--features-dir features] [--json]
//   node scripts/cost-report.js --portfolio [--features-dir features] [--json]
//   node scripts/cost-report.js --rate-in 3 --rate-out 15   # $/Mtok in/out
//   node scripts/cost-report.js --selftest
//
// Exit codes: 0 on a successful report (the numbers are data, not pass/fail);
// 2 on usage / unreadable input.

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { parseYaml } = require("./lib-yaml");
const { enumerateFeatures, resolveOrExit } = require("./lib-paths");

const read = (p) => fs.readFileSync(p, "utf8");
const exists = (p) => fs.existsSync(p);
// Coerce a counter to a non-negative number. Tolerates string forms incl.
// thousands separators ("1,000") and decimals ("3500.9"); non-numeric → 0.
const num = (v) => {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  const n = Number(String(v).replace(/[, ]/g, ""));
  return isFinite(n) ? n : 0;
};

// Roll up per-phase token/tool-call counters from one parsed status object.
// Returns { phases: [{phase, tokens_in, tokens_out, tool_calls}], totals }.
function rollupFeature(status) {
  const phasesObj = (status && status.phases && typeof status.phases === "object") ? status.phases : {};
  const phases = [];
  const totals = { tokens_in: 0, tokens_out: 0, tool_calls: 0 };
  for (const [name, body] of Object.entries(phasesObj)) {
    if (!body || typeof body !== "object") continue;
    const ti = num(body.tokens_in), to = num(body.tokens_out), tc = num(body.tool_calls);
    if (ti || to || tc) {
      phases.push({ phase: name, tokens_in: ti, tokens_out: to, tool_calls: tc });
      totals.tokens_in += ti; totals.tokens_out += to; totals.tool_calls += tc;
    }
  }
  return { phases, totals };
}

function dollars(totals, rateIn, rateOut) {
  if (rateIn == null && rateOut == null) return null;
  // rates are $ per 1,000,000 tokens
  const ci = (totals.tokens_in / 1e6) * (rateIn || 0);
  const co = (totals.tokens_out / 1e6) * (rateOut || 0);
  return +(ci + co).toFixed(4);
}

function featureSlug(dir) { return path.basename(dir); }

function readStatus(dir) {
  const p = path.join(dir, ".forge-status.yml");
  if (!exists(p)) return null;
  try { return parseYaml(read(p)); } catch { return null; }
}

// ── output ───────────────────────────────────────────────────────────────────
function fmt(n) { return n.toLocaleString("en-US"); }

function printFeature(slug, roll, cost) {
  const { phases, totals } = roll;
  console.log(`\n💰 Cost rollup: ${slug}`);
  if (phases.length === 0) {
    console.log("   (no per-phase token telemetry recorded yet)");
    return;
  }
  console.log("   ─────────────────────────────────────────────────────");
  console.log("   Phase                     tokens_in  tokens_out  tools");
  for (const p of phases) {
    console.log(
      "   " + p.phase.padEnd(24) +
      String(fmt(p.tokens_in)).padStart(10) +
      String(fmt(p.tokens_out)).padStart(12) +
      String(fmt(p.tool_calls)).padStart(7)
    );
  }
  console.log("   ─────────────────────────────────────────────────────");
  console.log(
    "   " + "TOTAL".padEnd(24) +
    String(fmt(totals.tokens_in)).padStart(10) +
    String(fmt(totals.tokens_out)).padStart(12) +
    String(fmt(totals.tool_calls)).padStart(7)
  );
  if (cost != null) console.log(`   Estimated cost: $${cost} (at supplied rates)`);
}

function printPortfolio(rows, grand, cost) {
  console.log("\n💰 Portfolio cost rollup");
  if (rows.length === 0) { console.log("   (no features with token telemetry)"); return; }
  console.log("   ─────────────────────────────────────────────────────");
  console.log("   Feature                   tokens_in  tokens_out  tools");
  for (const r of rows) {
    console.log(
      "   " + r.slug.padEnd(24) +
      String(fmt(r.totals.tokens_in)).padStart(10) +
      String(fmt(r.totals.tokens_out)).padStart(12) +
      String(fmt(r.totals.tool_calls)).padStart(7)
    );
  }
  console.log("   ─────────────────────────────────────────────────────");
  console.log(
    "   " + "ALL FEATURES".padEnd(24) +
    String(fmt(grand.tokens_in)).padStart(10) +
    String(fmt(grand.tokens_out)).padStart(12) +
    String(fmt(grand.tool_calls)).padStart(7)
  );
  if (cost != null) console.log(`   Estimated cost: $${cost} (at supplied rates)`);
}

// ── CLI ────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const o = { featureDir: null, feature: null, featuresDir: "features", portfolio: false,
              json: false, selftest: false, rateIn: null, rateOut: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--feature-dir") o.featureDir = argv[++i];
    else if (a === "--feature") o.feature = argv[++i];
    else if (a === "--features-dir") o.featuresDir = argv[++i];
    else if (a === "--portfolio") o.portfolio = true;
    else if (a === "--json") o.json = true;
    else if (a === "--selftest") o.selftest = true;
    else if (a === "--rate-in") o.rateIn = parseFloat(argv[++i]);
    else if (a === "--rate-out") o.rateOut = parseFloat(argv[++i]);
    else if (a === "--help" || a === "-h") { printHelp(); process.exit(0); }
    else { console.error("Unknown argument: " + a); process.exit(2); }
  }
  // env fallback for rates
  if (o.rateIn == null && process.env.PRODUCT_FORGE_COST_RATE_IN) o.rateIn = parseFloat(process.env.PRODUCT_FORGE_COST_RATE_IN);
  if (o.rateOut == null && process.env.PRODUCT_FORGE_COST_RATE_OUT) o.rateOut = parseFloat(process.env.PRODUCT_FORGE_COST_RATE_OUT);
  return o;
}

function printHelp() {
  console.log([
    "Usage: node scripts/cost-report.js --feature-dir <path> [--json]",
    "       node scripts/cost-report.js --feature <slug> [--features-dir features]",
    "       node scripts/cost-report.js --portfolio [--features-dir features]",
    "       node scripts/cost-report.js [--rate-in <$/Mtok>] [--rate-out <$/Mtok>]",
    "       node scripts/cost-report.js --selftest",
    "",
    "Rolls up phases.<name>.{tokens_in,tokens_out,tool_calls} from .forge-status.yml.",
    "Dollar cost is shown only when --rate-in/--rate-out (or PRODUCT_FORGE_COST_RATE_*) given.",
  ].join("\n"));
}

function selftest() {
  let pass = 0, fail = 0;
  const assert = (c, n) => { if (c) pass++; else { fail++; console.error("  ✗ " + n); } };

  // rollup: sums only phases that carry counters, ignores empty ones
  const st = parseYaml([
    "phases:",
    "  research:",
    "    status: completed",
    "    tokens_in: 12000",
    "    tokens_out: 3500",
    "    tool_calls: 14",
    "  plan:",
    "    status: completed",
    "    tokens_in: 8000",
    "    tokens_out: 2000",
    "    tool_calls: 6",
    "  implement:",
    "    status: pending",
    "",
  ].join("\n"));
  const r = rollupFeature(st);
  assert(r.phases.length === 2, "rollup includes only phases with telemetry");
  assert(r.totals.tokens_in === 20000, "rollup sums tokens_in");
  assert(r.totals.tokens_out === 5500, "rollup sums tokens_out");
  assert(r.totals.tool_calls === 20, "rollup sums tool_calls");

  // empty / missing phases block → zero, no throw
  const empty = rollupFeature(parseYaml("feature_mode: standard\n"));
  assert(empty.phases.length === 0 && empty.totals.tokens_in === 0, "no phases → empty rollup");

  // dollars: null without rates, computed with rates ($/Mtok)
  assert(dollars(r.totals, null, null) === null, "no rate → no dollar figure");
  // 20000/1e6*3 + 5500/1e6*15 = 0.06 + 0.0825 = 0.1425
  assert(dollars(r.totals, 3, 15) === 0.1425, "dollar arithmetic at supplied rates");

  // string counters tolerated (num())
  const strSt = parseYaml('phases:\n  x:\n    tokens_in: "1000"\n    tool_calls: "3"\n');
  const sr = rollupFeature(strSt);
  assert(sr.totals.tokens_in === 1000 && sr.totals.tool_calls === 3, "string counters coerced to numbers");

  console.log(`\nselftest: ${pass} passed, ${fail} failed`);
  return fail === 0 ? 0 : 1;
}

function main() {
  const o = parseArgs(process.argv);
  if (o.selftest) process.exit(selftest());

  if (o.portfolio) {
    const dirs = enumerateFeatures(o.featuresDir);
    const rows = [];
    const grand = { tokens_in: 0, tokens_out: 0, tool_calls: 0 };
    for (const d of dirs) {
      const st = readStatus(d);
      if (!st) continue;
      const roll = rollupFeature(st);
      rows.push({ slug: featureSlug(d), totals: roll.totals, phases: roll.phases });
      grand.tokens_in += roll.totals.tokens_in;
      grand.tokens_out += roll.totals.tokens_out;
      grand.tool_calls += roll.totals.tool_calls;
    }
    const cost = dollars(grand, o.rateIn, o.rateOut);
    if (o.json) console.log(JSON.stringify({ scope: "portfolio", features: rows, totals: grand, cost }, null, 2));
    else printPortfolio(rows, grand, cost);
    process.exit(0);
  }

  const featureDir = o.featureDir || (o.feature ? resolveOrExit(o.feature, o.featuresDir) : null);
  if (!featureDir) { console.error("Provide --feature-dir <path>, --feature <slug>, or --portfolio."); printHelp(); process.exit(2); }
  if (!exists(featureDir)) { console.error("Feature dir not found: " + featureDir); process.exit(2); }
  const st = readStatus(featureDir);
  if (!st) { console.error("No readable .forge-status.yml in " + featureDir); process.exit(2); }
  const roll = rollupFeature(st);
  const cost = dollars(roll.totals, o.rateIn, o.rateOut);
  if (o.json) console.log(JSON.stringify({ scope: "feature", feature: featureSlug(featureDir), ...roll, cost }, null, 2));
  else printFeature(featureSlug(featureDir), roll, cost);
  process.exit(0);
}

if (require.main === module) main();
module.exports = { rollupFeature, dollars, num };
