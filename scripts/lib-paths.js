// scripts/lib-paths.js
//
// Executable form of the **Path-Resolution Contract** (docs/runtime.md §12).
// The single place that maps a feature slug → on-disk FEATURE_DIR and that
// enumerates all feature roots. Shared by gate-risk.js, validate-traceability.js,
// and migrate-status-v2-to-v3.js so none of them inline their own path logic.
//
// Both operations are **depth-tolerant and strategy-agnostic**: the rules in
// §12.2/§12.3 subsume `flat` (feature at depth 1) and `domain-nested` (depth 2)
// and exclude `_`-prefixed reserved namespaces (_portfolio, _archived). The
// PLANNED/RESERVED strategies (ddd, workspace) are rejected at Step 0, so no
// registry logic is needed here — the on-disk shape is all that matters.
//
// Self-test: `node scripts/lib-paths.js --selftest`

"use strict";

const fs = require("fs");
const path = require("path");

function hasStatus(dir) {
  try {
    return fs.statSync(path.join(dir, ".forge-status.yml")).isFile();
  } catch {
    return false;
  }
}

// §12.3 enumerate() → [FEATURE_DIR, …]
// Descend from featuresDir; the FIRST directory containing `.forge-status.yml`
// IS a feature root — record it and stop descending into that subtree. Skip
// top-level `_`-prefixed dirs (reserved namespaces). `.forge-status.yml` lives
// only at the feature root, so "stop on first hit" is unambiguous.
function enumerateFeatures(featuresDir) {
  const out = [];
  if (!fs.existsSync(featuresDir)) return out;

  const walk = (dir, depth) => {
    if (depth > 0 && hasStatus(dir)) {
      out.push(dir);
      return; // feature root — do not descend further
    }
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (depth === 0 && e.name.startsWith("_")) continue; // reserved namespaces
      walk(path.join(dir, e.name), depth + 1);
    }
  };

  walk(featuresDir, 0);
  return out.sort();
}

// ddd bounded-context registry: `features/domains.yml` is a flat `slug: context`
// map. Best-effort and tolerant of absence/parse errors — read with the shared
// lib-yaml parser so the accepted subset stays consistent with .forge-status.yml.
// Absent (flat / domain-nested / workspace) → {}.
function readDomainsRegistry(featuresDir) {
  try {
    const { parseYaml } = require("./lib-yaml");
    const obj = parseYaml(fs.readFileSync(path.join(featuresDir, "domains.yml"), "utf8"));
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

// §12.2 resolve(slug) → { dir, candidates }
// - Qualified reference ("<group>/<slug>") resolves directly.
// - Otherwise: flat path {featuresDir}/<slug>/ plus depth-2 {featuresDir}/*/<slug>/
//   (skipping `_`-prefixed top-level dirs).
// Returns { dir } on a unique hit; dir is null for 0 matches (CREATE) or for
// >1 matches (ambiguous — caller must require a qualified <group>/<slug> ref).
// `candidates` always lists what was found so callers can report precisely.
function resolveFeatureDir(slug, featuresDir) {
  if (typeof slug === "string" && slug.includes("/")) {
    const dir = path.join(featuresDir, slug);
    return hasStatus(dir) ? { dir, candidates: [dir] } : { dir: null, candidates: [] };
  }

  // ddd registry fast-path (§12.2 PRIMARY): O(1) slug → context lookup via
  // features/domains.yml. Read-only — registry *healing* on a stale/miss entry
  // is the orchestrator's job, not the deterministic resolver's (scripts must
  // never mutate the tree). A stale entry falls through to the disk scan below.
  const registry = readDomainsRegistry(featuresDir);
  if (Object.prototype.hasOwnProperty.call(registry, slug)) {
    const dir = path.join(featuresDir, String(registry[slug]), slug);
    if (hasStatus(dir)) return { dir, candidates: [dir], viaRegistry: true };
  }

  const candidates = [];
  const flat = path.join(featuresDir, slug);
  if (hasStatus(flat)) candidates.push(flat);

  let tops = [];
  try {
    tops = fs.readdirSync(featuresDir, { withFileTypes: true });
  } catch {
    tops = [];
  }
  for (const t of tops) {
    if (!t.isDirectory() || t.name.startsWith("_") || t.name === slug) continue;
    const nested = path.join(featuresDir, t.name, slug);
    if (hasStatus(nested)) candidates.push(nested);
  }

  const uniq = [...new Set(candidates)];
  return { dir: uniq.length === 1 ? uniq[0] : null, candidates: uniq };
}

// Resolve helper for CLIs: prints a precise error + exits non-zero on
// not-found / ambiguous. Returns the resolved dir on success.
function resolveOrExit(slug, featuresDir) {
  const r = resolveFeatureDir(slug, featuresDir);
  if (r.candidates.length > 1) {
    console.error(
      `Ambiguous feature "${slug}" — matches ${r.candidates.length}: ${r.candidates.join(", ")}.\n` +
      `Pass a qualified "<group>/${slug}" reference or use --feature-dir <path>.`,
    );
    process.exit(2);
  }
  if (!r.dir) {
    console.error(`Feature not found: "${slug}" under ${featuresDir}.`);
    process.exit(2);
  }
  return r.dir;
}

module.exports = { enumerateFeatures, resolveFeatureDir, resolveOrExit, hasStatus };

// ── Self-test (filesystem fixture) ──────────────────────────────────────────
function selftest() {
  const os = require("os");
  let pass = 0, fail = 0;
  const assert = (cond, name) => { if (cond) pass++; else { fail++; console.error("  ✗ " + name); } };

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "forge-paths-"));
  const F = path.join(root, "features");
  const mkFeature = (...segs) => {
    const dir = path.join(F, ...segs);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, ".forge-status.yml"), "schema_version: 3\n");
    return dir;
  };
  try {
    const flat = mkFeature("alpha");                                  // flat, depth 1
    const checkout = mkFeature("billing", "checkout");               // nested, depth 2
    const refunds = mkFeature("billing", "refunds");                 // nested, depth 2
    const payAlpha = mkFeature("payments", "alpha");                 // collides with flat "alpha"
    mkFeature("_archived", "2026-01-01-old");                        // reserved — excluded
    fs.mkdirSync(path.join(F, "_portfolio"), { recursive: true });   // reserved — excluded
    fs.writeFileSync(path.join(F, "_portfolio", "portfolio.md"), "x\n");
    // ddd registry (a file, not a feature): maps slug → context. `checkout` is a
    // live mapping; `phantom` is a stale entry pointing at no on-disk feature.
    fs.writeFileSync(path.join(F, "domains.yml"), "checkout: billing\nphantom: billing\n");

    // enumerate(): finds the 4 real features, excludes _archived/_portfolio/domains.yml
    const en = enumerateFeatures(F);
    assert(en.length === 4, "enumerate finds exactly 4 features (got " + en.length + ")");
    assert(en.includes(flat) && en.includes(checkout) && en.includes(refunds) && en.includes(payAlpha), "enumerate includes all real features");
    assert(!en.some((d) => d.includes("_archived") || d.includes("_portfolio")), "enumerate excludes reserved namespaces");

    // resolve(): flat-only slug
    assert(resolveFeatureDir("checkout", F).dir === checkout, "resolve nested-unique slug");
    assert(resolveFeatureDir("refunds", F).dir === refunds, "resolve another nested slug");
    // ambiguous: "alpha" exists flat AND under payments/
    const amb = resolveFeatureDir("alpha", F);
    assert(amb.dir === null && amb.candidates.length === 2, "resolve ambiguous slug → null + 2 candidates");
    // qualified reference disambiguates — this same `<group>/<slug>` form is how
    // ddd `<context>/<slug>` and workspace `<workspace>/<slug>` refs resolve.
    assert(resolveFeatureDir("payments/alpha", F).dir === payAlpha, "resolve qualified <group>/<slug>");
    assert(resolveFeatureDir("billing/checkout", F).dir === checkout, "resolve qualified nested ref (ddd/workspace form)");
    // ddd registry fast-path: domains.yml maps checkout → billing (O(1), authoritative)
    const reg = resolveFeatureDir("checkout", F);
    assert(reg.dir === checkout && reg.viaRegistry === true, "resolve via ddd domains.yml registry (O(1))");
    // stale registry entry (phantom → billing, but no on-disk feature) → falls through to scan → not found
    assert(resolveFeatureDir("phantom", F).dir === null, "stale registry entry falls through to disk scan");
    // not found
    assert(resolveFeatureDir("ghost", F).dir === null && resolveFeatureDir("ghost", F).candidates.length === 0, "resolve missing slug → null + 0 candidates");

    // flat-only repo still works (subsumes flat)
    const flatRoot = fs.mkdtempSync(path.join(os.tmpdir(), "forge-flat-"));
    const FF = path.join(flatRoot, "features");
    fs.mkdirSync(path.join(FF, "solo"), { recursive: true });
    fs.writeFileSync(path.join(FF, "solo", ".forge-status.yml"), "schema_version: 3\n");
    assert(enumerateFeatures(FF).length === 1, "flat-only enumerate finds 1");
    assert(resolveFeatureDir("solo", FF).dir === path.join(FF, "solo"), "flat-only resolve");
    fs.rmSync(flatRoot, { recursive: true, force: true });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }

  console.log(`\nselftest: ${pass} passed, ${fail} failed`);
  return fail === 0 ? 0 : 1;
}

if (require.main === module) {
  if (process.argv.includes("--selftest")) {
    process.exit(selftest());
  } else {
    console.log("scripts/lib-paths.js — Path-Resolution Contract (docs/runtime.md §12). Library module; run with --selftest to verify.");
  }
}
