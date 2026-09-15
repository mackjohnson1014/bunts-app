# Bunts — context for Claude

Personal app for managing one Yahoo Fantasy Baseball team. Single user, single
league, not distributed. Read-only against the Yahoo Fantasy Sports API.

## Current blocker

Yahoo **approved** API access but had not provisioned it as of 2026-09-13.
Every Fantasy endpoint returns `401 oauth_problem="additional_authorization_required"`,
and the YDN app (`sTUNc9VC`) shows only OpenID Connect under API Permissions.

Check status: `python3 yahoo.py check`

When it flips on: tick Fantasy Sports → Read in the Yahoo developer console,
then re-authorize for a fresh code — the existing token will NOT inherit the
new scope. Then `python3 yahoo.py dump`.

## Layout

```
yahoo.py      OAuth2 + read client. check / exchange / dump / get
mobile/       Expo SDK 57, expo-router, TypeScript strict
backend/      Cloudflare Worker: token custody, lineup polling, Expo push
```

## Design rules — do not violate these casually

**The app never sees Yahoo's JSON.** `mobile/src/types.ts` is the contract.
The backend translates. Yahoo's fantasy JSON is deeply nested and irregular
(objects keyed by numeric strings, arrays mixing metadata and content), and we
have not seen a real response for this league yet. Keep the unknown quarantined
in `backend/src/normalize.ts`.

**`startingToday` is three-state: `true | false | null`.** Null means the
lineup has not been posted or could not be determined. Never render null as
"not starting". Telling the user to bench a player who is in fact playing is
the worst failure this app can have, and it is the failure mode a two-state
boolean produces by default.

**Yahoo grants read access only.** There is no write API. The app suggests;
the user applies changes by hand in the Yahoo app. Do not design flows that
assume roster writes.

**Refresh tokens rotate.** Yahoo may return a new refresh token on any refresh
and the old one dies. Every code path that refreshes must persist what came
back. This is handled in `yahoo.py` and `backend/src/yahoo.ts` — keep it that
way.

**Attribution is required.** "Fantasy data provided by Yahoo Fantasy" must
appear in the product. It renders at the bottom of the roster screen.

## Deliberately unfinished

- `backend/src/normalize.ts` throws by design. Needs real Yahoo responses.
- `extractStartingStatus` in `backend/src/index.ts` returns empty. The open
  question is whether Yahoo exposes per-day starting status for position
  players or only probable pitchers. First test: `collect(raw, 'starting_status')`
  against a real dump. If empty, the notification feature needs a second
  lineup source.
- Keeper scoring formula not designed. Needs the league's scoring settings
  and keeper rules.

## Preview builds — read before deploying one

`npm run deploy:preview` publishes to `preview.bunts.pages.dev` for design
review. **That hostname is NOT behind Cloudflare Access**, which is bound to
`bunts.pages.dev` only. Preview deployments of the real app would therefore be
public.

That is why the preview script hardcodes `VITE_USE_MOCKS=1`. With mocks
compiled in, Vite eliminates every API call path -- the built bundle contains
no reference to `/api` at all -- so the preview renders the UI on sample data
and cannot reach KV, Yahoo, or push. Verify with:

    grep -c "/api/" dist/assets/*.js    # must be 0

Never deploy a non-mock build to a preview branch, and never add an Access
bypass to make one work. `?onboarding=1` jumps to the setup flow on the
preview; it is gated on mocks so it cannot be triggered against the live app.

## Changelog vs. deploys — two different decisions, on purpose

The "new version available" banner (`useRefresh.ts`) compares `__BUILD_ID__`
against `/version.json`, not against `changelog.ts` -- it fires on every
deploy regardless of the changelog, because it means "the code changed," not
"here's what's new." That part needs nothing from you.

`changelog.ts`'s `RELEASES` array, and the `APP_VERSION` it drives, are
entirely hand-written and never bump on their own. That's deliberate: what's
worth telling someone who opens the app is a product judgment, not something
to infer from commit messages -- see the file's own header comment.

**Convention:** as work ships, add a note to the running list in
`claude/status.md`, written the way a changelog entry reads (what changed
about using Bunts) rather than which files moved, so nothing has to be
reconstructed from git log later. Only cut an actual version bump plus a
`RELEASES` entry when you want to announce something -- pull it from the
accumulated notes in status.md, then clear them out. A deploy on its own
never requires either.

## Known tradeoffs — accepted, do not "fix" silently

**`APP_SECRET` is readable in the deployed web bundle.** Vite inlines
`VITE_*` variables at build time, so anyone who opens `bunts.pages.dev` can
read it and call the Worker directly. There is nowhere in a browser to hide a
secret; the URL is what limits access, not the secret.

Accepted deliberately: the data is read-only fantasy baseball about one
person's own team, and the realistic worst case is a stranger reading the
roster or triggering a notification. If this ever needs fixing, the answer is
Cloudflare Access in front of the Pages site, not a cleverer way to hide a
string in JavaScript.

**The app is public and meant to be shared.** The URL can be handed to anyone.
A visitor sees Mack's team; there is no multi-user support and adding it would
break single-user assumptions throughout.

## Secrets

`.env` (Yahoo client id/secret) and `tokens.json` are gitignored. **The GitHub
repo is public.** Never commit either, never print the secret, never paste it
into a chat or an issue.

## Conventions

- `mobile/` and `backend/` each have `npm run typecheck`; both pass. Keep them passing.
- Run `npm install` in the project directories, not in a mounted/synced path.
- Poll Yahoo on a minutes scale. Rate limits are unpublished but throttling is
  reserved for bursty usage.
