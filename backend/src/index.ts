import { addSubscription, listSubscriptions, notify } from './push';
import { collect } from './normalize';
import type { PushSubscription } from './webpush';
import { yahooGet, type Env } from './yahoo';

const KEY_LINEUP_STATE = 'state:lineups';

/** Shared-secret auth. This is a personal app; one secret beats a login system. */
function authorized(req: Request, env: Env): boolean {
  const provided = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!env.APP_SECRET || !provided || provided.length !== env.APP_SECRET.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i++) diff |= provided.charCodeAt(i) ^ env.APP_SECRET.charCodeAt(i);
  return diff === 0;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // The PWA is served from a different origin than the Worker.
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    },
  });

function isPushSubscription(v: unknown): v is PushSubscription {
  const s = v as PushSubscription;
  return (
    !!s && typeof s.endpoint === 'string' && s.endpoint.startsWith('https://') &&
    !!s.keys && typeof s.keys.p256dh === 'string' && typeof s.keys.auth === 'string'
  );
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') return json({}, 204);

    if (url.pathname === '/health') {
      return json({
        ok: true,
        leagueKey: env.LEAGUE_KEY || null,
        devices: (await listSubscriptions(env)).length,
      });
    }

    if (!authorized(req, env)) return json({ error: 'unauthorized' }, 401);

    try {
      switch (`${req.method} ${url.pathname}`) {
        case 'GET /push/key':
          return json({ key: env.VAPID_PUBLIC_KEY ?? '' });

        case 'POST /push/subscribe': {
          const body = await req.json();
          if (!isPushSubscription(body)) return json({ error: 'not a push subscription' }, 400);
          await addSubscription(env, body);
          return json({ ok: true });
        }

        case 'POST /push/test':
          return json(
            await notify(env, {
              title: 'Bunts',
              body: 'Test notification — the pipeline works.',
              tag: 'test',
            }),
          );

        case 'GET /roster':
          if (!env.TEAM_KEY) throw new Error('TEAM_KEY is not configured in wrangler.toml');
          return json(await yahooGet(env, `team/${env.TEAM_KEY}/roster/players/stats`));

        case 'GET /lineup':
          return json([]);   // start/sit logic lands here once real data exists

        case 'GET /keepers':
          return json([]);   // keeper tally lands here once real data exists

        case 'GET /raw': {
          // Escape hatch for exploring Yahoo's shapes: /raw?path=team/KEY/roster
          const path = url.searchParams.get('path');
          if (!path) return json({ error: 'path required' }, 400);
          return json(await yahooGet(env, path));
        }

        default:
          return json({ error: 'not found' }, 404);
      }
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : String(e) }, 502);
    }
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(checkLineups(env));
  },
};

/**
 * Poll posted lineups and notify on players who have been scratched.
 *
 * Deliberately conservative: only an explicit transition to "confirmed not
 * starting" fires. Unknown never fires on its own -- a missing lineup is not a
 * benching, and crying wolf on an unposted card would make the feature useless.
 */
async function checkLineups(env: Env): Promise<void> {
  if (!env.TEAM_KEY) return;

  let current: Record<string, boolean | null>;
  try {
    const raw = await yahooGet(env, `team/${env.TEAM_KEY}/roster/players/stats`);
    current = extractStartingStatus(raw);
  } catch (e) {
    console.error('lineup poll failed:', e instanceof Error ? e.message : e);
    return;
  }
  if (Object.keys(current).length === 0) return;

  const prevRaw = await env.BUNTS.get(KEY_LINEUP_STATE);
  const previous = prevRaw ? (JSON.parse(prevRaw) as Record<string, boolean | null>) : {};

  const scratched = Object.entries(current).filter(
    ([key, starting]) => starting === false && previous[key] !== false,
  );

  await env.BUNTS.put(KEY_LINEUP_STATE, JSON.stringify(current), { expirationTtl: 60 * 60 * 20 });

  if (scratched.length === 0) return;

  const names = scratched.map(([key]) => key);
  await notify(env, {
    title: names.length === 1 ? `${names[0]} is not starting` : `${names.length} players not starting`,
    body: names.join(', '),
    // One tag for the whole feature, so a re-check replaces the alert instead
    // of stacking a new one every ten minutes.
    tag: 'scratched',
    url: '/',
    data: { type: 'scratched', players: names },
  });
}

/**
 * TODO: implement against real Yahoo responses.
 *
 * The open question for the whole notification feature is whether Yahoo exposes
 * per-day starting status for position players, or only probable-pitcher data.
 * `collect(raw, 'starting_status')` is the first thing to try against a real
 * dump. If it comes back empty, this feature needs a second lineup source.
 */
function extractStartingStatus(raw: unknown): Record<string, boolean | null> {
  const found = collect(raw, 'starting_status');
  if (found.length === 0) return {};
  console.log('starting_status sample:', JSON.stringify(found.slice(0, 3)));
  return {};
}
