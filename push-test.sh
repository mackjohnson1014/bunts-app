#!/usr/bin/env bash
# Send a test push to a device, bypassing the backend entirely.
# Useful for proving the notification path works before the Worker is deployed.
#
#   ./scripts-push-test.sh "ExponentPushToken[xxxxxxxx]"
set -euo pipefail

TOKEN="${1:-}"
if [[ -z "$TOKEN" ]]; then
  echo "usage: $0 'ExponentPushToken[...]'" >&2
  exit 1
fi
if [[ "$TOKEN" != ExponentPushToken* ]]; then
  echo "That does not look like an Expo push token." >&2
  exit 1
fi

curl -sS -X POST https://exp.host/--/api/v2/push/send \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d "$(cat <<JSON
[{
  "to": "$TOKEN",
  "title": "Eli Vargas is not starting",
  "body": "3B · @ SD · Start Owen Brandt instead",
  "sound": "default",
  "data": { "type": "scratched", "players": ["p.4"] }
}]
JSON
)" | python3 -m json.tool
