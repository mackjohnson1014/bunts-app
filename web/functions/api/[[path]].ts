import { identify } from '../_shared/access';
import { addSubscription, listSubscriptions, notify, type PushEnv } from '../_shared/push';
import { displayName, getProfile, isProfileInput, saveProfile } from '../_shared/profiles';
import {
  addSuggestion, counter, doneLine, headline, isCounterInput, isDated, isSuggestionInput, listSuggestions, markSeen, NOTE_MAX, react, remove, reply, resolve, setUrgent,
  stateOf, termsOwner, type Person, type Suggestion, type SuggestionBody,
} from '../_shared/suggestions';
import { firstPitch, nextGameFor, searchPlayers } from '../_shared/mlb';
import { others, touch } from '../_shared/presence';
import type { PushSubscription } from '../_shared/webpush';
import { buildSampleRoster } from '../_shared/sampleRoster';
import { yahooGet, type YahooEnv } from '../_shared/yahoo';

/**
 * The whole API, served from the same origin as the app so Cloudflare Access
 * covers it. No shared secret and no CORS: the Access cookie the browser
 * already holds is the credential, and it names the user.
 */

interface Env extends PushEnv, YahooEnv {
  BUNTS: KVNamespace;
  ACCESS_TEAM_DOMAIN: string;   // e.g. round-brook-679d.cloudflareaccess.com
  ACCESS_AUD: string;           // the Access application's AUD tag
  LEAGUE_KEY: string;
  TEAM_KEY: string;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const notConnected = () =>
  json({ error: 'Yahoo account is not connected yet', code: 'yahoo_not_connected' }, 503);

function isPushSubscription(v: unknown): v is PushSubscription {
  const s = v as PushSubscription;
  return (
    !!s && typeof s.endpoint === 'string' && s.endpoint.startsWith('https://') &&
    !!s.keys && typeof s.keys.p256dh === 'string' && typeof s.keys.auth === 'string'
  );
}

export const onRequest: PagesFunction<Env> = async ({ request, env, params, waitUntil }) => {
  const path = '/' + (Array.isArray(params.path) ? params.path.join('/') : params.path ?? '');
  const route = `${request.method} ${path}`;

  const me = await identify(request, env.ACCESS_TEAM_DOMAIN, env.ACCESS_AUD);
  if (!me) {
    // Access should have stopped this at the edge. Reaching here means the
    // session expired mid-use, or the app is being served without Access.
    return json({ error: 'Not signed in', code: 'unauthenticated' }, 401);
  }

  // Any request means they're using the app. Recorded off the response path.
  waitUntil(touch(env.BUNTS, me.email).catch(() => {}));

  try {
    const action = path.match(/^\/suggestions\/([0-9a-f-]{36})\/(react|reply|resolve|counter|urgent)$/);
    // Deleting is the author's call and deliberately silent: no push goes out.
    const del = path.match(/^\/suggestions\/([0-9a-f-]{36})$/);
    if (del && request.method === 'DELETE') {
      const result = await remove(env.BUNTS, del[1], me.email);
      if (result === 'not-found') return json({ error: 'not found' }, 404);
      if (result === 'not-author') return json({ error: 'Only the person who wrote a suggestion can delete it' }, 403);
      return json({ ok: true });
    }

    if (action && request.method === 'POST') {
      return await suggestionAction(env, me, action[1], action[2] as Action, await request.json());
    }

    switch (route) {
      case 'GET /me': {
        const profile = await getProfile(env.BUNTS, me.email);
        return json({
          email: me.email,
          // The profile name wins; the email-derived one is only a placeholder
          // until they tell us what to call them.
          name: profile ? displayName(profile) : me.name,
          profile,
          // Drives the one-time onboarding screen.
          needsOnboarding: profile === null,
        });
      }

      case 'PUT /profile': {
        const body = await request.json();
        if (!isProfileInput(body)) return json({ error: 'invalid profile' }, 400);
        const profile = await saveProfile(env.BUNTS, me.email, body);
        return json(profile);
      }

      case 'GET /push/key':
        return json({ key: env.VAPID_PUBLIC_KEY ?? '' });

      case 'POST /push/subscribe': {
        const body = await request.json();
        if (!isPushSubscription(body)) return json({ error: 'not a push subscription' }, 400);
        await addSubscription(env, body, me.email);
        return json({ ok: true });
      }

      case 'POST /push/test':
        // Deliberately not filtered by preference: a test you asked for should
        // arrive even if you have the real alerts switched off.
        return json(await notify(
          env,
          { title: 'Bunts', body: 'Test notification — the pipeline works.', tag: 'test' },
          { onlyEmail: me.email },
        ));

      case 'GET /suggestions': {
        const all = await listSuggestions(env.BUNTS);
        return json(all.map((s) => view(s, me.email)));
      }

      case 'POST /suggestions': {
        const body = await request.json();
        if (!isSuggestionInput(body)) return json({ error: 'invalid suggestion' }, 400);
        const author = await whoIs(env, me);
        // A lineup call is about a specific game: look up when it starts, so it
        // expires then (not at the day's first pitch) and the 20-minute
        // warning knows when to fire. Fall back to the old rule if unknown.
        const dated = isDated(body) && body.date ? body.date : null;
        const gameAt = dated ? await affectedGame(body, dated) : null;
        const expiresAt = dated ? gameAt ?? await lockFor(dated) : null;
        const created = await addSuggestion(env.BUNTS, body, author, expiresAt, gameAt);
        // Tell the other owner, never the author.
        const pushed = await notify(
          env,
          {
            title: `${created.urgent ? 'URGENT · ' : ''}${author.name}: ${headline(created.body)}`,
            body: created.note || dayLabel(created) || 'No note',
            tag: `suggestion-${created.id}`,
            url: `/#suggestions/${created.id}`,
            data: { type: 'suggestion', id: created.id },
          },
          { exceptEmail: me.email, kind: 'suggestions', ignoreQuiet: created.urgent },
        );
        // sent/skipped let the composer say whether it actually reached them:
        // skipped means they've switched suggestion alerts off; neither means
        // they have no phone registered yet.
        return json({ suggestion: view(created, me.email), notified: pushed.sent, skipped: pushed.skipped });
      }

      case 'POST /suggestions/seen':
        await markSeen(env.BUNTS, me.email);
        return json({ ok: true });

      case 'GET /players/search': {
        const q = new URL(request.url).searchParams.get('q') ?? '';
        return json(await searchPlayers(q));
      }

      case 'GET /people':
        // The other owner(s): last active, and whether a notification can reach them.
        return json(await others(env, me.email));

      case 'POST /presence':
        // Heartbeat while the app is open; the touch above does the work.
        return json({ ok: true });

      case 'GET /health':
        return json({ ok: true, you: me.email, devices: (await listSubscriptions(env)).length });

      case 'GET /yahoo/raw': {
        // Escape hatch for learning Yahoo's real response shapes from the
        // deployed app once access is provisioned, e.g.
        // /api/yahoo/raw?path=league/{league_key}/transactions
        // Read-only (GET to Yahoo, never PUT/POST) and behind Access like
        // everything else here.
        const yPath = new URL(request.url).searchParams.get('path');
        if (!yPath) return json({ error: 'missing ?path=' }, 400);
        return json(await yahooGet(env, yPath.replace(/^\/+/, '')));
      }

      case 'GET /roster':
      case 'GET /lineup': {
        if (env.TEAM_KEY) return notConnected();   // real Yahoo reads land here once access is provisioned
        // No fantasy roster to read yet, so show a roster of real MLB
        // players with live stats/status instead of an empty screen or
        // hand-typed fiction -- see _shared/sampleRoster.ts.
        try {
          return json(await buildSampleRoster(env));
        } catch {
          // MLB Stats API hiccup isn't Yahoo's fault, but the client's
          // fallback behavior (isWaitingOnYahoo) is what we want here too:
          // fall back to the app's local static sample rather than error.
          return notConnected();
        }
      }

      case 'GET /keepers':
      case 'GET /matchup':
      case 'GET /opponent':
      case 'GET /transactions':
        return notConnected();   // real Yahoo reads land here once access is provisioned

      default:
        return json({ error: 'not found' }, 404);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes('not provisioned')) {
      return json({ error: message, code: 'yahoo_not_provisioned' }, 503);
    }
    return json({ error: message }, 502);
  }
};

/** The suggestion as one person sees it: whose it is, whether it's news to them, whether it's still live. */
const view = (s: Suggestion, email: string) => ({
  ...s,
  state: stateOf(s),
  mine: s.authorEmail === email,
  /** You put forward the terms as they stand, so it's the other person's to react to. */
  myTerms: termsOwner(s).email === email,
  unread: !s.seenBy.includes(email),
});

/** Profile name if they've set one, else the email-derived placeholder. */
async function whoIs(env: Env, me: { email: string; name: string }): Promise<Person> {
  const profile = await getProfile(env.BUNTS, me.email);
  return { email: me.email, name: profile ? displayName(profile) : me.name };
}

/**
 * When a lineup call for `date` goes stale: first pitch that day. If MLB has
 * no games or can't be reached, fall back to early the next morning Eastern,
 * so it still clears overnight rather than lingering.
 */
async function lockFor(date: string): Promise<string> {
  try {
    const first = await firstPitch(date);
    if (first) return first;
  } catch {
    /* fall through */
  }
  // 08:00 UTC the following day is 3-4 a.m. Eastern.
  return new Date(Date.parse(`${date}T08:00:00Z`) + 24 * 3600_000).toISOString();
}

/** The players a lineup call is about, by MLB team, for looking up their game. */
async function affectedGame(body: SuggestionBody, date: string): Promise<string | null> {
  const teams =
    body.kind === 'call' ? [body.player.team]
    : body.kind === 'swap' ? [body.start.team, body.bench.team]
    : [];
  try {
    return await nextGameFor(teams.filter((t): t is string => !!t), date);
  } catch {
    return null;
  }
}

function dayLabel(s: Suggestion): string | null {
  if (!s.date) return null;
  const d = new Date(`${s.date}T12:00:00Z`);
  return `For ${d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' })}`;
}

type Action = 'react' | 'reply' | 'resolve' | 'counter' | 'urgent';

const REACTIONS = new Set(['agree', 'disagree']);
const STATUSES = new Set(['open', 'done', 'passed']);

/**
 * React, reply or resolve. Each one is news to the other person, so each one
 * buzzes them -- the author hearing "Matt agrees" is half the point.
 */
async function suggestionAction(
  env: Env,
  me: { email: string; name: string },
  id: string,
  action: Action,
  body: unknown,
): Promise<Response> {
  const who = await whoIs(env, me);
  const b = (body ?? {}) as { value?: unknown; text?: unknown; status?: unknown };
  let updated: Suggestion | null;
  let push: { title: string; body: string };

  if (action === 'react') {
    if (b.value !== null && !REACTIONS.has(b.value as string)) return json({ error: 'invalid reaction' }, 400);
    const existing = (await listSuggestions(env.BUNTS)).find((s) => s.id === id);
    if (existing && termsOwner(existing).email === me.email) {
      return json({ error: 'You can’t react to your own proposal' }, 400);
    }
    updated = await react(env.BUNTS, id, who, b.value as 'agree' | 'disagree' | null);
    if (!updated) return json({ error: 'not found' }, 404);
    if (!b.value) return json({ suggestion: view(updated, me.email), notified: 0 });
    push = {
      title: `${who.name} ${b.value === 'agree' ? 'agrees' : 'disagrees'}`,
      body: headline(updated.body),
    };
  } else if (action === 'reply') {
    if (typeof b.text !== 'string' || !b.text.trim() || b.text.length > NOTE_MAX) {
      return json({ error: 'invalid reply' }, 400);
    }
    updated = await reply(env.BUNTS, id, who, b.text);
    if (!updated) return json({ error: 'not found' }, 404);
    push = { title: `${who.name} on “${headline(updated.body)}”`, body: b.text.trim() };
  } else if (action === 'urgent') {
    if (typeof (b as { value?: unknown }).value !== 'boolean') return json({ error: 'invalid value' }, 400);
    const value = (b as { value: boolean }).value;
    updated = await setUrgent(env.BUNTS, id, who, value);
    if (!updated) return json({ error: 'not found' }, 404);
    // Raising the flag is worth a buzz -- through quiet hours. Lowering it isn't.
    if (!value) return json({ suggestion: view(updated, me.email), notified: 0 });
    const pushed = await notify(
      env,
      {
        title: `URGENT · ${who.name}: ${headline(updated.body)}`,
        body: updated.note || 'Needs a decision',
        tag: `suggestion-${id}`, url: `/#suggestions/${id}`, data: { type: 'suggestion', id },
      },
      { exceptEmail: me.email, kind: 'suggestions', ignoreQuiet: true },
    );
    return json({ suggestion: view(updated, me.email), notified: pushed.sent, skipped: pushed.skipped });
  } else if (action === 'counter') {
    if (!isCounterInput(body)) return json({ error: 'invalid counter' }, 400);
    const result = await counter(env.BUNTS, id, who, body);
    if (result === null) return json({ error: 'not found' }, 404);
    if (result === 'not-pickup') return json({ error: 'Only pickups can be countered' }, 400);
    if (result === 'closed') return json({ error: 'This suggestion is already closed' }, 400);
    if (result === 'unchanged') return json({ error: 'That’s the same add and drop' }, 400);
    updated = result;
    push = {
      title: `${who.name} countered: ${headline(updated.body)}`,
      body: body.text.trim() || 'Tap to agree or disagree',
    };
  } else {
    if (!STATUSES.has(b.status as string)) return json({ error: 'invalid status' }, 400);
    updated = await resolve(env.BUNTS, id, who, b.status as 'open' | 'done' | 'passed');
    if (!updated) return json({ error: 'not found' }, 404);
    // "Made it in Yahoo" is the one that changes the team, so it says exactly
    // what changed rather than repeating the proposal.
    push =
      b.status === 'done' ? { title: `${who.name} made it in Yahoo ✓`, body: doneLine(updated.body) }
      : b.status === 'passed' ? { title: `${who.name} passed`, body: headline(updated.body) }
      : { title: `${who.name} reopened a suggestion`, body: headline(updated.body) };
  }

  const pushed = await notify(
    env,
    // Tapping it opens this suggestion, not just the list.
    { ...push, tag: `suggestion-${id}`, url: `/#suggestions/${id}`, data: { type: 'suggestion', id } },
    { exceptEmail: me.email, kind: 'suggestions', ignoreQuiet: updated.urgent === true },
  );
  return json({ suggestion: view(updated, me.email), notified: pushed.sent, skipped: pushed.skipped });
}
