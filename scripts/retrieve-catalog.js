// scripts/retrieve-catalog.js
//
// Thin, deterministic **retrieval** over the feature catalog. Given a query / slug /
// bounded-context / status, returns the matching feature(s) and the exact files an agent
// should open — so "what touches X?" costs one index scan + 1–3 targeted file reads
// instead of walking every feature folder.
//
// No embeddings, no network. Builds the catalog in-memory via build-catalog.js (always
// fresh), then filters. This is the deterministic Layer-3 retriever; a vector layer, if
// ever added, slots in behind the same filter() seam.
//
//   node scripts/retrieve-catalog.js --query "<text>" [--features-dir <path>] [--json] [--limit N]
//   node scripts/retrieve-catalog.js --slug <slug>
//   node scripts/retrieve-catalog.js --context <bounded_context>
//   node scripts/retrieve-catalog.js --status <status> --kind <build|documentation-only>
//   node scripts/retrieve-catalog.js --selftest

"use strict";

const fs = require("fs");
const path = require("path");
const { buildCatalog } = require("./build-catalog");

// catalog `has` token → file path relative to the feature dir
const ARTIFACT_FILES = {
  spec: "spec.md",
  plan: "plan.md",
  tasks: "tasks.md",
  "product-spec": "product-spec/product-spec.md",
  readme: "README.md",
};

function score(f, q) {
  if (!q) return 1;
  const ql = q.toLowerCase();
  const slug = f.slug.toLowerCase();
  const base = path.basename(slug);
  const name = (f.name || "").toLowerCase();
  const sum = (f.summary || "").toLowerCase();
  const bc = (f.bounded_context || "").toLowerCase();
  let s = 0;
  if (slug === ql || base === ql) s += 100;
  if (slug.includes(ql)) s += 40;
  if (name.includes(ql)) s += 30;
  if (bc && bc.includes(ql)) s += 25;
  if (sum.includes(ql)) s += 15;
  for (const t of ql.split(/\s+/).filter(Boolean)) {
    if (slug.includes(t)) s += 4;
    if (name.includes(t)) s += 5;
    if (sum.includes(t)) s += 3;
  }
  return s;
}

function retrieve(features, opts) {
  let rows = features.map((f) => ({ f, s: score(f, opts.query) }));
  if (opts.query) rows = rows.filter((x) => x.s > 0);
  if (opts.slug) rows = rows.filter((x) => x.f.slug === opts.slug || path.basename(x.f.slug) === opts.slug);
  if (opts.context) rows = rows.filter((x) => (x.f.bounded_context || "").toLowerCase() === opts.context.toLowerCase());
  if (opts.status) rows = rows.filter((x) => (x.f.status || "").toLowerCase() === opts.status.toLowerCase());
  if (opts.kind) rows = rows.filter((x) => (x.f.kind || "").toLowerCase() === opts.kind.toLowerCase());
  rows.sort((a, b) => b.s - a.s || a.f.slug.localeCompare(b.f.slug));
  return rows.map((x) => x.f);
}

function filesFor(f, featuresDir) {
  return (f.has || "").split(",").filter(Boolean)
    .map((h) => ARTIFACT_FILES[h])
    .filter(Boolean)
    .map((rel) => `${featuresDir}/${f.slug}/${rel}`);
}

function parseArgs(argv) {
  const a = { featuresDir: "features", query: "", slug: "", context: "", status: "", kind: "", json: false, limit: 5, selftest: false };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    const val = () => (argv[i].includes("=") ? argv[i].split("=").slice(1).join("=") : argv[++i]);
    if (t === "--json") a.json = true;
    else if (t === "--selftest") a.selftest = true;
    else if (t.startsWith("--query")) a.query = val();
    else if (t.startsWith("--slug")) a.slug = val();
    else if (t.startsWith("--context")) a.context = val();
    else if (t.startsWith("--status")) a.status = val();
    else if (t.startsWith("--kind")) a.kind = val();
    else if (t.startsWith("--mode")) { console.error("--mode was renamed --kind (build | documentation-only)"); process.exit(2); }
    else if (t.startsWith("--limit")) a.limit = parseInt(val(), 10) || 5;
    else if (t.startsWith("--features-dir")) a.featuresDir = val();
    else if (!t.startsWith("--") && !a.query) a.query = t; // bare positional = query
  }
  return a;
}

function runCli(argv) {
  const a = parseArgs(argv);
  if (a.selftest) return selftest();
  const featuresDir = path.resolve(a.featuresDir);
  if (!fs.existsSync(featuresDir)) { console.error(`features dir not found: ${featuresDir}`); return 2; }

  const doc = buildCatalog(featuresDir);
  const all = retrieve(doc.features, a);
  const matches = all.slice(0, a.limit);
  const enrich = (f) => ({
    slug: f.slug, name: f.name, summary: f.summary, status: f.status, kind: f.kind, feature_mode: f.feature_mode,
    bounded_context: f.bounded_context, code_path: f.code_path, ids: f.ids,
    dir: `${a.featuresDir}/${f.slug}`, files: filesFor(f, a.featuresDir),
  });

  if (a.json) {
    console.log(JSON.stringify({
      query: a.query || null, slug: a.slug || null, context: a.context || null,
      status: a.status || null, kind: a.kind || null,
      total: all.length, shown: matches.length, matches: matches.map(enrich),
    }, null, 2));
    return 0;
  }

  const crit = a.query ? `"${a.query}"` : [a.slug && `slug=${a.slug}`, a.context && `context=${a.context}`,
    a.status && `status=${a.status}`, a.kind && `kind=${a.kind}`].filter(Boolean).join(" ") || "(all)";
  if (!matches.length) {
    console.log(`No feature matches ${crit}. Try a broader --query, or run /speckit.product-forge.catalog to (re)build the index.`);
    return 0;
  }
  console.log(`${all.length} match(es) for ${crit}${all.length > matches.length ? ` (showing ${matches.length})` : ""}:\n`);
  for (const f of matches) {
    const e = enrich(f);
    console.log(`▸ ${e.slug}   [${e.status}] ${e.kind}${e.feature_mode ? ` · ${e.feature_mode}` : ""}${e.bounded_context ? ` · ctx=${e.bounded_context}` : ""}`);
    if (e.summary && e.summary !== "(no summary found)") console.log(`  ${e.summary}`);
    if (e.code_path) console.log(`  code: ${e.code_path}`);
    if (e.files.length) console.log(`  open: ${e.files.join("  ")}`);
    console.log("");
  }
  console.log("Read only the files above — they are the minimal slice for this query.");
  return 0;
}

module.exports = { retrieve, score, filesFor };

// ── Self-test (filesystem fixture) ──────────────────────────────────────────
function selftest() {
  const os = require("os");
  let pass = 0, fail = 0;
  const assert = (cond, name) => { if (cond) pass++; else { fail++; console.error("  ✗ " + name); } };
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "forge-retrieve-"));
  const F = path.join(root, "features");
  const mk = (slug, status, files = {}) => {
    const dir = path.join(F, slug);
    fs.mkdirSync(dir, { recursive: true });
    if (status != null) fs.writeFileSync(path.join(dir, ".forge-status.yml"), status);
    for (const [n, b] of Object.entries(files)) fs.writeFileSync(path.join(dir, n), b);
  };
  try {
    mk("001-payments-module", "schema_version: 3\nstatus: tasks\nsource_code: back/src/modules/payments/\nphases:\n  plan: completed\n",
      { "spec.md": "# Spec: Payments Module\n\n## Feature Overview\n\nRevenueCat billing migration. FR-001.\n", "plan.md": "x", "tasks.md": "x" });
    mk("002-onboarding-v3", "schema_version: 3\nstatus: plan\n",
      { "README.md": "# Onboarding V3\n\n## Summary\n\nNew onboarding funnel.\n" });
    mk("003-astrology", "schema_version: 3\nmode: documentation-only\nsource_code: back/src/modules/astrology/\n",
      { "spec.md": "# Spec: Astrology\n\n## Feature Overview\n\nNatal charts and transits.\n" });
    const { buildCatalog } = require("./build-catalog");
    const feats = buildCatalog(F).features;

    const q1 = retrieve(feats, { query: "payments" });
    assert(q1.length >= 1 && q1[0].slug === "001-payments-module", "query 'payments' ranks the payments feature first");

    const files = filesFor(q1[0], "features");
    assert(files.includes("features/001-payments-module/spec.md") && files.includes("features/001-payments-module/plan.md"),
      "filesFor maps the artifact map to real paths");

    const bySlug = retrieve(feats, { slug: "002-onboarding-v3" });
    assert(bySlug.length === 1 && bySlug[0].slug === "002-onboarding-v3", "filter by exact slug");

    const byCtx = retrieve(feats, { context: "astrology" });
    assert(byCtx.length === 1 && byCtx[0].slug === "003-astrology", "filter by bounded context");

    const byKind = retrieve(feats, { kind: "documentation-only" });
    assert(byKind.length === 1 && byKind[0].slug === "003-astrology", "filter by kind");

    const none = retrieve(feats, { query: "zzz-nonexistent-token" });
    assert(none.length === 0, "no false matches for an absent token");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  console.log(`\nselftest: ${pass} passed, ${fail} failed`);
  return fail === 0 ? 0 : 1;
}

if (require.main === module) process.exit(runCli(process.argv.slice(2)));
