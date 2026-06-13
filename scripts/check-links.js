#!/usr/bin/env node
// scripts/check-links.js
//
// Best-effort external-link liveness checker for the Product Forge doc corpus.
//
// lint-docs.js validates INTERNAL refs (relative paths, anchors). This checks
// EXTERNAL http(s) URLs — install commands, archive/refs/tags zips, upstream
// repos (v-model, OpenSpec, spec-kit) — that go stale silently and break the
// install instructions a user copy-pastes.
//
// Network-dependent and therefore ADVISORY: it is wired into CI as a
// `continue-on-error` job and exits 0 by default even on dead links (use
// --strict to make dead links a non-zero exit for a dedicated link-audit run).
// Zero-dependency: uses Node 18+/22 built-in global fetch.
//
// Usage:
//   node scripts/check-links.js [--strict] [--json] [--timeout <ms>] [--root <dir>]
//   node scripts/check-links.js --selftest      # offline: only exercises extraction
//
// Exit codes: 0 = ok (or advisory mode with dead links), 1 = dead links in
// --strict, 2 = usage error.

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const read = (p) => fs.readFileSync(p, "utf8");
const exists = (p) => fs.existsSync(p);

function walk(dir, out = []) {
  if (!exists(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".git")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(md|ya?ml)$/.test(e.name)) out.push(p);
  }
  return out;
}

// Extract distinct external http(s) URLs from the corpus, with the files each
// appears in. Strips trailing markdown/punctuation so the URL is clean.
function collectUrls(root) {
  const files = [
    ...walk(path.join(root, "commands")),
    ...walk(path.join(root, "docs")),
    ...["README.md", "CHANGELOG.md", "CONTRIBUTING.md"].map((f) => path.join(root, f)).filter(exists),
  ];
  const urlRe = /https?:\/\/[^\s)\]}>"'`]+/g;
  const map = new Map(); // url -> Set(files)
  for (const f of files) {
    const rel = path.relative(root, f);
    for (const raw of read(f).match(urlRe) || []) {
      const url = raw.replace(/[.,;:]+$/, "");      // trailing sentence punctuation
      if (IGNORE_URL(url)) continue;                // skip illustrative/placeholder/own-repo
      if (!map.has(url)) map.set(url, new Set());
      map.get(url).add(rel);
    }
  }
  return map;
}

// URLs that are illustrative/placeholder, not real links to check:
// localhost & example hosts (command prose uses them as sample endpoints),
// anything with a <placeholder> token, and the project's own GitHub repo
// (its release/compare/tag URLs 404 until the repo is public + tagged — not
// our liveness concern, and they'd produce constant noise).
const IGNORE_URL = (url) =>
  /\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|.*\.example\.com|example\.com|example\.org|staging\.myapp\.com|.*\.myapp\.com)(:|\/|$)/.test(url) ||
  /[<>{]/.test(url) ||                                   // placeholder tokens like <pkg>, {id}
  /github\.com\/VaiYav\/speckit-product-forge/.test(url); // own repo (may be private/untagged)

async function probe(url, timeoutMs) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    // Try HEAD first; some hosts reject HEAD → fall back to GET.
    let r = await fetch(url, { method: "HEAD", redirect: "follow", signal: ctl.signal });
    if (r.status === 405 || r.status === 403 || r.status === 501) {
      r = await fetch(url, { method: "GET", redirect: "follow", signal: ctl.signal });
    }
    return { ok: r.status < 400, status: r.status };
  } catch (e) {
    return { ok: false, status: 0, error: (e && e.name === "AbortError") ? "timeout" : (e && e.message) || "error" };
  } finally {
    clearTimeout(t);
  }
}

async function run(root, { strict, json, timeout }) {
  const map = collectUrls(root);
  const urls = [...map.keys()].sort();
  const dead = [];
  const results = [];
  // Modest concurrency to be polite and avoid rate-limit false-deads.
  const CONCURRENCY = 6;
  let i = 0;
  async function worker() {
    while (i < urls.length) {
      const url = urls[i++];
      const res = await probe(url, timeout);
      const entry = { url, status: res.status, ok: res.ok, error: res.error, files: [...map.get(url)] };
      results.push(entry);
      if (!res.ok) dead.push(entry);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, urls.length) }, worker));

  if (json) {
    console.log(JSON.stringify({ checked: urls.length, dead: dead.length, results }, null, 2));
  } else {
    console.log(`check-links: probed ${urls.length} external URL(s) — ${dead.length} unreachable`);
    for (const d of dead.sort((a, b) => a.url.localeCompare(b.url))) {
      console.log(`  ✗ [${d.status || d.error}] ${d.url}`);
      console.log(`      in: ${d.files.join(", ")}`);
    }
    if (dead.length === 0) console.log("  ✅ all external links reachable");
  }
  return dead.length;
}

function parseArgs(argv) {
  const o = { strict: false, json: false, timeout: 10000, root: process.cwd(), selftest: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--strict") o.strict = true;
    else if (a === "--json") o.json = true;
    else if (a === "--selftest") o.selftest = true;
    else if (a === "--timeout") o.timeout = parseInt(argv[++i], 10) || 10000;
    else if (a === "--root") o.root = path.resolve(argv[++i]);
    else if (a === "--help" || a === "-h") { console.log("Usage: node scripts/check-links.js [--strict] [--json] [--timeout ms] [--root dir]"); process.exit(0); }
    else { console.error("Unknown argument: " + a); process.exit(2); }
  }
  return o;
}

// Offline self-test: exercises URL extraction + punctuation stripping only
// (no network), so it is deterministic in CI.
function selftest() {
  const os = require("node:os");
  let pass = 0, fail = 0;
  const assert = (c, n) => { if (c) pass++; else { fail++; console.error("  ✗ " + n); } };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pf-links-"));
  try {
    fs.mkdirSync(path.join(tmp, "docs"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "README.md"), "see https://nodejs.org/a and [x](https://nodejs.org/b).\nrepeat https://nodejs.org/a\nlocal http://localhost:3000 ignored\nplaceholder https://api.npmjs.org/x/<pkg> ignored\n");
    fs.writeFileSync(path.join(tmp, "docs", "d.md"), "ref <https://golang.org/c> done\n");
    const map = collectUrls(tmp);
    assert(map.has("https://nodejs.org/a"), "extracts a bare url");
    assert(map.has("https://nodejs.org/b"), "extracts a markdown-link url without trailing )");
    assert(map.has("https://golang.org/c"), "extracts an angle-bracketed url without trailing >");
    assert(!map.has("https://nodejs.org/b)."), "strips trailing markdown/punctuation");
    assert(map.get("https://nodejs.org/a").size === 1, "dedupes repeated url to one file entry");
    assert(![...map.keys()].some((u) => /localhost/.test(u)), "ignores localhost host");
    assert(![...map.keys()].some((u) => /<pkg>/.test(u)), "ignores placeholder-token url");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log(`\nselftest: ${pass} passed, ${fail} failed`);
  return fail === 0 ? 0 : 1;
}

async function main() {
  const o = parseArgs(process.argv);
  if (o.selftest) process.exit(selftest());
  if (typeof fetch !== "function") {
    console.error("check-links: global fetch unavailable (needs Node >= 18) — skipping.");
    process.exit(0); // advisory: never block on environment
  }
  const dead = await run(o.root, o);
  process.exit(o.strict && dead > 0 ? 1 : 0);
}

if (require.main === module) main();
module.exports = { collectUrls, IGNORE_URL };
