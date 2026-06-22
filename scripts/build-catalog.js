// scripts/build-catalog.js
//
// Builds the **feature catalog carrier** — a compact, machine-readable index over
// every feature managed by Product Forge, written to `{features_dir}/_portfolio/catalog.yml`.
//
// Purpose: give agents and humans ONE small file to read first (slug → summary →
// status → code path → IDs), instead of re-walking every feature folder. It is a
// CACHE/CARRIER over the existing sources — it never mutates a feature.
//
// Source of truth per feature (best-effort, with fallbacks): .forge-status.yml,
// spec.md, product-spec/product-spec.md, plan.md, README.md. Enumeration uses the
// Path-Resolution Contract (docs/runtime.md §12) via lib-paths so flat and
// domain-nested layouts both work.
//
// Deterministic, zero-dependency (shares lib-paths + lib-yaml), no LLM, no network.
//
//   node scripts/build-catalog.js [--features-dir <path>]   # write the carrier
//   node scripts/build-catalog.js --check [--features-dir <path>]   # CI/doctor gate
//   node scripts/build-catalog.js --selftest                # filesystem fixture test
//
// --check exits non-zero when the on-disk carrier is STALE (≠ a fresh build) or
// when any .forge-status.yml is malformed (duplicate keys). Data-quality warnings
// (duplicate feature numbers, missing summaries) are reported but do not fail.

"use strict";

const fs = require("fs");
const path = require("path");
const { enumerateFeatures } = require("./lib-paths");
const { parseYaml } = require("./lib-yaml");

const SCHEMA = 1;
const readText = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return null; } };

// ── Deterministic duplicate-mapping-key scanner ─────────────────────────────
// lib-yaml is last-key-wins (silent); strict YAML parsers reject duplicate keys.
// We surface them as a lint finding without pulling in a full YAML engine. Kept
// conservative (identifier-like keys only; sequence items reset child scope) to
// avoid flagging prose inside folded scalars.
function findDuplicateKeys(text) {
  if (!text) return [];
  const dups = [];
  const stack = []; // frames: { indent, keys:Set }
  const lines = text.split(/\r?\n/);
  const KEY = /^("[^"]*"|'[^']*'|[A-Za-z_][\w.\-]*)\s*:(\s|$)/;
  lines.forEach((raw, i) => {
    const noTab = raw.replace(/\t/g, "  ");
    const trimmed = noTab.trim();
    if (!trimmed || trimmed === "---" || trimmed.startsWith("#")) return;
    const indent = noTab.length - noTab.trimStart().length;
    if (trimmed.startsWith("- ") || trimmed === "-") {
      while (stack.length && stack[stack.length - 1].indent > indent) stack.pop();
      const after = trimmed === "-" ? "" : trimmed.slice(2);
      const m = after.match(KEY);
      if (m) {
        stack.push({ indent: indent + 2, keys: new Set([m[1].replace(/^['"]|['"]$/g, "")]) });
      }
      return;
    }
    const m = noTab.trimStart().match(KEY);
    if (!m) return;
    const key = m[1].replace(/^['"]|['"]$/g, "");
    while (stack.length && stack[stack.length - 1].indent > indent) stack.pop();
    const top = stack[stack.length - 1];
    if (top && top.indent === indent) {
      if (top.keys.has(key)) dups.push({ key, line: i + 1 });
      else top.keys.add(key);
    } else {
      stack.push({ indent, keys: new Set([key]) });
    }
  });
  return dups;
}

function loadStatus(p) {
  const raw = readText(p);
  if (raw == null) return { present: false, data: null, dups: [] };
  const dups = findDuplicateKeys(raw);
  let data = null;
  try { data = parseYaml(raw) || {}; } catch { data = null; }
  return { present: true, data: data && typeof data === "object" ? data : {}, dups };
}

// ── Text extraction helpers ─────────────────────────────────────────────────
function firstParagraphAfter(md, headingRegexes) {
  if (!md) return null;
  const lines = md.split(/\r?\n/);
  for (const re of headingRegexes) {
    for (let i = 0; i < lines.length; i++) {
      if (!re.test(lines[i])) continue;
      const buf = [];
      for (let j = i + 1; j < lines.length; j++) {
        const l = lines[j].trim();
        if (!l) { if (buf.length) break; else continue; }
        if (/^#{1,6}\s/.test(l)) { if (buf.length) break; else continue; }
        if (l.startsWith(">") || l.startsWith("---")) continue;
        if (l.startsWith("|")) { if (buf.length) break; else continue; }
        buf.push(l);
        if (buf.join(" ").length > 400) break;
      }
      if (buf.length) return buf.join(" ");
    }
  }
  return null;
}

function cleanSummary(s) {
  if (!s || typeof s !== "string") return null;
  s = s.replace(/\s+/g, " ").trim()
    .replace(/\*\*/g, "").replace(/`/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
  if (s.length > 220) {
    const cut = s.slice(0, 220);
    const lastDot = cut.lastIndexOf(". ");
    s = lastDot > 80 ? cut.slice(0, lastDot + 1) : cut.trim() + "…";
  }
  return s || null;
}

function h1Name(md) {
  if (!md) return null;
  const m = md.match(/^#\s+(.+)$/m);
  if (!m) return null;
  const t = m[1].trim()
    .replace(/^spec(ification)?\s*[:—-]\s*/i, "")
    .replace(/^spec\.md\s*[—-]\s*/i, "")
    .replace(/^feature[:\s]*\d*\s*[:—-]?\s*/i, "")
    .replace(/\s*[—-]\s*Product Forge.*$/i, "")
    .replace(/`/g, "").replace(/"/g, "'").trim();
  return t || null;
}

const prettifySlug = (slug) =>
  slug.replace(/^\d{3}-/, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const DONE = new Set(["completed", "approved", "conditionally_ready", "conditionally_approved",
  "approved_with_conditions", "completed_with_known_issues", "ready", "done"]);

function derivePhase(phases) {
  if (!phases || typeof phases !== "object") return { done: 0, total: 0, stage: null };
  let done = 0, total = 0, stage = null;
  for (const k of Object.keys(phases)) {
    let v = phases[k];
    if (v && typeof v === "object") v = v.status; // schema v3: phases.<name>.status
    v = String(v ?? "").toLowerCase();
    total++;
    if (DONE.has(v)) { done++; stage = k; }
  }
  return { done, total, stage };
}

function countIds(texts) {
  const join = texts.filter(Boolean).join("\n");
  const uniq = (re) => new Set((join.match(re) || []).map((s) => s.toUpperCase())).size;
  return { REQ: uniq(/\bREQ-\d+/g), FR: uniq(/\bFR-\d+/g), US: uniq(/\bUS-\d+/g) };
}

function relcode(text) {
  if (!text) return null;
  const m = text.match(/\bback\/src\/[\w./-]+/) || text.match(/\bfront\/src\/[\w./-]+/);
  return m ? m[0].replace(/[)\s`*.]+$/, "") : null;
}

// ── Build ────────────────────────────────────────────────────────────────────
function buildFeature(dir, featuresDir) {
  const slug = path.relative(featuresDir, dir).split(path.sep).join("/");
  const st = loadStatus(path.join(dir, ".forge-status.yml"));
  const f = st.data || {};
  const readme = readText(path.join(dir, "README.md"));
  const spec = readText(path.join(dir, "spec.md"));
  const prodspec = readText(path.join(dir, "product-spec", "product-spec.md"));
  const plan = readText(path.join(dir, "plan.md"));

  const name = f.display_name || f.feature_name || h1Name(spec) || h1Name(readme) || prettifySlug(path.basename(slug));

  let summary = firstParagraphAfter(readme, [/^##\s+(feature\s+summary|summary|overview)\b/i]);
  if (!summary) summary = firstParagraphAfter(spec, [/^##\s+(feature\s+overview|overview|\d+\.\s*feature\s+description)\b/i]);
  if (!summary && typeof f.description === "string") summary = f.description;
  if (!summary && f.problem && typeof f.problem.statement === "string") summary = f.problem.statement;
  if (!summary) summary = firstParagraphAfter(prodspec, [/^##\s+(overview|summary|\d+\.\s*overview)\b/i]);
  if (!summary) summary = firstParagraphAfter(readme, [/^---\s*$/]);
  summary = cleanSummary(summary);

  let mode = "build";
  if (typeof f.mode === "string" && f.mode) mode = f.mode;
  else if (/documentation-only/i.test((spec || "") + (readme || ""))) mode = "documentation-only";

  const code_path = f.source_code || relcode(readme) || relcode(spec) || null;
  const bc = code_path && code_path.match(/back\/src\/modules\/([\w-]+)/);

  const ph = derivePhase(f.phases);
  const status = (typeof f.status === "string" && f.status) ? f.status : (ph.stage || "unknown");

  return {
    slug,
    base_slug: (typeof f.slug === "string" && f.slug) ? f.slug : path.basename(slug).replace(/^\d{3}-/, ""),
    record: {
      slug,
      name,
      summary: summary || "(no summary found)",
      mode,
      speckit_mode: f.speckit_mode || null,
      status,
      phases: ph.total ? `${ph.done}/${ph.total}` : null,
      code_path,
      bounded_context: bc ? bc[1] : null,
      ids: countIds([spec, prodspec, plan]),
      has: [spec && "spec", plan && "plan",
        fs.existsSync(path.join(dir, "tasks.md")) && "tasks",
        prodspec && "product-spec", readme && "readme"].filter(Boolean).join(","),
      status_file: !st.present ? false : (st.dups.length ? "malformed" : true),
      created: f.created || f.created_at || null,
    },
    dups: st.dups,
  };
}

function buildCatalog(featuresDir) {
  const dirs = enumerateFeatures(featuresDir);
  const features = [];
  const numberMap = {};
  const slugMap = {};
  const malformed = [];

  for (const dir of dirs) {
    const r = buildFeature(dir, featuresDir);
    features.push(r.record);
    const base = path.basename(r.slug);
    const num = /^(\d{3})-/.test(base) ? base.slice(0, 3) : null;
    if (num) (numberMap[num] ||= []).push(r.slug);
    (slugMap[r.base_slug] ||= []).push(r.slug);
    if (r.dups.length) {
      malformed.push({ slug: r.slug, file: ".forge-status.yml",
        issue: `duplicate mapping key(s): ${r.dups.map((d) => `${d.key}@L${d.line}`).join(", ")}` });
    }
  }

  const onlyDup = (m) => Object.fromEntries(Object.entries(m).filter(([, v]) => v.length > 1));

  return {
    _generated: {
      by: "scripts/build-catalog.js",
      at: new Date().toISOString(),
      schema: SCHEMA,
      note: "AUTO-GENERATED carrier over features/. Read this first; open feature folders only as needed. Regenerate: node scripts/build-catalog.js",
      feature_count: features.length,
      with_status_file: features.filter((f) => f.status_file === true).length,
      malformed_status_file: malformed.length,
      missing_status_file: features.filter((f) => f.status_file === false).length,
      no_summary: features.filter((f) => f.summary === "(no summary found)").length,
    },
    lint: {
      note: "Status files with YAML problems (duplicate keys) — parsed leniently here, but they break strict tooling. Fix at source.",
      malformed_status_files: malformed,
    },
    collisions: {
      duplicate_feature_numbers: onlyDup(numberMap),
      duplicate_slugs: onlyDup(slugMap),
    },
    features,
  };
}

// ── Minimal YAML emitter (sized to the shapes above; lib-yaml round-trippable) ─
function emitScalar(v) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  const s = String(v).replace(/\\/g, "/").replace(/"/g, "'")
    .replace(/[\x00-\x1f]+/g, " ").replace(/\s+/g, " ").trim();
  return `"${s}"`;
}
const isScalar = (v) => v === null || typeof v !== "object";
const emitKey = (k) => /^[A-Za-z_][A-Za-z0-9_.\-]*$/.test(k) ? k : `"${String(k).replace(/"/g, "'")}"`;

function emit(value, indent, lines) {
  const pad = "  ".repeat(indent);
  if (Array.isArray(value)) {
    for (const item of value) {
      if (isScalar(item)) { lines.push(`${pad}- ${emitScalar(item)}`); continue; }
      const keys = Object.keys(item);
      if (!keys.length) { lines.push(`${pad}- {}`); continue; }
      keys.forEach((k, i) => {
        const v = item[k];
        const head = i === 0 ? `${pad}- ` : "  ".repeat(indent + 1);
        if (isScalar(v) || (Array.isArray(v) && !v.length)) {
          lines.push(`${head}${emitKey(k)}: ${Array.isArray(v) ? "[]" : emitScalar(v)}`);
        } else {
          lines.push(`${head}${emitKey(k)}:`);
          emit(v, indent + 2, lines);
        }
      });
    }
  } else {
    for (const k of Object.keys(value)) {
      const v = value[k];
      if (Array.isArray(v) && !v.length) lines.push(`${pad}${emitKey(k)}: []`);
      else if (v && typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length) lines.push(`${pad}${emitKey(k)}: {}`);
      else if (isScalar(v)) lines.push(`${pad}${emitKey(k)}: ${emitScalar(v)}`);
      else { lines.push(`${pad}${emitKey(k)}:`); emit(v, indent + 1, lines); }
    }
  }
}

const HEADER =
  "# ============================================================\n" +
  "# _portfolio/catalog.yml — AUTO-GENERATED carrier. Do not edit by hand.\n" +
  "# Producer: scripts/build-catalog.js   Consumer: commands/portfolio.md\n" +
  "# Regenerate: node scripts/build-catalog.js   Verify: --check\n" +
  "# ============================================================\n";

function serialize(doc) {
  const lines = [];
  emit(doc, 0, lines);
  return HEADER + lines.join("\n") + "\n";
}

function defaultOut(featuresDir) { return path.join(featuresDir, "_portfolio", "catalog.yml"); }
const stripTs = (s) => s.replace(/^\s*at: .*$/m, "  at: <ts>");

// ── CLI ───────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const a = { featuresDir: "features", out: null, check: false, selftest: false };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--check") a.check = true;
    else if (t === "--selftest") a.selftest = true;
    else if (t === "--features-dir") a.featuresDir = argv[++i];
    else if (t.startsWith("--features-dir=")) a.featuresDir = t.slice(15);
    else if (t === "--out") a.out = argv[++i];
    else if (t.startsWith("--out=")) a.out = t.slice(6);
  }
  return a;
}

function runCli(argv) {
  const a = parseArgs(argv);
  if (a.selftest) return selftest();
  const featuresDir = path.resolve(a.featuresDir);
  if (!fs.existsSync(featuresDir)) {
    console.error(`features dir not found: ${featuresDir}`);
    return 2;
  }
  const out = a.out ? path.resolve(a.out) : defaultOut(featuresDir);
  const doc = buildCatalog(featuresDir);
  const fresh = serialize(doc);
  const g = doc._generated;

  if (a.check) {
    const existing = readText(out) || "";
    const stale = stripTs(fresh) !== stripTs(existing);
    const errors = g.malformed_status_file > 0;
    if (stale) console.error(`STALE: ${path.relative(process.cwd(), out)} differs from a fresh build — run: node scripts/build-catalog.js`);
    if (errors) {
      console.error(`MALFORMED: ${g.malformed_status_file} .forge-status.yml file(s) have duplicate keys:`);
      for (const m of doc.lint.malformed_status_files) console.error(`  - ${m.slug}: ${m.issue}`);
    }
    const dn = Object.keys(doc.collisions.duplicate_feature_numbers).length;
    if (dn) console.error(`WARN: ${dn} duplicate feature number(s): ${Object.keys(doc.collisions.duplicate_feature_numbers).join(", ")}`);
    if (g.no_summary) console.error(`WARN: ${g.no_summary}/${g.feature_count} feature(s) have no extractable summary`);
    if (!stale && !errors) console.log(`catalog OK: ${g.feature_count} features, ${g.with_status_file} with status (${dn} dup-number, ${g.no_summary} no-summary warnings)`);
    return (stale || errors) ? 1 : 0;
  }

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, fresh);
  console.log(`Wrote ${path.relative(process.cwd(), out)}`);
  console.log(`features=${g.feature_count} with_status=${g.with_status_file} malformed=${g.malformed_status_file} ` +
    `missing=${g.missing_status_file} no_summary=${g.no_summary} ` +
    `dup_numbers=${Object.keys(doc.collisions.duplicate_feature_numbers).length}`);
  return 0;
}

module.exports = { buildCatalog, serialize, findDuplicateKeys, defaultOut };

// ── Self-test (filesystem fixture) ──────────────────────────────────────────
function selftest() {
  const os = require("os");
  let pass = 0, fail = 0;
  const assert = (cond, name) => { if (cond) pass++; else { fail++; console.error("  ✗ " + name); } };
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "forge-catalog-"));
  const F = path.join(root, "features");
  const mk = (slug, status, extra = {}) => {
    const dir = path.join(F, slug);
    fs.mkdirSync(dir, { recursive: true });
    if (status != null) fs.writeFileSync(path.join(dir, ".forge-status.yml"), status);
    for (const [name, body] of Object.entries(extra)) fs.writeFileSync(path.join(dir, name), body);
  };
  try {
    mk("001-alpha", "schema_version: 3\nstatus: tasks\nphases:\n  research: completed\n  plan: completed\n",
      { "spec.md": "# Spec: Alpha\n\n## Feature Overview\n\nAlpha does the thing. REQ-001 and FR-001 and US-001.\n" });
    mk("005-one", "schema_version: 3\nstatus: plan\n");
    mk("005-two", "schema_version: 3\nstatus: research\n");      // dup number 005
    mk("009-doc", "schema_version: 3\nmode: documentation-only\nsource_code: back/src/modules/astro/\nphases:\n  research: completed\n");
    mk("042-bad", "schema_version: 3\nstatus: a\nstatus: b\nstatus: c\n"); // duplicate key
    mk("_archived", null); fs.mkdirSync(path.join(F, "_archived", "old"), { recursive: true });
    fs.writeFileSync(path.join(F, "_archived", "old", ".forge-status.yml"), "schema_version: 3\n");

    const doc = buildCatalog(F);
    assert(doc.features.length === 5, "enumerates 5 features, excludes _archived (got " + doc.features.length + ")");
    const alpha = doc.features.find((f) => f.slug === "001-alpha");
    assert(alpha && alpha.name === "Alpha", "extracts H1 name");
    assert(alpha && /Alpha does the thing/.test(alpha.summary), "extracts summary from spec");
    assert(alpha && alpha.ids.REQ === 1 && alpha.ids.FR === 1 && alpha.ids.US === 1, "counts REQ/FR/US ids");
    assert(alpha && alpha.phases === "2/2", "derives phase progress");
    const doc9 = doc.features.find((f) => f.slug === "009-doc");
    assert(doc9 && doc9.mode === "documentation-only", "detects documentation-only mode");
    assert(doc9 && doc9.bounded_context === "astro", "derives bounded context from code path");
    assert(Object.keys(doc.collisions.duplicate_feature_numbers).includes("005"), "flags duplicate feature number 005");
    assert(doc.lint.malformed_status_files.some((m) => m.slug === "042-bad"), "flags malformed (duplicate-key) status file");
    assert(doc.features.find((f) => f.slug === "042-bad").status_file === "malformed", "marks malformed status_file");

    // round-trip: emitted YAML must re-parse with lib-yaml without throwing
    const yamlText = serialize(doc);
    let reparsed = null;
    try { reparsed = parseYaml(yamlText.split("\n").filter((l) => !l.startsWith("#")).join("\n")); } catch (e) { reparsed = { __err: String(e.message) }; }
    assert(reparsed && Array.isArray(reparsed.features) && reparsed.features.length === 5, "emitted YAML round-trips through lib-yaml");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  console.log(`\nselftest: ${pass} passed, ${fail} failed`);
  return fail === 0 ? 0 : 1;
}

if (require.main === module) process.exit(runCli(process.argv.slice(2)));
