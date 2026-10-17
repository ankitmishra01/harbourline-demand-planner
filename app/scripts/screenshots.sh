#!/usr/bin/env bash
# Retake the README screenshots with the gstack browse daemon against a running app.
# Usage: BASE=http://localhost:3100 app/scripts/screenshots.sh
set -euo pipefail
B="${B:-$HOME/.claude/skills/gstack/browse/dist/browse}"
BASE="${BASE:-http://localhost:3000}"
OUT="$(cd "$(dirname "$0")/../.." && pwd)/docs/screenshots"
mkdir -p "$OUT"
for size in "1440x900:desktop" "390x844:mobile"; do
  vp=${size%%:*}; tag=${size##*:}
  $B viewport "$vp" >/dev/null
  for p in "" planner models business-case plan security about; do
    name=${p:-landing}
    $B goto "$BASE/$p/" >/dev/null; $B wait --networkidle >/dev/null || true
    $B screenshot --viewport "$OUT/$name-$tag.png" >/dev/null
    echo "$name-$tag"
  done
done
echo "Planner sub-states (drawer, offers, autonomy, send sheet, sent orders) are captured by hand; see README."
