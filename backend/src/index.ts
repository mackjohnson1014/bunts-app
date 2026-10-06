import { notify, type PushEnv } from '../../web/functions/_shared/push';
import { collect } from '../../web/functions/_shared/normalize';
import { yahooGet, type YahooEnv } from '../../web/functions/_shared/yahoo';
import { headline, takeDueWarnings } from '../../web/functions/_shared/suggestions';

interface Env extends YahooEnv, PushEnv {
  LEAGUE_KEY: string;
  TEAM_KEY: string;
}

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

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // The cron fires every 5 minutes so the 20-minute warning lands 15-20
    // minutes out. The Yahoo pollers keep their original 10-minute pace.
    ctx.waitUntil(warnUndecided(env));
    if (new Date(event.scheduledTime).getUTCMinutes() % 10 < 5) {
      ctx.waitUntil(checkLineups(env));
      ctx.waitUntil(checkTransactions(env));
    }
  },
};

/**
 * "20 minutes to first pitch and this is still open": a lineup call or swap
 * that neither owner has made or passed on, whose game is about to lock it.
 * Goes to both owners (either can make it in Yahoo), through quiet hours,
 * once per suggestion.
 */
async function warnUndecided(env: Env): Promise<void> {
  const due = await takeDueWarnings(env.BUNTS);
  for (const s of due) {
    const mins = Math.max(1, Math.round((Date.parse(s.gameAt!) - Date.now()) / 60_000));
    const at = new Date(s.gameAt!).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', timeZone: 'America/Toronto',
    });
    await notify(
      env,
      {
        title: `${s.urgent ? 'URGENT · ' : ''}${mins} min to first pitch — still undecided`,
        body: `${headline(s.body)} (game at ${at} ET). Make it in Yahoo or pass.`,
        tag: `suggestion-${s.id}`,
        url: `/#suggestions/${s.id}`,
        data: { type: 'suggestion', id: s.id },
      },
      { kind: 'suggestions', ignoreQuiet: true },
    );
  }
}

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
  }, { kind: 'scratched' });
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

const KEY_TRANSACTIONS_SEEN = 'state:transactions-seen';

/**
 * Poll league transactions and notify when this week's opponent adds or
 * drops a player -- prioritizing the opponent is the point of the feature
 * (see the Transactions screen), not an afterthought filter on top of
 * league-wide activity.
 *
 * TODO before this can do anything real. Two things never seen against a
 * live response, same situation as extractStartingStatus above:
 *   1. `league/{leagueKey}/transactions` -- shape unknown. First test once
 *      Yahoo is live: `collect(raw, 'transaction_key')` against a real dump,
 *      same technique used below.
 *   2. Resolving *which* team is this week's opponent. Yahoo's docs
 *      (2026-10-05) confirm `team/{TEAM_KEY}/matchups;weeks={current_week}`
 *      returns our matchup with both teams' keys -- simpler than scanning
 *      the whole scoreboard. Shape still unseen.
 *   Opponent adds-used likely needs no counting at all: the team resource's
 *   `roster_adds` block (coverage_type week) carries it directly.
 * Until both are known, a real diff-against-KEY_TRANSACTIONS_SEEN and a
 * per-opponent notify() would be fiction. This only confirms the poll runs.
 */
async function checkTransactions(env: Env): Promise<void> {
  if (!env.LEAGUE_KEY) return;

  let raw: unknown;
  try {
    raw = await yahooGet(env, `league/${env.LEAGUE_KEY}/transactions`);
  } catch (e) {
    console.error('transaction poll failed:', e instanceof Error ? e.message : e);
    return;
  }

  const found = collect(raw, 'transaction_key');
  if (found.length === 0) return;
  console.log('transaction sample:', JSON.stringify(found.slice(0, 3)));
  // Diffing against KEY_TRANSACTIONS_SEEN, resolving the opponent's team key,
  // and notify(env, ..., { kind: 'transactions' }) land here once the shape
  // above is confirmed.
}
