#!/usr/bin/env bash
# scripts/acquire-lock.sh
#
# Best-effort file lock for `.forge-status.yml`. Provides shell primitives
# that sub-skills can invoke before mutating the status file, making the
# protocol in docs/runtime.md §2 enforceable on systems with POSIX
# `mkdir` atomicity (Linux, macOS, WSL).
#
# Usage:
#   scripts/acquire-lock.sh <feature-dir> [<ttl-seconds>] [<session-id>]
#
# Behavior:
#   - Exits 0 on successful acquisition. Lock file is
#     `<feature-dir>/.forge-status.yml.lock` with a JSON payload.
#   - Exits 75 (EX_TEMPFAIL) if a fresh lock is held by another writer.
#   - Exits 64 on usage error.
#   - If the existing lock is older than TTL, takes it over with a warning
#     on stderr.
#
# Pair with scripts/release-lock.sh which must be called in a `trap` so the
# lock is removed even if the caller is interrupted.

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <feature-dir> [<ttl-seconds>] [<session-id>]" >&2
  exit 64
fi

feature_dir="$1"
ttl_seconds="${2:-1800}"
session_id="${3:-${FORGE_SESSION_ID:-shell-$$}}"
lock_path="$feature_dir/.forge-status.yml.lock"
now_iso="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
now_epoch="$(date -u +'%s')"

if [[ ! -d "$feature_dir" ]]; then
  echo "feature directory not found: $feature_dir" >&2
  exit 64
fi

# If a lock exists, decide whether to take over. The staleness check uses
# the TTL stored in the EXISTING lock payload, not the caller's TTL — the
# caller's value applies only to the new lock being acquired.
if [[ -e "$lock_path" ]]; then
  existing_epoch=""
  existing_ttl=""
  if [[ -r "$lock_path" ]]; then
    # Tolerant grep extraction; avoid hard dependency on jq.
    existing_iso="$(grep -oE '"acquired_at"[[:space:]]*:[[:space:]]*"[^"]+"' "$lock_path" 2>/dev/null \
      | head -n1 \
      | sed -E 's/.*"acquired_at"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/')" || existing_iso=""
    existing_ttl="$(grep -oE '"ttl_seconds"[[:space:]]*:[[:space:]]*[0-9]+' "$lock_path" 2>/dev/null \
      | head -n1 \
      | sed -E 's/.*"ttl_seconds"[[:space:]]*:[[:space:]]*([0-9]+).*/\1/')" || existing_ttl=""
    if [[ -n "$existing_iso" ]]; then
      # BSD date on macOS has different flags than GNU date; try both.
      existing_epoch="$(date -u -d "$existing_iso" +'%s' 2>/dev/null || date -u -j -f '%Y-%m-%dT%H:%M:%SZ' "$existing_iso" +'%s' 2>/dev/null || true)"
    fi
  fi

  # If the lock's stored ttl is unreadable, fall back to the caller's ttl
  # as a conservative estimate — stale-takeover should still work even on
  # a lock written by an older version that omitted the field.
  effective_ttl="${existing_ttl:-$ttl_seconds}"

  if [[ -n "$existing_epoch" ]]; then
    age=$(( now_epoch - existing_epoch ))
    if (( age < effective_ttl )); then
      echo "lock held by another writer (age=${age}s < lock_ttl=${effective_ttl}s): $lock_path" >&2
      exit 75
    else
      echo "stale lock (age=${age}s >= lock_ttl=${effective_ttl}s) — taking over: $lock_path" >&2
      rm -f "$lock_path"
    fi
  else
    echo "unreadable lock at $lock_path — taking over cautiously" >&2
    rm -f "$lock_path"
  fi
fi

# Atomic acquisition via `ln`. Unlike BSD `mv -n` (which silently skips
# on existing target with exit 0, defeating the race guard), `ln` exits
# non-zero on existing target on both GNU and BSD — a real signal we can
# branch on. If `ln` succeeds, we also verify the resulting file contains
# our session_id; this protects against filesystems where hardlinks
# unexpectedly coalesce or where a concurrent writer won a nanosecond race.
tmp_lock="${lock_path}.new.$$"
cat > "$tmp_lock" <<EOF
{"pid": $$, "session_id": "$session_id", "acquired_at": "$now_iso", "ttl_seconds": $ttl_seconds}
EOF

if ! ln "$tmp_lock" "$lock_path" 2>/dev/null; then
  rm -f "$tmp_lock"
  echo "race: another writer acquired the lock first" >&2
  exit 75
fi

# Verify we actually hold the lock — guards against the corner case where
# `ln` is not strictly atomic on the underlying filesystem.
rm -f "$tmp_lock"
if ! grep -q "\"session_id\"[[:space:]]*:[[:space:]]*\"$session_id\"" "$lock_path" 2>/dev/null; then
  echo "race: lock acquired by another session" >&2
  exit 75
fi

echo "lock acquired: $lock_path" >&2
exit 0
