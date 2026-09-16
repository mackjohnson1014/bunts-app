/**
 * Mack's real fantasy roster -- Yahoo can't tell us this yet (still not
 * provisioned, see claude/status.md), so Mack gave it to us directly by
 * pasting a screenshot of his Yahoo team on 2026-09-16. This is genuinely
 * his 27-man roster, not a stand-in -- every playerKey below was matched to
 * a real MLB person id via the live MLB Stats API active-player list (not
 * typed from memory), cross-checked against the team each player was shown
 * on in the screenshot to disambiguate common surnames.
 *
 * What's still a placeholder: the STARTING SLOT for each hitter/pitcher
 * (which 9 hitters are in the C/1B/2B/3B/SS/OF/OF/OF/UTIL slots vs. bench,
 * which pitchers are SP/RP/P/bench) -- the screenshot showed positional
 * eligibility and today's real-game status, not Yahoo's actual lineup-slot
 * assignment, so the slots below are a reasonable default built from each
 * player's eligibility (one clean starter per position first, then the
 * fuller picture fills UTIL/bench). Ask Mack to correct any that are wrong.
 * League name, scoring categories, keeper slots, and team rank are still
 * unknown and stay placeholder until Yahoo is connected.
 *
 * `mlb.ts` fills in everything else about these players live on every
 * request: season stats, last-14 stats, recent games, today's real game
 * status and opposing pitcher, and real injury/IL status.
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

export const SAMPLE_ROSTER_PLAYERS: SamplePlayerDef[] = [
  // Hitters -- C/1B/2B/3B/SS/OF x3/UTIL starting, 4 bench, 1 IL (Pages, per
  // the screenshot's own "IL" flag; DeLauter's "DTD" is a status, not a
  // bench assignment, so he stays in his OF slot).
  { playerKey: 'mlb.661388', personId: 661388, name: 'William Contreras', teamId: 158, positions: ['C'], slot: 'C', isPitcher: false },
  { playerKey: 'mlb.686469', personId: 686469, name: 'Vinnie Pasquantino', teamId: 118, positions: ['1B'], slot: '1B', isPitcher: false },
  { playerKey: 'mlb.683953', personId: 683953, name: 'Travis Bazzana', teamId: 114, positions: ['2B'], slot: '2B', isPitcher: false },
  { playerKey: 'mlb.571970', personId: 571970, name: 'Max Muncy', teamId: 119, positions: ['3B'], slot: '3B', isPitcher: false },
  { playerKey: 'mlb.608369', personId: 608369, name: 'Corey Seager', teamId: 140, positions: ['SS'], slot: 'SS', isPitcher: false },
  { playerKey: 'mlb.545361', personId: 545361, name: 'Mike Trout', teamId: 108, positions: ['OF'], slot: 'OF', isPitcher: false },
  { playerKey: 'mlb.681715', personId: 681715, name: 'Heriberto Hernández', teamId: 146, positions: ['OF'], slot: 'OF', isPitcher: false },
  { playerKey: 'mlb.800050', personId: 800050, name: 'Chase DeLauter', teamId: 114, positions: ['OF'], slot: 'OF', isPitcher: false },
  { playerKey: 'mlb.702616', personId: 702616, name: 'Jackson Holliday', teamId: 110, positions: ['2B', 'SS', 'UTIL'], slot: 'UTIL', isPitcher: false },
  { playerKey: 'mlb.700250', personId: 700250, name: 'Ben Rice', teamId: 147, positions: ['C', '1B'], slot: 'BN', isPitcher: false },
  { playerKey: 'mlb.687952', personId: 687952, name: 'Christian Encarnacion-Strand', teamId: 110, positions: ['1B', '3B'], slot: 'BN', isPitcher: false },
  { playerKey: 'mlb.805999', personId: 805999, name: 'A.J. Ewing', teamId: 121, positions: ['2B', 'OF'], slot: 'BN', isPitcher: false },
  { playerKey: 'mlb.683737', personId: 683737, name: 'Michael Busch', teamId: 112, positions: ['1B'], slot: 'BN', isPitcher: false },
  { playerKey: 'mlb.681624', personId: 681624, name: 'Andy Pages', teamId: 119, positions: ['OF'], slot: 'IL', isPitcher: false },

  // Pitchers -- 5 SP, 1 RP, 5 P (flex), 2 bench. Ohtani listed specifically
  // as "(Pitcher)" in the screenshot, i.e. his pitching-side roster spot.
  { playerKey: 'mlb.807739', personId: 807739, name: 'Kade Anderson', teamId: 136, positions: ['SP'], slot: 'SP', isPitcher: true },
  { playerKey: 'mlb.554430', personId: 554430, name: 'Zack Wheeler', teamId: 143, positions: ['SP'], slot: 'SP', isPitcher: true },
  { playerKey: 'mlb.605483', personId: 605483, name: 'Blake Snell', teamId: 119, positions: ['SP'], slot: 'SP', isPitcher: true },
  { playerKey: 'mlb.696149', personId: 696149, name: 'Bubba Chandler', teamId: 134, positions: ['SP'], slot: 'SP', isPitcher: true },
  { playerKey: 'mlb.660271', personId: 660271, name: 'Shohei Ohtani', teamId: 119, positions: ['SP'], slot: 'SP', isPitcher: true },
  { playerKey: 'mlb.656730', personId: 656730, name: 'Trevor Megill', teamId: 158, positions: ['RP'], slot: 'RP', isPitcher: true },
  { playerKey: 'mlb.669713', personId: 669713, name: 'Hayden Wesneski', teamId: 117, positions: ['SP'], slot: 'P', isPitcher: true },
  { playerKey: 'mlb.672456', personId: 672456, name: 'Keider Montero', teamId: 116, positions: ['SP', 'RP'], slot: 'P', isPitcher: true },
  { playerKey: 'mlb.645261', personId: 645261, name: 'Sandy Alcantara', teamId: 146, positions: ['SP'], slot: 'P', isPitcher: true },
  { playerKey: 'mlb.543135', personId: 543135, name: 'Nathan Eovaldi', teamId: 140, positions: ['SP'], slot: 'P', isPitcher: true },
  { playerKey: 'mlb.571510', personId: 571510, name: 'Matthew Boyd', teamId: 112, positions: ['SP'], slot: 'P', isPitcher: true },
  { playerKey: 'mlb.624133', personId: 624133, name: 'Ranger Suarez', teamId: 111, positions: ['SP'], slot: 'BN', isPitcher: true },
  { playerKey: 'mlb.543243', personId: 543243, name: 'Sonny Gray', teamId: 111, positions: ['SP'], slot: 'BN', isPitcher: true },
];

export const SAMPLE_TEAM = {
  teamKey: '458.l.000000.t.1', name: 'Bunts', leagueKey: '458.l.000000', logoUrl: null, rank: null,
};

export const SAMPLE_LEAGUE = {
  leagueKey: '458.l.000000',
  name: 'Your real roster — live MLB stats, league details pending Yahoo',
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
 * Assembles a Roster-shaped object (same contract the real Yahoo path will
 * use) from live MLB Stats API data for Mack's real player list above.
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
