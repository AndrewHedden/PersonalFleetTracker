#!/usr/bin/env bash
# Probe the deployed Amplify hosting for route-handler health.
#
# Hits a fixed set of paths with curl, captures status / Content-Length /
# x-cache / Location, and prints a one-line summary per path. Useful when
# diagnosing whether the production deploy is healthy or whether a specific
# route is returning unexpected responses.
#
# Usage:
#   scripts/probe-amplify.sh                # default base URL
#   scripts/probe-amplify.sh https://other  # override base URL
set -uo pipefail

BASE="${1:-https://stablebook.retrouvez.net}"

PATHS=(
  "/"
  "/sign-in"
  "/sign-up"
  "/api/health"
)

printf "%-32s  %-6s  %-7s  %-22s  %s\n" "path" "status" "len" "x-cache" "location/error"
printf "%-32s  %-6s  %-7s  %-22s  %s\n" "----" "------" "---" "-------" "--------------"

for path in "${PATHS[@]}"; do
  url="${BASE}${path}"
  body_file=$(mktemp)
  headers=$(curl -sS -o "$body_file" -D - --max-redirs 0 "$url" 2>&1)
  rc=$?

  if [[ $rc -ne 0 ]]; then
    printf "%-32s  %-6s  %-7s  %-22s  curl exit=%s\n" "$path" "-" "-" "-" "$rc"
    rm -f "$body_file"
    continue
  fi

  status=$(printf '%s\n' "$headers" | head -1 | awk '{print $2}')
  x_cache=$(printf '%s\n' "$headers" | grep -i '^x-cache:' | tr -d '\r' | sed -E 's/^[Xx]-[Cc]ache: //' | head -1)
  content_length=$(printf '%s\n' "$headers" | grep -i '^content-length:' | tr -d '\r' | awk '{print $2}' | head -1)
  location=$(printf '%s\n' "$headers" | grep -i '^location:' | tr -d '\r' | sed -E 's/^[Ll]ocation: //' | head -1 | cut -c1-80)

  detail="${location:-}"
  if [[ -z "$detail" && "$status" =~ ^(200|400|404|500)$ ]]; then
    detail=$(head -c 80 "$body_file" | tr '\n' ' ' | tr -d '\r')
  fi

  printf "%-32s  %-6s  %-7s  %-22s  %s\n" \
    "$path" "${status:--}" "${content_length:--}" "${x_cache:--}" "${detail:--}"

  rm -f "$body_file"
done
