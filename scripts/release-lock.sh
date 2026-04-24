#!/usr/bin/env bash
# scripts/release-lock.sh
#
# Releases the state lock acquired by scripts/acquire-lock.sh.
# Safe to call even if the lock is absent (idempotent).
#
# Usage:
#   scripts/release-lock.sh <feature-dir> [<session-id>]
#
# Intended usage from a sub-skill shell runner:
#
#   trap 'scripts/release-lock.sh "$FEATURE_DIR" "$FORGE_SESSION_ID"' EXIT INT TERM
#   scripts/acquire-lock.sh "$FEATURE_DIR" 1800 "$FORGE_SESSION_ID"
#   # ... mutate .forge-status.yml ...
#
# Behavior:
#   - Exits 0 in all non-error cases (missing lock is fine).
#   - If <session-id> is provided and the lock payload's session_id does
#     not match, refuses to delete and exits 1 — this prevents releasing
#     another writer's lock after a takeover race.

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <feature-dir> [<session-id>]" >&2
  exit 64
fi

feature_dir="$1"
expected_session_id="${2:-}"
lock_path="$feature_dir/.forge-status.yml.lock"

if [[ ! -e "$lock_path" ]]; then
  # Nothing to release — idempotent no-op.
  exit 0
fi

if [[ -n "$expected_session_id" && -r "$lock_path" ]]; then
  existing_session_id="$(grep -oE '"session_id"[[:space:]]*:[[:space:]]*"[^"]+"' "$lock_path" 2>/dev/null \
    | head -n1 \
    | sed -E 's/.*"session_id"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/')" || existing_session_id=""
  if [[ -n "$existing_session_id" && "$existing_session_id" != "$expected_session_id" ]]; then
    echo "refusing to release: lock held by different session ($existing_session_id != $expected_session_id)" >&2
    exit 1
  fi
fi

rm -f "$lock_path"
echo "lock released: $lock_path" >&2
exit 0
