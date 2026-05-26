#!/usr/bin/env bash
# Invoke the deployed Migrator Lambda for a given stage and pretty-print the result.
#
# Usage:
#   scripts/invoke-migrate.sh                # uses stage=andrew, profile=pft
#   scripts/invoke-migrate.sh production     # uses stage=production
#   AWS_PROFILE=foo scripts/invoke-migrate.sh # override profile via env
set -euo pipefail

PROFILE="${AWS_PROFILE:-pft}"
STAGE="${1:-andrew}"

FN=$(aws lambda list-functions \
  --profile "$PROFILE" \
  --query "Functions[?contains(FunctionName, 'personal-fleet-tracker-${STAGE}-MigratorFunction')].FunctionName" \
  --output text | head -n1)

if [[ -z "$FN" ]]; then
  echo "error: Migrator function not found for stage '$STAGE' under profile '$PROFILE'." >&2
  echo "       Has the stage been deployed? Try: pnpm --filter @pft/infra sst:deploy --stage $STAGE" >&2
  exit 1
fi

echo "Invoking $FN..." >&2
OUT=$(mktemp)
trap 'rm -f "$OUT"' EXIT

aws lambda invoke \
  --profile "$PROFILE" \
  --function-name "$FN" \
  --cli-binary-format raw-in-base64-out \
  "$OUT" >/dev/null

jq . "$OUT"
