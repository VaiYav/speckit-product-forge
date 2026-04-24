// scripts/migrate-status-v2-to-v3.ts
//
// DEPRECATED. This TypeScript entry point has been replaced by a
// zero-dependency JavaScript script that runs with vanilla Node.js and
// requires no package manager setup:
//
//   node scripts/migrate-status-v2-to-v3.js [--dry-run] [--features-dir=features]
//
// The JS version uses only `node:fs` and needs no `package.json`, no
// `tsconfig.json`, and no external dependencies. Keeping this stub so
// existing references do not silently break — it prints a redirect and
// exits with a non-zero status so CI catches stale callers.
//
// If you had custom tooling pointing at this file, update the path to
// the `.js` sibling and run with plain `node`.

/* eslint-disable */
// @ts-nocheck
const msg = [
  "migrate-status-v2-to-v3.ts has been replaced by migrate-status-v2-to-v3.js",
  "Run: node scripts/migrate-status-v2-to-v3.js [--dry-run]",
].join("\n");
console.error(msg);
process.exit(64);
