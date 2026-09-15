import { identify } from '../_shared/access';
import { addSubscription, listSubscriptions, notify, type PushEnv } from '../_shared/push';
import { displayName, getProfile, isProfileInput, saveProfile } from '../_shared/profiles';
import {
  addSuggestion, isSuggestionInput, listSuggestions, markSeen, type Suggestion,
} from '../_shared/suggestions';
import type { PushSubscription } from '../_shared/webpush';

/**
 * The whole API, served from the same origin as the app so Cloudflare Access
 * covers it. No shared secret and no CORS: the Access cookie the browser
 * already holds is the credential, and it names the user.
 */

interface Env extends PushEnv {
  BUNTS: KVNamespace;
  ACCESS_TEAM_DOMAIN: string;   // e.g. round-brook-679d.cloudflareaccess.com
  ACCESS_AUD: string;           // the Access application's AUD tag
  YAHOO_CLIENT_ID: string;
  YAHOO_CLIENT_SECRET: string;
  YAHOO_REFRESH_TOKEN: string;
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

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  const path = '/' + (Array.isArray(params.path) ? params.path.join('/') : params.path ?? '');
  const route = `${request.method} ${path}`;

  const me = await identify(request, env.ACCESS_TEAM_DOMAIN, env.ACCESS_AUD);
  if (!me) {
    // Access should have stopped this at the edge. Reaching here means the
    // session expired mid-use, or the app is being served without Access.
    return json({ error: 'Not signed in', code: 'unauthenticated' }, 401);
  }

  try {
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
        return json(all.map((s) => ({ ...s, mine: s.authorEmail === me.email, unread: !s.seenBy.includes(me.email) })));
      }

      case 'POST /suggestions': {
        const body = await request.json();
        if (!isSuggestionInput(body)) return json({ error: 'invalid suggestion' }, 400);
        const profile = await getProfile(env.BUNTS, me.email);
        const author = { email: me.email, name: profile ? displayName(profile) : me.name };
        const created = await addSuggestion(env.BUNTS, body, author);
        // Tell the other owner, never the author.
        const pushed = await notify(
          env,
          {
            title: `${author.name}: ${verb(created)} ${created.playerName}`,
            body: created.note || 'No note',
            tag: `suggestion-${created.id}`,
            url: '/',
            data: { type: 'suggestion', id: created.id },
          },
          { exceptEmail: me.email, kind: 'suggestions' },
        );
        return json({ suggestion: created, notified: pushed.sent });
      }

      case 'POST /suggestions/seen':
        await markSeen(env.BUNTS, me.email);
        return json({ ok: true });

      case 'GET /health':
        return json({ ok: true, you: me.email, devices: (await listSubscriptions(env)).length });

      case 'GET /roster':
      case 'GET /lineup':
      case 'GET /keepers':
      case 'GET /matchup':
      case 'GET /transactions':
        if (!env.TEAM_KEY) return notConnected();
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

const verb = (s: Suggestion) =>
  s.recommendation === 'start' ? 'start' : s.recommendation === 'sit' ? 'sit' : 'watch';
