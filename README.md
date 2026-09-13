# Bunts

A personal app for managing one Yahoo Fantasy Baseball team. Single user, single
league, not distributed. Read-only against the Yahoo Fantasy Sports API —
lineup changes are applied by hand in the Yahoo app, because read-only is the
only access Yahoo grants.

## Layout

```
Bunts/
  yahoo.py      OAuth + read client. Run it yourself; it holds the tokens.
  mobile/       Expo / React Native app
  backend/      Cloudflare Worker: token custody, lineup polling, push
```

## Current state

Yahoo **approved** the API application; provisioning was still pending as of
2026-09-13. Until it lands, `python3 yahoo.py check` reports the status and the
app runs entirely on fixtures.

The app and backend are built against a normalized domain model
(`mobile/src/types.ts`), not against Yahoo's JSON. When real responses arrive,
`backend/src/normalize.ts` is the only file that should need to change.

## Running the app

```sh
cd mobile
npm install
npx expo start        # scan the QR code with Expo Go
```

With no `EXPO_PUBLIC_BUNTS_API` set it runs on mock data, which is enough to
develop every screen.

## Checking Yahoo access

```sh
python3 yahoo.py check     # provisioned yet?
python3 yahoo.py dump      # pull everything into ./data/ once it is
```

A scheduled task also checks this daily and pushes a notification the moment
access goes live.

## Attribution

Yahoo requires any product using the API to display **Fantasy data provided by
Yahoo Fantasy**. It is rendered at the bottom of the roster screen.
