#!/usr/bin/env bash
# Push the Pages project's secrets from ../.env and ../tokens.json.
set -euo pipefail
cd "$(dirname "$0")"

ENV_FILE=../.env
TOKENS=../tokens.json
PROJECT=bunts

value() { grep "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2-; }

put() {
  local name=$1 value=$2
  if [[ -z $value ]]; then echo "  ! $name is empty — skipping" >&2; return; fi
  printf '%s' "$value" | npx wrangler pages secret put "$name" --project-name "$PROJECT" >/dev/null
  echo "  ✓ $name"
}

echo "Setting Pages secrets:"
put VAPID_PUBLIC_KEY    "$(value VAPID_PUBLIC_KEY)"
put VAPID_PRIVATE_KEY   "$(value VAPID_PRIVATE_KEY)"
put VAPID_SUBJECT       "$(value VAPID_SUBJECT)"
put YAHOO_CLIENT_ID     "$(value YAHOO_CLIENT_ID)"
put YAHOO_CLIENT_SECRET "$(value YAHOO_CLIENT_SECRET)"
[[ -f $TOKENS ]] && put YAHOO_REFRESH_TOKEN "$(node -e "process.stdout.write(require('$PWD/../tokens.json').refresh_token)")"

echo
echo "Done. Next: set ACCESS_AUD in wrangler.toml, then npm run deploy"
