/**
 * The sample roster shown while Yahoo is not connected.
 *
 * Yahoo is the only source that could tell us which players are actually on
 * Mack's fantasy team -- that's still blocked (see claude/status.md). Until
 * then this pins a fixed list of real, well-known MLB players so the app has
 * something honest to show: not Mack's real team, but real players with real,
 * live stats and status pulled from the MLB Stats API every time the roster
 * loads (see `mlb.ts`), instead of the hand-typed fictional numbers this
 * replaced. `sample: true` still marks it as a stand-in -- see components.tsx.
 *
 * Positions/teams were read directly from the MLB Stats API's own active-
 * roster data at the time this was written, not typed from memory, so they
 * match whatever season is live when this runs.
 */

import {
  getPlayerStats, getRecentGames, getRosterStatuses, getScheduleByTeams, startingToday, MLB_TEAM_ABBR,
} from './mlb';

export interface SamplePlayerDef {
  playerKey: string;
  personId: number;
  name: string;
  teamId: number;
  positions: string[];
  slot: string;
  isPitcher: boolean;
}

// Mirrors the slot layout the old mock.ts roster used (17 hitters, 10
// pitchers -- C/1B/2B/3B/SS/OF x2/UTIL x2 starting, a bench, two IL slots,
// and SP/RP/P across the pitching staff) so nothing downstream (scoring,
// grouping, the Hitters/Pitchers split) has to change.
export const SAMPLE_ROSTER_PLAYERS: SamplePlayerDef[] = [
  // Hitters
  { playerKey: 'mlb.668939', personId: 668939, name: 'Adley Rutschman', teamId: 111, positions: ['C'], slot: 'C', isPitcher: false },
  { playerKey: 'mlb.518692', personId: 518692, name: 'Freddie Freeman', teamId: 119, positions: ['1B', 'UTIL'], slot: '1B', isPitcher: false },
  { playerKey: 'mlb.514888', personId: 514888, name: 'Jose Altuve', teamId: 117, positions: ['2B'], slot: '2B', isPitcher: false },
  { playerKey: 'mlb.663586', personId: 663586, name: 'Austin Riley', teamId: 144, positions: ['3B'], slot: '3B', isPitcher: false },
  { playerKey: 'mlb.677951', personId: 677951, name: 'Bobby Witt Jr.', teamId: 118, positions: ['SS'], slot: 'SS', isPitcher: false },
  { playerKey: 'mlb.592450', personId: 592450, name: 'Aaron Judge', teamId: 147, positions: ['OF'], slot: 'OF', isPitcher: false },
  { playerKey: 'mlb.663656', personId: 663656, name: 'Kyle Tucker', teamId: 119, positions: ['OF', 'UTIL'], slot: 'OF', isPitcher: false },
  { playerKey: 'mlb.665742', personId: 665742, name: 'Juan Soto', teamId: 121, positions: ['OF'], slot: 'OF', isPitcher: false },
  { playerKey: 'mlb.624413', personId: 624413, name: 'Pete Alonso', teamId: 110, positions: ['1B', 'UTIL'], slot: 'UTIL', isPitcher: false },
  { playerKey: 'mlb.680776', personId: 680776, name: 'Jarren Duran', teamId: 111, positions: ['OF', 'UTIL'], slot: 'UTIL', isPitcher: false },
  { playerKey: 'mlb.682998', personId: 682998, name: 'Corbin Carroll', teamId: 109, positions: ['OF'], slot: 'BN', isPitcher: false },
  { playerKey: 'mlb.621566', personId: 621566, name: 'Matt Olson', teamId: 144, positions: ['1B', '3B'], slot: 'BN', isPitcher: false },
  { playerKey: 'mlb.592663', personId: 592663, name: 'J.T. Realmuto', teamId: 143, positions: ['C'], slot: 'BN', isPitcher: false },
  { playerKey: 'mlb.596019', personId: 596019, name: 'Francisco Lindor', teamId: 121, positions: ['SS'], slot: 'BN', isPitcher: false },
  { playerKey: 'mlb.592518', personId: 592518, name: 'Manny Machado', teamId: 135, positions: ['3B', 'UTIL'], slot: 'BN', isPitcher: false },
  { playerKey: 'mlb.701538', personId: 701538, name: 'Jackson Merrill', teamId: 135, positions: ['OF'], slot: 'BN', isPitcher: false },
  { playerKey: 'mlb.670770', personId: 670770, name: 'TJ Friedl', teamId: 113, positions: ['OF', 'UTIL'], slot: 'IL', isPitcher: false },

  // Pitchers
  { playerKey: 'mlb.694973', personId: 694973, name: 'Paul Skenes', teamId: 134, positions: ['SP'], slot: 'SP', isPitcher: true },
  { playerKey: 'mlb.554430', personId: 554430, name: 'Zack Wheeler', teamId: 143, positions: ['SP'], slot: 'SP', isPitcher: true },
  { playerKey: 'mlb.623352', personId: 623352, name: 'Josh Hader', teamId: 117, positions: ['RP'], slot: 'RP', isPitcher: true },
  { playerKey: 'mlb.675911', personId: 675911, name: 'Spencer Strider', teamId: 144, positions: ['SP', 'RP'], slot: 'IL', isPitcher: true },
  { playerKey: 'mlb.543037', personId: 543037, name: 'Gerrit Cole', teamId: 147, positions: ['SP'], slot: 'SP', isPitcher: true },
  { playerKey: 'mlb.664854', personId: 664854, name: 'Ryan Helsley', teamId: 110, positions: ['RP'], slot: 'RP', isPitcher: true },
  { playerKey: 'mlb.669302', personId: 669302, name: 'Logan Gilbert', teamId: 136, positions: ['SP'], slot: 'P', isPitcher: true },
  { playerKey: 'mlb.661395', personId: 661395, name: 'Jhoan Duran', teamId: 143, positions: ['RP'], slot: 'P', isPitcher: true },
  { playerKey: 'mlb.664285', personId: 664285, name: 'Framber Valdez', teamId: 116, positions: ['SP'], slot: 'P', isPitcher: true },
  { playerKey: 'mlb.642397', personId: 642397, name: 'Gregory Soto', teamId: 134, positions: ['RP'], slot: 'BN', isPitcher: true },
];

export const SAMPLE_TEAM = {
  teamKey: '458.l.000000.t.1', name: 'Bunts', leagueKey: '458.l.000000', logoUrl: null, rank: 3,
};

export const SAMPLE_LEAGUE = {
  leagueKey: '458.l.000000',
  name: 'Sample roster — real players, not your league',
  scoringCategories: ['R', 'HR', 'RBI', 'SB', 'AVG', 'W', 'SV', 'K', 'ERA', 'WHIP'],
  keeperSlots: 12,
  weeklyAddLimit: 6,
  currentWeek: null,
};

function todayIso(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function mlbDate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${date.getFullYear()}`;
}

interface Env {
  BUNTS?: KVNamespace;
}

const CACHE_TTL_SECONDS = 300;

/**
 * Assembles a Roster-shaped object (same contract as the real Yahoo path
 * will use) from live MLB Stats API data for the fixed player list above.
 * Cached in KV for a few minutes so a burst of page loads doesn't turn into
 * a burst of MLB API calls -- this is read on every `/roster` request while
 * Yahoo is dark.
 */
export async function buildSampleRoster(env: Env): Promise<unknown> {
  const date = todayIso();
  const cacheKey = `mlb:sample-roster:${date}`;

  if (env.BUNTS) {
    const cached = await env.BUNTS.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  const teamIds = [...new Set(SAMPLE_ROSTER_PLAYERS.map((p) => p.teamId))];
  const personIds = SAMPLE_ROSTER_PLAYERS.map((p) => p.personId);
  const season = new Date().getFullYear();
  const rangeEnd = new Date();
  const rangeStart = new Date(rangeEnd);
  rangeStart.setDate(rangeStart.getDate() - 14);

  const [schedule, statuses, stats, recentGames] = await Promise.all([
    getScheduleByTeams(teamIds, date),
    getRosterStatuses(teamIds),
    getPlayerStats(personIds, season, mlbDate(rangeStart), mlbDate(rangeEnd)),
    getRecentGames(personIds, season, 5),
  ]);

  const lockAt = [...schedule.values()]
    .map((g) => g.gameDate)
    .filter((d): d is string => !!d)
    .sort()[0] ?? null;

  const players = SAMPLE_ROSTER_PLAYERS.map((def) => {
    const game = schedule.get(def.teamId);
    const line = stats.get(def.personId);
    const mlbStatus = statuses.get(def.personId) ?? null;

    return {
      playerKey: def.playerKey,
      name: def.name,
      mlbTeam: MLB_TEAM_ABBR[def.teamId] ?? '',
      positions: def.positions,
      slot: def.slot,
      status: mlbStatus,
      startingToday: startingToday(def.personId, def.isPitcher, game),
      opponent: game?.opponent ?? null,
      opposingPitcher: game?.probablePitcherName ?? null,
      seasonStats: line?.season ?? {},
      last14Stats: line?.last14 ?? {},
      percentOwned: null,
      recentGames: recentGames.get(def.personId) ?? [],
      note: mlbStatus ? `MLB roster status: ${mlbStatus}.` : null,
    };
  });

  const roster = {
    fetchedAt: new Date().toISOString(),
    lockAt,
    sample: true,
    team: SAMPLE_TEAM,
    league: SAMPLE_LEAGUE,
    players,
  };

  if (env.BUNTS) {
    await env.BUNTS.put(cacheKey, JSON.stringify(roster), { expirationTtl: CACHE_TTL_SECONDS });
  }

  return roster;
}
