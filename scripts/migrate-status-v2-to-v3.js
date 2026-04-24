#!/usr/bin/env node
// scripts/migrate-status-v2-to-v3.js
//
// Zero-dependency helper that stamps `schema_version: 3` on every existing
// `.forge-status.yml` under `features/`. Safe to run multiple times.
//
// Usage:
//   node scripts/migrate-status-v2-to-v3.js [--dry-run] [--features-dir=features]
//
// Design notes:
// - Uses only the Node.js built-in `fs` module — no external packages required.
// - Intentionally does NOT parse YAML. Instead it inspects the file line-by-line
//   looking for an existing `schema_version:` key at column 0. If present with
//   value `3`, the file is left alone. If present with any other value, the
//   value is replaced in place. If absent, the key is prepended.
// - This line-oriented approach survives any YAML style (nested, flow, comments)
//   because `schema_version` is always a top-level key by contract.
// - No other fields are touched. New v3 fields are populated lazily by v2-aware
//   sub-skills as they run.

"use strict";

const fs = require("node:fs");
const path = require("node:path");

function parseArgs(argv) {
  const opts = { dryRun: false, featuresDir: "features" };
  for (const arg of argv.slice(2)) {
    if (arg === "--dry-run") {
      opts.dryRun = true;
    } else if (arg.startsWith("--features-dir=")) {
      opts.featuresDir = arg.slice("--features-dir=".length);
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      printHelp();
      process.exit(2);
    }
  }
  return opts;
}

function printHelp() {
  console.log(
    [
      "Usage: node scripts/migrate-status-v2-to-v3.js [--dry-run] [--features-dir=features]",
      "",
      "Stamps `schema_version: 3` on every features/*/.forge-status.yml that is",
      "missing it or has an older value. Idempotent.",
    ].join("\n"),
  );
}

function findStatusFiles(rootDir) {
  // Find every `.forge-status.yml` exactly one level below rootDir.
  const out = [];
  let entries;
  try {
    entries = fs.readdirSync(rootDir, { withFileTypes: true });
  } catch (err) {
    const reason = err && err.message ? err.message : String(err);
    throw new Error(`Cannot read features directory at ${rootDir}: ${reason}`);
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(rootDir, entry.name, ".forge-status.yml");
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      out.push(candidate);
    }
  }
  return out;
}

// Returns one of: "up-to-date" | "upgraded" | "stamped".
function stampSchemaVersion(rawText) {
  const lines = rawText.split(/\r?\n/);

  // Match a top-level `schema_version:` (no leading whitespace) followed by
  // the value (possibly quoted) up to an optional trailing comment.
  const versionLineRegex = /^schema_version\s*:\s*("?)(\d+)\1\s*(#.*)?$/;

  let foundIndex = -1;
  let foundValue = null;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(versionLineRegex);
    if (m) {
      foundIndex = i;
      foundValue = parseInt(m[2], 10);
      break;
    }
  }

  if (foundIndex >= 0 && foundValue === 3) {
    return { outcome: "up-to-date", text: rawText };
  }

  if (foundIndex >= 0) {
    // Replace the existing line with schema_version: 3, preserving a
    // possible trailing comment.
    const trailingCommentMatch = lines[foundIndex].match(/(#.*)$/);
    const trailingComment = trailingCommentMatch ? " " + trailingCommentMatch[1] : "";
    lines[foundIndex] = `schema_version: 3${trailingComment}`;
    return { outcome: "upgraded", text: lines.join("\n") };
  }

  // No schema_version key at all — prepend one.
  // Preserve YAML header line (`---`) if present at the top.
  let insertIndex = 0;
  if (lines.length > 0 && lines[0].trim() === "---") {
    insertIndex = 1;
  }
  lines.splice(insertIndex, 0, "schema_version: 3");
  return { outcome: "stamped", text: lines.join("\n") };
}

function migrateOne(filePath, dryRun) {
  const raw = fs.readFileSync(filePath, "utf8");
  const result = stampSchemaVersion(raw);

  if (result.outcome === "up-to-date") return "skipped";
  if (!dryRun) fs.writeFileSync(filePath, result.text, "utf8");
  return result.outcome; // "upgraded" or "stamped"
}

function main() {
  const opts = parseArgs(process.argv);
  const root = path.resolve(opts.featuresDir);

  let statusFiles;
  try {
    statusFiles = findStatusFiles(root);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  if (statusFiles.length === 0) {
    console.log(`No .forge-status.yml files found under ${root}. Nothing to migrate.`);
    return;
  }

  const counts = { skipped: 0, upgraded: 0, stamped: 0 };
  for (const file of statusFiles) {
    try {
      const outcome = migrateOne(file, opts.dryRun);
      counts[outcome] += 1;
      if (outcome !== "skipped") {
        const verb = opts.dryRun ? "would " : "";
        console.log(`${verb}${outcome === "stamped" ? "stamp" : "upgrade"}: ${file}`);
      }
    } catch (err) {
      console.error(`ERROR processing ${file}: ${err && err.message ? err.message : err}`);
      process.exitCode = 1;
    }
  }

  const prefix = opts.dryRun ? "[dry-run] " : "";
  console.log(
    `\n${prefix}Done. ` +
      `${counts.stamped} stamped (no prior version), ` +
      `${counts.upgraded} upgraded (older version), ` +
      `${counts.skipped} already at v3.`,
  );
}

main();
