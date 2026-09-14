import { notify } from '../../web/functions/_shared/push';
import { collect } from './normalize';
import { yahooGet, type Env } from './yahoo';

const KEY_LINEUP_STATE = 'state:lineups';

export default {
  /**
   * This Worker exists for the cron trigger. The request API moved to Pages
   * Functions on the app's own origin so Cloudflare Access covers it and can
   * say who is asking -- something a separate workers.dev origin cannot do
   * without credentialed CORS and a shared secret that is not really secret.
   */
  async fetch(): Promise<Response> {
    return new Response(
      JSON.stringify({ ok: true, role: 'cron only — the API is at /api on the app origin' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
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
