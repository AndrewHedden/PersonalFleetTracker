#!/usr/bin/env bash
# Probe the deployed Amplify hosting for route-handler health.
#
# Hits a fixed set of paths with curl, captures status / Content-Length /
# x-cache / Location, and prints a one-line summary per path. Used to
# diagnose the 0-byte `Error from cloudfront` failures on /api/auth/*
# without bouncing test results through a human.
#
# Usage:
#   scripts/probe-amplify.sh                # default base URL
#   scripts/probe-amplify.sh https://other  # override base URL
set -uo pipefail

BASE="${1:-https://main.d3gmb1eaiag2ib.amplifyapp.com}"

PATHS=(
  "/"
  "/api/health"
  "/api/this-does-not-exist"
  "/api/test-redirect"
  "/api/test-json-cookies"
  "/api/test-json-secure"
  "/api/test-redirect-cookies"
  "/api/test-arctic"
  "/api/test-env"
  "/api/test-prod-cookies"
  "/api/auth/sign-in"
  "/api/auth/sign-out"
)

printf "%-32s  %-6s  %-7s  %-22s  %s\n" "path" "status" "len" "x-cache" "location/error"
printf "%-32s  %-6s  %-7s  %-22s  %s\n" "----" "------" "---" "-------" "--------------"

for path in "${PATHS[@]}"; do
  url="${BASE}${path}"
  # -s silent, -D - dump headers to stdout, -o body file, --max-redirs 0 don't follow
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

  # If no location header and status indicates success/error, peek at body
  detail="${location:-}"
  if [[ -z "$detail" && "$status" =~ ^(200|400|404|500)$ ]]; then
    detail=$(head -c 80 "$body_file" | tr '\n' ' ' | tr -d '\r')
  fi

  printf "%-32s  %-6s  %-7s  %-22s  %s\n" \
    "$path" "${status:--}" "${content_length:--}" "${x_cache:--}" "${detail:--}"

  rm -f "$body_file"
done
