# Bunts backend

Cloudflare Worker. Holds the Yahoo refresh token, proxies read-only Fantasy API
calls for the app, and polls posted lineups to push a notification when a
rostered player is scratched.

## Why a backend at all

Two reasons, either sufficient on its own:

1. **Push notifications.** Something has to be awake when the phone is not.
2. **Token custody.** Yahoo rotates refresh tokens. Whoever holds the token must
   persist the new one on every refresh or the integration dies silently. A
   phone that has been in a drawer for three weeks is a bad place for that job.

## Setup

```sh
npm install
npx wrangler kv namespace create BUNTS     # paste the id into wrangler.toml

npx wrangler secret put YAHOO_CLIENT_ID
npx wrangler secret put YAHOO_CLIENT_SECRET
npx wrangler secret put YAHOO_REFRESH_TOKEN   # from ../tokens.json
npx wrangler secret put APP_SECRET            # invent one; the app sends it as a bearer token

npm run deploy
```

Then fill `LEAGUE_KEY` and `TEAM_KEY` in `wrangler.toml` — both come out of
`python3 ../yahoo.py dump` once Yahoo provisions access.

## Endpoints

| Route | Purpose |
|---|---|
| `GET /health` | Unauthenticated liveness check |
| `GET /roster` | Team roster with stats |
| `GET /lineup` | Start/sit calls — not implemented yet |
| `GET /keepers` | Keeper tally — not implemented yet |
| `GET /raw?path=…` | Escape hatch for exploring Yahoo's response shapes |
| `POST /push/register` | Register an Expo push token |
| `POST /push/test` | Send a test notification to every registered device |

All except `/health` require `Authorization: Bearer $APP_SECRET`.

## What is deliberately unfinished

`src/normalize.ts` throws. We have not seen a real Yahoo response for this
league, so the translation layer would be guesswork. When `yahoo.py dump`
produces real JSON, that file is the only one that should need to change —
the app consumes the normalized shapes in `mobile/src/types.ts` and never sees
Yahoo's JSON.

The same applies to `extractStartingStatus` in `src/index.ts`. Whether Yahoo
exposes per-day starting status for position players is the open question the
notification feature depends on.
