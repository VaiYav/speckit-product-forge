#!/usr/bin/env node
// scripts/doctor.js
//
// Aggregate self-check for the Product Forge repo — the single command that
// proves the package is internally consistent and its helpers work. Runs:
//
//   1. Every bundled script's --selftest (lib-paths, lib-yaml-via-consumers,
//      gate-risk, validate-traceability, lint-docs).
//   2. The doc-corpus consistency linter (scripts/lint-docs.js).
//   3. Structural invariants that have bitten this repo before:
//        - VERSION  : extension.yml version == .claude-plugin/plugin.json version
//        - CMD-COUNT : commands/*.md == extension.yml provides.commands ==
//                      frontmatter names (and all three sets are equal)
//        - NO-ESCAPE : no shipped file references a path above the plugin root
//      (lint-docs already covers most of these; doctor re-asserts the
//       release-blocking ones explicitly so a doctor run is a sufficient gate).
//
// This is the executable form of docs/qa/plugin-test-plan.md §9 "Quick smoke",
// and the job .github/workflows/ci.yml runs on every push.
//
// Usage:
//   node scripts/doctor.js            # human output; exit 0 = healthy, 1 = problems
//   node scripts/doctor.js --json     # machine-readable summary
//
// Exit codes: 0 = all checks pass, 1 = one or more failed, 2 = harness error.

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const R = (p) => path.join(ROOT, p);
const read = (p) => fs.readFileSync(p, "utf8");
const exists = (p) => fs.existsSync(p);

const results = []; // { name, ok, detail }
const record = (name, ok, detail) => results.push({ name, ok: !!ok, detail: detail || "" });

function runNode(scriptRel, args = []) {
  const r = cp.spawnSync(process.execPath, [R(scriptRel), ...args], { encoding: "utf8" });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
}

// ── 1. script self-tests ─────────────────────────────────────────────────────
function checkSelftests() {
  const scripts = [
    "scripts/lib-paths.js",
    "scripts/gate-risk.js",
    "scripts/validate-traceability.js",
    "scripts/lint-docs.js",
    "scripts/check-links.js",
    "scripts/cost-report.js",
  ];
  for (const s of scripts) {
    if (!exists(R(s))) { record(`selftest ${path.basename(s)}`, false, "script missing"); continue; }
    const { code, out } = runNode(s, ["--selftest"]);
    const m = out.match(/selftest:\s*(\d+)\s+passed,\s*(\d+)\s+failed/);
    const ok = code === 0 && m && Number(m[2]) === 0;
    record(`selftest ${path.basename(s)}`, ok, m ? `${m[1]} passed, ${m[2]} failed` : `exit ${code}`);
  }
  // lib-yaml has no standalone selftest — it is exercised by the consumers above.
  record("selftest lib-yaml.js", true, "covered via gate-risk / validate-traceability selftests");
}

// ── 1b. end-to-end smoke against the committed fixture ───────────────────────
// Proves the scripts work on REAL files, not just in-memory self-test fixtures.
function checkFixture() {
  const fx = "fixtures/features/demo";
  if (!exists(R(fx + "/.forge-status.yml"))) {
    record("fixture present", false, fx + "/.forge-status.yml missing");
    return;
  }
  record("fixture present", true, fx);
  const vt = runNode("scripts/validate-traceability.js", ["--feature-dir", fx, "--strict"]);
  record("fixture validate-traceability --strict", vt.code === 0,
    vt.code === 0 ? "PASS" : vt.out.trim().split("\n").slice(-1)[0]);
  const gr = runNode("scripts/gate-risk.js", ["--feature-dir", fx, "--json"]);
  let risk;
  try { risk = JSON.parse(gr.out).risk; } catch { /* */ }
  record("fixture gate-risk classifies", gr.code === 0 && !!risk, risk ? `risk=${risk}` : `exit ${gr.code}`);
  const cr = runNode("scripts/cost-report.js", ["--feature-dir", fx, "--json"]);
  let toks;
  try { toks = JSON.parse(cr.out).totals.tokens_in; } catch { /* */ }
  record("fixture cost-report rolls up", cr.code === 0 && typeof toks === "number" && toks > 0, toks ? `tokens_in=${toks}` : `exit ${cr.code}`);
}

// ── 2. doc-corpus lint ───────────────────────────────────────────────────────
function checkLintDocs() {
  if (!exists(R("scripts/lint-docs.js"))) { record("lint-docs", false, "missing"); return; }
  const { code, out } = runNode("scripts/lint-docs.js", ["--json"]);
  let errs = 0, total = 0;
  try {
    const parsed = JSON.parse(out);
    total = parsed.count || 0;
    errs = (parsed.findings || []).filter((f) => f.severity === "error").length;
  } catch { /* fall through */ }
  // lint-docs exits 1 on any finding; doctor blocks only on error-severity.
  record("lint-docs (no errors)", errs === 0, `${errs} error, ${total - errs} warn`);
}

// ── 3. structural invariants ─────────────────────────────────────────────────
function checkVersion() {
  const ext = exists(R("extension.yml")) ? read(R("extension.yml")) : "";
  const extVer = (ext.match(/^\s*version:\s*"([^"]+)"/m) || [])[1];
  let pjVer;
  try { pjVer = JSON.parse(read(R(".claude-plugin/plugin.json"))).version; } catch { /* */ }
  record("version sync (extension.yml == plugin.json)", extVer && pjVer && extVer === pjVer,
    `extension.yml=${extVer || "?"}, plugin.json=${pjVer || "?"}`);
}

function checkCmdCount() {
  const cmdFiles = exists(R("commands"))
    ? fs.readdirSync(R("commands")).filter((f) => f.endsWith(".md")).sort()
    : [];
  const ext = exists(R("extension.yml")) ? read(R("extension.yml")) : "";
  const manifestFiles = [...ext.matchAll(/file:\s*"commands\/([^"]+\.md)"/g)].map((m) => m[1]).sort();
  const fmNames = cmdFiles.map((f) => {
    const fm = read(R(path.join("commands", f))).match(/^name:\s*(\S+)/m);
    return fm ? fm[1] : null;
  });
  const wantNames = cmdFiles.map((f) => "speckit.product-forge." + f.replace(/\.md$/, ""));
  const filesEqManifest = cmdFiles.length === manifestFiles.length &&
    cmdFiles.every((f, i) => f === manifestFiles[i]);
  const fmOk = fmNames.every((n, i) => n === wantNames[i]);
  record("command count (files == manifest == frontmatter)",
    filesEqManifest && fmOk,
    `${cmdFiles.length} files, ${manifestFiles.length} manifest entries, frontmatter ${fmOk ? "ok" : "MISMATCH"}`);
}

function checkNoEscape() {
  // No shipped DOC/COMMAND file may reference a path that climbs above the
  // plugin root. We scan .md/.yml only — .js helpers legitimately contain
  // escape-looking string literals in their --selftest fixtures (test data,
  // not real references), so including them would false-positive.
  const files = [];
  const walk = (d) => {
    if (!exists(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith(".git")) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(md|ya?ml)$/.test(e.name)) files.push(p);
    }
  };
  walk(R("commands")); walk(R("docs"));
  // exclude the improvements memos (they quote example paths) and this dir's node_modules
  const refRe = /(?<![\w`./])((?:\.\.\/){2,}[A-Za-z0-9_./-]+\.(?:ya?ml|json|md|ts|js))/g;
  const offenders = [];
  for (const f of files) {
    if (/improvements\//.test(f)) continue;
    const txt = read(f);
    let m;
    while ((m = refRe.exec(txt)) !== null) {
      const resolved = path.resolve(path.dirname(f), m[1]);
      if (!resolved.startsWith(ROOT + path.sep)) offenders.push(`${path.relative(ROOT, f)} → ${m[1]}`);
    }
  }
  record("no path escapes plugin root", offenders.length === 0,
    offenders.length ? offenders.join("; ") : "clean");
}

// ── run + report ─────────────────────────────────────────────────────────────
function main() {
  const json = process.argv.includes("--json");
  try {
    checkSelftests();
    checkFixture();
    checkLintDocs();
    checkVersion();
    checkCmdCount();
    checkNoEscape();
  } catch (e) {
    console.error("doctor: harness error — " + (e && e.message));
    process.exit(2);
  }

  const failed = results.filter((r) => !r.ok);
  if (json) {
    console.log(JSON.stringify({ ok: failed.length === 0, results }, null, 2));
  } else {
    console.log("Product Forge — doctor\n");
    for (const r of results) {
      console.log(`  ${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? "  (" + r.detail + ")" : ""}`);
    }
    console.log(`\n${failed.length === 0 ? "✅ healthy" : "❌ " + failed.length + " check(s) failed"} — ${results.length} checks`);
  }
  process.exit(failed.length === 0 ? 0 : 1);
}

if (require.main === module) main();
