#!/usr/bin/env bash
# Push every Worker secret from ../.env and ../tokens.json without you having to
# copy any of them by hand. Run from backend/ after `npx wrangler login`.
set -euo pipefail

cd "$(dirname "$0")"
ENV_FILE=../.env
TOKENS=../tokens.json

[[ -f $ENV_FILE ]] || { echo "Missing $ENV_FILE" >&2; exit 1; }
[[ -f $TOKENS   ]] || { echo "Missing $TOKENS — run 'python3 ../yahoo.py exchange <code>' first" >&2; exit 1; }

value_from_env() {
  grep "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2-
}

put() {
  local name=$1 value=$2
  if [[ -z $value ]]; then
    echo "  ! $name is empty — skipping" >&2
    return
  fi
  printf '%s' "$value" | npx wrangler secret put "$name" >/dev/null
  echo "  ✓ $name"
}

echo "Setting Worker secrets:"
put YAHOO_CLIENT_ID     "$(value_from_env YAHOO_CLIENT_ID)"
put YAHOO_CLIENT_SECRET "$(value_from_env YAHOO_CLIENT_SECRET)"
put YAHOO_REFRESH_TOKEN "$(python3 -c "import json;print(json.load(open('$TOKENS'))['refresh_token'])")"
put APP_SECRET          "$(value_from_env APP_SECRET)"
put VAPID_PUBLIC_KEY    "$(value_from_env VAPID_PUBLIC_KEY)"
put VAPID_PRIVATE_KEY   "$(value_from_env VAPID_PRIVATE_KEY)"
put VAPID_SUBJECT       "$(value_from_env VAPID_SUBJECT)"

echo
echo "Done. Next: npm run deploy"
