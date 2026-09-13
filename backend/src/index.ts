import { listDevices, registerDevice, sendPush } from './push';
import { collect } from './normalize';
import { yahooGet, type Env } from './yahoo';

const KEY_LINEUP_STATE = 'state:lineups';

/** Shared-secret auth. This is a personal app; one secret beats a login system. */
function authorized(req: Request, env: Env): boolean {
  const header = req.headers.get('Authorization') ?? '';
  const provided = header.replace(/^Bearer\s+/i, '');
  if (!env.APP_SECRET || !provided) return false;
  // Constant-time-ish compare.
  if (provided.length !== env.APP_SECRET.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i++) diff |= provided.charCodeAt(i) ^ env.APP_SECRET.charCodeAt(i);
  return diff === 0;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === '/health') {
      return json({ ok: true, leagueKey: env.LEAGUE_KEY || null, devices: (await listDevices(env)).length });
    }

    if (!authorized(req, env)) return json({ error: 'unauthorized' }, 401);

    try {
      switch (`${req.method} ${url.pathname}`) {
        case 'POST /push/register': {
          const body = (await req.json()) as { token?: string; platform?: string };
          if (!body.token?.startsWith('ExponentPushToken')) {
            return json({ error: 'not an Expo push token' }, 400);
          }
          await registerDevice(env, body.token, body.platform ?? 'unknown');
          return json({ ok: true });
        }

        case 'POST /push/test': {
          const sent = await sendPush(env, 'Bunts', 'Test notification — the pipeline works.');
          return json({ ok: true, sent });
        }

        case 'GET /roster':
          return json(await rosterPayload(env));

        case 'GET /lineup':
          // Start/sit logic lands here once real data exists.
          return json([]);

        case 'GET /keepers':
          // Keeper tally lands here once real data exists.
          return json([]);

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

async function rosterPayload(env: Env) {
  if (!env.TEAM_KEY) throw new Error('TEAM_KEY is not configured in wrangler.toml');
  // Returns raw Yahoo JSON until normalize.ts is written against real responses.
  return yahooGet(env, `team/${env.TEAM_KEY}/roster/players/stats`);
}

/**
 * Poll posted lineups and notify on players who have been scratched.
 *
 * Deliberately conservative: only an explicit transition from "starting or
 * unknown" to "confirmed not starting" fires a notification. Unknown never
 * fires on its own -- a missing lineup is not the same as a benching, and
 * crying wolf on a lineup that simply has not been posted yet would make the
 * whole feature useless.
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

  const prevRaw = await env.BUNTS.get(KEY_LINEUP_STATE);
  const previous = prevRaw ? (JSON.parse(prevRaw) as Record<string, boolean | null>) : {};

  const scratched = Object.entries(current).filter(
    ([key, starting]) => starting === false && previous[key] !== false,
  );

  await env.BUNTS.put(KEY_LINEUP_STATE, JSON.stringify(current), { expirationTtl: 60 * 60 * 20 });

  if (scratched.length === 0) return;

  const names = scratched.map(([key]) => key).join(', ');
  await sendPush(
    env,
    scratched.length === 1 ? 'Player not starting' : `${scratched.length} players not starting`,
    names,
    { type: 'scratched', players: scratched.map(([k]) => k) },
  );
}

/**
 * TODO: implement against real Yahoo responses.
 *
 * The open question for the whole notification feature is whether Yahoo exposes
 * per-day starting status for position players at all, or only probable-pitcher
 * data. `collect(raw, 'starting_status')` is the first thing to try against a
 * real dump. If it comes back empty, this feature needs a second lineup source.
 */
function extractStartingStatus(raw: unknown): Record<string, boolean | null> {
  const found = collect(raw, 'starting_status');
  if (found.length === 0) return {};
  console.log('starting_status sample:', JSON.stringify(found.slice(0, 3)));
  return {};
}
