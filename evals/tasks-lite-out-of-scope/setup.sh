#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$(dirname ".product-forge/config.yml")"
cat > ".product-forge/config.yml" <<'PF_EOF'
project_name: "eval-app"
project_tech_stack: "TypeScript, React, Node"
project_domain: "productivity"
codebase_path: "src"
features_dir: "features"
PF_EOF
mkdir -p "$(dirname "features/quick-export/.forge-status.yml")"
cat > "features/quick-export/.forge-status.yml" <<'PF_EOF'
schema_version: 3
feature: "quick-export"
created_at: "2026-10-01"
last_updated: "2026-10-01T09:00:00Z"
feature_mode: "lite"
flow_mode: "gated"
v2_native: true
phases:
  problem_discovery:
    status: "skipped"
  product_spec:
    status: "completed"
  plan:
    status: "pending"
  implement:
    status: "pending"
  verify:
    status: "pending"
gates:
  - phase: "product_spec"
    decision: "approved"
    timestamp: "2026-10-01T09:00:00Z"
    notes: ""
task_log: []
PF_EOF
mkdir -p "$(dirname "features/quick-export/product-spec/README.md")"
cat > "features/quick-export/product-spec/README.md" <<'PF_EOF'
# Quick Export — Product Spec

## Overview
Let users export their saved filters as a CSV file from the Filters page.

## User stories
- US-001 (Must): As a user, I can click "Export CSV" on the Filters page and download all my saved filters.
- US-002 (Should): As a user, the CSV includes filter name, created date and query string.

## Acceptance criteria
- AC-1: The "Export CSV" button is visible when the user has at least one saved filter.
- AC-2: The downloaded file is named filters-YYYY-MM-DD.csv and has a header row.
- AC-3: Exporting 500 filters completes in under 2 seconds.

## Out of scope
Importing filters; exporting other entities.
PF_EOF
mkdir -p "$(dirname "features/quick-export/product-spec/product-spec.md")"
cat > "features/quick-export/product-spec/product-spec.md" <<'PF_EOF'
# Quick Export — Product Spec

## Overview
Let users export their saved filters as a CSV file from the Filters page.

## User stories
- US-001 (Must): As a user, I can click "Export CSV" on the Filters page and download all my saved filters.
- US-002 (Should): As a user, the CSV includes filter name, created date and query string.

## Acceptance criteria
- AC-1: The "Export CSV" button is visible when the user has at least one saved filter.
- AC-2: The downloaded file is named filters-YYYY-MM-DD.csv and has a header row.
- AC-3: Exporting 500 filters completes in under 2 seconds.

## Out of scope
Importing filters; exporting other entities.
PF_EOF
mkdir -p "$(dirname "src/filters/filters.service.ts")"
cat > "src/filters/filters.service.ts" <<'PF_EOF'
export interface SavedFilter { id: string; name: string; createdAt: string; query: string }
export async function listSavedFilters(userId: string): Promise<SavedFilter[]> { return [] }
PF_EOF
