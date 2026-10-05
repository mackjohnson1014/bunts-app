/**
 * Mack's real fantasy roster -- Yahoo can't tell us this yet (still not
 * provisioned, see claude/status.md), so Mack gave it to us directly:
 * first a screenshot of his Yahoo team (2026-09-16) to identify the 27
 * players, then a second screenshot of the same roster showing each
 * player's actual occupied slot. This is genuinely his roster, not a
 * stand-in -- every playerKey below was matched to a real MLB person id
 * via the live MLB Stats API active-player list (not typed from memory),
 * cross-checked against the team each player was shown on to disambiguate
 * common surnames, and every `slot` below is copied directly from Mack's
 * own screenshot of his occupied slots, not guessed.
 *
 * Still placeholder until Yahoo is connected: league name, scoring
 * categories, keeper slots, and team rank.
 *
 * `mlb.ts` fills in everything else about these players live on every
 * request: season stats, last-14 stats, recent games, today's real game
 * status and opposing pitcher, and real injury/IL status.
 */

import {
  getBatterVsPitcher, getPlayerStats, getPlayerStatsByRange, getRecentGames, getRosterStatuses, getScheduleByTeams,
  headshotUrl, startingToday, MLB_TEAM_ABBR,
} from './mlb';

export interface SamplePlayerDef {
  playerKey: string;
  personId: number;
  name: string;
  teamId: number;
  positions: string[];
  slot: string;
  isPitcher: boolean;
  /**
   * When and how he joined Mack's team. Unknown for everyone until Mack
   * supplies it or Yahoo's draftresults/transactions are connected --
   * left absent rather than guessed. Shape matches `Acquisition` in
   * web/src/types.ts.
   */
  acquired?: {
    how: 'draft' | 'keeper' | 'waiver' | 'free-agent' | 'trade';
    date: string;     // ISO, e.g. '2026-07-14'
    detail?: string;
  };
}

// PLACEHOLDER `acquired` values (2026-10-05, at Mack's request, to preview the
// player card's "On our team" section): 13 players marked as keepers from
// opening day, the other 14 given RANDOM add dates and types. None of these
// are real -- replace with Yahoo's draftresults/transactions (or Mack's
// screenshots) before trusting any "with us" numbers.
export const SAMPLE_ROSTER_PLAYERS: SamplePlayerDef[] = [
  // Hitters -- exact slots from Mack's own screenshot of his Yahoo roster
  // (2026-09-16): C/1B/2B/3B/SS/OF x3/Util x2 starting, 3 bench, 1 IL.
  { playerKey: 'mlb.661388', personId: 661388, name: 'William Contreras', teamId: 158, positions: ['C'], slot: 'C', isPitcher: false, acquired: { how: 'keeper', date: '2026-03-25' } },
  { playerKey: 'mlb.700250', personId: 700250, name: 'Ben Rice', teamId: 147, positions: ['C', '1B'], slot: '1B', isPitcher: false, acquired: { how: 'trade', date: '2026-06-10' } },
  { playerKey: 'mlb.683953', personId: 683953, name: 'Travis Bazzana', teamId: 114, positions: ['2B'], slot: '2B', isPitcher: false, acquired: { how: 'free-agent', date: '2026-06-15' } },
  { playerKey: 'mlb.687952', personId: 687952, name: 'Christian Encarnacion-Strand', teamId: 110, positions: ['1B', '3B'], slot: '3B', isPitcher: false, acquired: { how: 'waiver', date: '2026-05-10' } },
  { playerKey: 'mlb.608369', personId: 608369, name: 'Corey Seager', teamId: 140, positions: ['SS'], slot: 'SS', isPitcher: false, acquired: { how: 'keeper', date: '2026-03-25' } },
  { playerKey: 'mlb.545361', personId: 545361, name: 'Mike Trout', teamId: 108, positions: ['OF'], slot: 'OF', isPitcher: false, acquired: { how: 'keeper', date: '2026-03-25' } },
  { playerKey: 'mlb.805999', personId: 805999, name: 'A.J. Ewing', teamId: 121, positions: ['2B', 'OF'], slot: 'OF', isPitcher: false, acquired: { how: 'trade', date: '2026-08-20' } },
  { playerKey: 'mlb.681715', personId: 681715, name: 'Heriberto Hernández', teamId: 146, positions: ['OF'], slot: 'OF', isPitcher: false, acquired: { how: 'waiver', date: '2026-04-06' } },
  { playerKey: 'mlb.683737', personId: 683737, name: 'Michael Busch', teamId: 112, positions: ['1B'], slot: 'UTIL', isPitcher: false, acquired: { how: 'keeper', date: '2026-03-25' } },
  { playerKey: 'mlb.686469', personId: 686469, name: 'Vinnie Pasquantino', teamId: 118, positions: ['1B'], slot: 'UTIL', isPitcher: false, acquired: { how: 'keeper', date: '2026-03-25' } },
  { playerKey: 'mlb.571970', personId: 571970, name: 'Max Muncy', teamId: 119, positions: ['3B'], slot: 'BN', isPitcher: false, acquired: { how: 'keeper', date: '2026-03-25' } },
  { playerKey: 'mlb.800050', personId: 800050, name: 'Chase DeLauter', teamId: 114, positions: ['OF'], slot: 'BN', isPitcher: false, acquired: { how: 'free-agent', date: '2026-04-29' } },
  { playerKey: 'mlb.702616', personId: 702616, name: 'Jackson Holliday', teamId: 110, positions: ['2B', 'SS'], slot: 'BN', isPitcher: false, acquired: { how: 'keeper', date: '2026-03-25' } },
  { playerKey: 'mlb.681624', personId: 681624, name: 'Andy Pages', teamId: 119, positions: ['OF'], slot: 'IL', isPitcher: false, acquired: { how: 'free-agent', date: '2026-08-16' } },

  // Pitchers -- exact slots from the same screenshot: 3 SP, 1 RP (Mack's
  // 2nd RP spot is actually open, so only 13 real pitchers here), 3 P
  // (flex), 5 bench, 1 IL. Ohtani is listed specifically as "(Pitcher)"
  // with an IL flag -- his pitching-side roster spot.
  { playerKey: 'mlb.807739', personId: 807739, name: 'Kade Anderson', teamId: 136, positions: ['SP'], slot: 'SP', isPitcher: true, acquired: { how: 'free-agent', date: '2026-07-23' } },
  { playerKey: 'mlb.554430', personId: 554430, name: 'Zack Wheeler', teamId: 143, positions: ['SP'], slot: 'SP', isPitcher: true, acquired: { how: 'keeper', date: '2026-03-25' } },
  { playerKey: 'mlb.605483', personId: 605483, name: 'Blake Snell', teamId: 119, positions: ['SP'], slot: 'SP', isPitcher: true, acquired: { how: 'keeper', date: '2026-03-25' } },
  { playerKey: 'mlb.656730', personId: 656730, name: 'Trevor Megill', teamId: 158, positions: ['RP'], slot: 'RP', isPitcher: true, acquired: { how: 'free-agent', date: '2026-08-29' } },
  { playerKey: 'mlb.696149', personId: 696149, name: 'Bubba Chandler', teamId: 134, positions: ['SP'], slot: 'P', isPitcher: true, acquired: { how: 'waiver', date: '2026-05-29' } },
  { playerKey: 'mlb.669713', personId: 669713, name: 'Hayden Wesneski', teamId: 117, positions: ['SP'], slot: 'P', isPitcher: true, acquired: { how: 'free-agent', date: '2026-05-09' } },
  { playerKey: 'mlb.672456', personId: 672456, name: 'Keider Montero', teamId: 116, positions: ['SP', 'RP'], slot: 'P', isPitcher: true, acquired: { how: 'free-agent', date: '2026-07-13' } },
  { playerKey: 'mlb.645261', personId: 645261, name: 'Sandy Alcantara', teamId: 146, positions: ['SP'], slot: 'BN', isPitcher: true, acquired: { how: 'keeper', date: '2026-03-25' } },
  { playerKey: 'mlb.543135', personId: 543135, name: 'Nathan Eovaldi', teamId: 140, positions: ['SP'], slot: 'BN', isPitcher: true, acquired: { how: 'keeper', date: '2026-03-25' } },
  { playerKey: 'mlb.571510', personId: 571510, name: 'Matthew Boyd', teamId: 112, positions: ['SP'], slot: 'BN', isPitcher: true, acquired: { how: 'free-agent', date: '2026-06-15' } },
  { playerKey: 'mlb.624133', personId: 624133, name: 'Ranger Suarez', teamId: 111, positions: ['SP'], slot: 'BN', isPitcher: true, acquired: { how: 'free-agent', date: '2026-06-10' } },
  { playerKey: 'mlb.543243', personId: 543243, name: 'Sonny Gray', teamId: 111, positions: ['SP'], slot: 'BN', isPitcher: true, acquired: { how: 'keeper', date: '2026-03-25' } },
  { playerKey: 'mlb.660271', personId: 660271, name: 'Shohei Ohtani', teamId: 119, positions: ['SP'], slot: 'IL', isPitcher: true, acquired: { how: 'keeper', date: '2026-03-25' } },
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
  // Real: Mack's starting slots, read off his Yahoo roster screenshot.
  rosterSlots: { C: 1, '1B': 1, '2B': 1, '3B': 1, SS: 1, OF: 3, UTIL: 2, SP: 3, RP: 2, P: 3 },
};

// ---- PLACEHOLDER draft and transaction history (2026-10-05) -----------------
// Built at Mack's request so the Keepers draft tab and the player card's
// transaction history can be seen before Yahoo is connected. Everything below
// is invented: a 12-team snake draft from the 5th slot, keepers spending the
// rounds in KEEPER_ROUND, the other 14 picks real MLB players (ids checked
// against the live MLB player list) who were "drafted and later dropped", and
// rival team names borrowed from mock.ts. Replace with Yahoo's draftresults and
// transactions.

const OTHER_TEAMS = ['Dinger Machine', 'Groundskeepers', 'Bullpen Mafia'];
const OPENING_DAY = '2026-03-25';
const DRAFT_TEAMS = 12;
const DRAFT_SLOT = 5;

const KEEPER_ROUND: Record<string, number> = {
  'Shohei Ohtani': 1, 'Corey Seager': 2, 'Zack Wheeler': 3, 'Mike Trout': 4, 'Blake Snell': 5,
  'William Contreras': 6, 'Michael Busch': 8, 'Vinnie Pasquantino': 9, 'Sandy Alcantara': 10,
  'Sonny Gray': 12, 'Nathan Eovaldi': 14, 'Max Muncy': 16, 'Jackson Holliday': 18,
};

const DRAFTED_AND_DROPPED: { round: number; personId: number; name: string; teamId: number; positions: string[] }[] = [
  { round: 7, personId: 641355, name: 'Cody Bellinger', teamId: 147, positions: ['OF'] },
  { round: 11, personId: 669364, name: 'Xavier Edwards', teamId: 146, positions: ['2B', 'SS'] },
  { round: 13, personId: 690916, name: 'Richard Fitts', teamId: 138, positions: ['SP'] },
  { round: 15, personId: 666624, name: 'Christopher Morel', teamId: 121, positions: ['1B', 'OF'] },
  { round: 17, personId: 681546, name: 'James Outman', teamId: 116, positions: ['OF'] },
  { round: 19, personId: 669622, name: 'Anthony Bender', teamId: 146, positions: ['RP'] },
  { round: 20, personId: 665828, name: 'Oswaldo Cabrera', teamId: 113, positions: ['3B'] },
  { round: 21, personId: 691009, name: 'Dylan Ray', teamId: 109, positions: ['SP'] },
  { round: 22, personId: 682657, name: 'Angel Martínez', teamId: 114, positions: ['OF'] },
  { round: 23, personId: 623211, name: 'Huascar Brazobán', teamId: 145, positions: ['RP'] },
  { round: 24, personId: 701655, name: 'Reed Trimble', teamId: 110, positions: ['OF'] },
  { round: 25, personId: 656786, name: 'Parker Mushinski', teamId: 115, positions: ['RP'] },
  { round: 26, personId: 695508, name: 'Cam Cauley', teamId: 140, positions: ['SS'] },
  { round: 27, personId: 692013, name: 'Henry Baez', teamId: 133, positions: ['RP'] },
];

/** Overall pick number in a snake draft. */
function overallPick(round: number): number {
  const inRound = round % 2 === 1 ? DRAFT_SLOT : DRAFT_TEAMS - DRAFT_SLOT + 1;
  return (round - 1) * DRAFT_TEAMS + inRound;
}

function placeholderDraft() {
  const keepers = SAMPLE_ROSTER_PLAYERS
    .filter((d) => KEEPER_ROUND[d.name] !== undefined)
    .map((d) => ({
      round: KEEPER_ROUND[d.name], playerKey: d.playerKey, playerName: d.name,
      mlbTeam: MLB_TEAM_ABBR[d.teamId] ?? '', positions: d.positions, keeper: true, onRoster: true,
    }));
  const dropped = DRAFTED_AND_DROPPED.map((d) => ({
    round: d.round, playerKey: `mlb.${d.personId}`, playerName: d.name,
    mlbTeam: MLB_TEAM_ABBR[d.teamId] ?? '', positions: d.positions, keeper: false, onRoster: false,
  }));
  return [...keepers, ...dropped]
    .map((p) => ({ ...p, pick: overallPick(p.round) }))
    .sort((a, b) => a.round - b.round);
}

function hashOf(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function shiftIso(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** A believable path to our roster, consistent with the placeholder `acquired`. Newest first. */
function placeholderHistory(def: SamplePlayerDef) {
  const a = def.acquired;
  if (!a) return undefined;
  const us = SAMPLE_TEAM.name;
  const h = hashOf(def.playerKey);
  const other = OTHER_TEAMS[h % OTHER_TEAMS.length];
  type Move = { date: string; kind: string; fromTeam: string | null; toTeam: string | null; detail?: string };
  const moves: Move[] = [];
  const draftedBy = (team: string): Move => ({ date: OPENING_DAY, kind: 'drafted', fromTeam: null, toTeam: team });

  switch (a.how) {
    case 'keeper':
      moves.push({
        date: a.date, kind: 'kept', fromTeam: null, toTeam: us,
        detail: KEEPER_ROUND[def.name] ? `Kept from last season with our round ${KEEPER_ROUND[def.name]} pick` : 'Kept from last season',
      });
      break;
    case 'draft':
      moves.push(draftedBy(us));
      break;
    case 'trade':
      moves.push(draftedBy(other), { date: a.date, kind: 'traded', fromTeam: other, toTeam: us });
      break;
    case 'waiver':
      moves.push(
        draftedBy(other),
        { date: shiftIso(a.date, -2), kind: 'dropped', fromTeam: other, toTeam: null },
        { date: a.date, kind: 'claimed', fromTeam: null, toTeam: us },
      );
      break;
    case 'free-agent':
      if (h % 2 === 0) {
        moves.push(draftedBy(other), { date: shiftIso(a.date, -(3 + (h % 10))), kind: 'dropped', fromTeam: other, toTeam: null });
      }
      moves.push({ date: a.date, kind: 'added', fromTeam: null, toTeam: us });
      break;
  }
  return moves.reverse().map((m) => ({ ...m, ours: m.toTeam === us || m.fromTeam === us }));
}

function todayIso(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function mlbDate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${date.getFullYear()}`;
}

/** Local midnight on the Monday that starts the week containing `date`. */
function mondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday .. 6 = Saturday
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

/** `date` plus `days` days, local time -- for turning a Monday into its Sunday. */
function plusDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
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
  const cacheKey = `mlb:sample-roster:v2:${date}`;

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

  // This week (Monday through today), for the roster's week-vs-season-pace
  // trend row.
  const thisMonday = mondayOf(rangeEnd);
  const thisSunday = plusDays(thisMonday, 6);

  const [schedule, statuses, stats, recentGames, weekStats] = await Promise.all([
    getScheduleByTeams(teamIds, date),
    getRosterStatuses(teamIds),
    getPlayerStats(personIds, season, mlbDate(rangeStart), mlbDate(rangeEnd)),
    getRecentGames(personIds, season, 5),
    getPlayerStatsByRange(personIds, mlbDate(thisMonday), mlbDate(thisSunday)),
  ]);

  // Career vs. tonight's opposing starter -- only meaningful for hitters, and
  // only once a game (and so an opposing pitcher) is known, so this has to
  // wait until `schedule` above has resolved rather than joining that
  // Promise.all.
  const vsPitcherMatchups = SAMPLE_ROSTER_PLAYERS
    .filter((def) => !def.isPitcher)
    .flatMap((def) => {
      const game = schedule.get(def.teamId);
      return game?.probablePitcherId != null
        ? [{ personId: def.personId, pitcherId: game.probablePitcherId, pitcherName: game.probablePitcherName ?? '' }]
        : [];
    });
  // Stats since joining us, for players who arrived mid-season. Drafted and
  // kept players' whole season is ours, so they need no extra call. One
  // batched call per distinct join date, not one per player.
  const byJoinDate = new Map<string, number[]>();
  for (const def of SAMPLE_ROSTER_PLAYERS) {
    const a = def.acquired;
    if (!a || a.how === 'draft' || a.how === 'keeper') continue;
    byJoinDate.set(a.date, [...(byJoinDate.get(a.date) ?? []), def.personId]);
  }
  const [vsPitcher, withUsByDate] = await Promise.all([
    getBatterVsPitcher(vsPitcherMatchups),
    Promise.all([...byJoinDate].map(([iso, ids]) =>
      getPlayerStatsByRange(ids, mlbDate(new Date(iso + 'T12:00:00')), mlbDate(rangeEnd)))),
  ]);
  const withUs = new Map<number, Record<string, number>>();
  for (const m of withUsByDate) for (const [id, line] of m) withUs.set(id, line);

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
      weekStats: weekStats.get(def.personId) ?? {},
      percentOwned: null,
      recentGames: recentGames.get(def.personId) ?? [],
      note: mlbStatus ? `MLB roster status: ${mlbStatus}.` : null,
      headshotUrl: headshotUrl(def.personId),
      vsPitcher: def.isPitcher ? null : vsPitcher.get(def.personId) ?? null,
      acquired: def.acquired ?? null,
      history: placeholderHistory(def),
      ...(withUs.has(def.personId) ? { withUsStats: withUs.get(def.personId) } : {}),
    };
  });

  const roster = {
    fetchedAt: new Date().toISOString(),
    lockAt,
    sample: true,
    team: SAMPLE_TEAM,
    league: SAMPLE_LEAGUE,
    players,
    draft: placeholderDraft(),
  };

  if (env.BUNTS) {
    await env.BUNTS.put(cacheKey, JSON.stringify(roster), { expirationTtl: CACHE_TTL_SECONDS });
  }

  return roster;
}
