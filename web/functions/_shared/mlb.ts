/**
 * MLB Stats API client -- read-only, no API key required.
 *
 * This is a SEPARATE data source from Yahoo. Yahoo tells us who is on the
 * fantasy roster and how the league scores; the MLB Stats API tells us what
 * is actually happening in real games -- live status, real stat lines, real
 * injury status. Until Yahoo is provisioned we don't know the real fantasy
 * roster, so `sampleRoster.ts` pins a fixed list of real, well-known MLB
 * players and this module fills in their live data -- real data about
 * players who are not (yet) known to be Mack's actual team.
 *
 * https://statsapi.mlb.com -- undocumented but public and widely used for
 * exactly this kind of read (no key, no auth, generous rate limits for
 * personal-scale traffic).
 */

const BASE = 'https://statsapi.mlb.com/api/v1';

async function fetchMlb<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(`MLB Stats API ${res.status} on ${path}: ${(await res.text()).slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

/**
 * MLB's own headshot CDN (Cloudinary-backed, the same one mlb.com uses).
 * No auth, works for any valid person id, and degrades to a generic
 * silhouette (still HTTP 200, still an image) for an id it doesn't
 * recognize rather than erroring -- so this never needs a fallback path,
 * just an <img> tag.
 */
export function headshotUrl(personId: number): string {
  return (
    'https://img.mlbstatic.com/mlb-photos/image/upload/' +
    'd_people:generic:headshot:67:current.png,q_auto:best,f_auto,w_180/' +
    `v1/people/${personId}/headshot/67/current`
  );
}

/** Stable across seasons -- MLB has not added or removed a team in decades. */
export const MLB_TEAM_ABBR: Record<number, string> = {
  108: 'LAA', 109: 'AZ', 110: 'BAL', 111: 'BOS', 112: 'CHC', 113: 'CIN',
  114: 'CLE', 115: 'COL', 116: 'DET', 117: 'HOU', 118: 'KC', 119: 'LAD',
  120: 'WSH', 121: 'NYM', 133: 'ATH', 134: 'PIT', 135: 'SD', 136: 'SEA',
  137: 'SF', 138: 'STL', 139: 'TB', 140: 'TEX', 141: 'TOR', 142: 'MIN',
  143: 'PHI', 144: 'ATL', 145: 'CWS', 146: 'MIA', 147: 'NYY', 158: 'MIL',
};

/** Same three-state contract as Bunts' own `PlayerStatus` -- see CLAUDE.md. */
export type MlbPlayerStatus = 'DTD' | 'IL10' | 'IL15' | 'IL60' | 'NA' | 'SUSP' | null;

const ROSTER_STATUS: Record<string, MlbPlayerStatus> = {
  A: null,    // Active
  D10: 'IL10',
  D15: 'IL15',
  D60: 'IL60',
  DTD: 'DTD',
  SU: 'SUSP',
  RM: 'NA',   // Reassigned to minors
  RES: 'NA',  // Restricted list
};

export interface GameLine {
  date: string;
  opponent: string;
  summary: string;
  quality: 'good' | 'neutral' | 'bad' | 'dnp';
}

export interface TeamGameInfo {
  opponent: string | null;              // "@ TOR" or "vs BOS"
  gameStatus: string;                   // MLB's detailedState, e.g. "Scheduled", "Final"
  gameDate: string | null;              // ISO first pitch
  probablePitcherId: number | null;     // the pitcher THIS team's hitters face
  probablePitcherName: string | null;
  lineupIds: Set<number> | null;        // null = lineup not posted yet
}

// ---- roster status ----------------------------------------------------------

/**
 * Injury/active status per player, read from each team's 40-man roster.
 * Batched per distinct team (not per player) and tolerant of a single team's
 * roster call failing -- those players just read as active rather than
 * taking the whole roster down.
 */
export async function getRosterStatuses(teamIds: number[]): Promise<Map<number, MlbPlayerStatus>> {
  const unique = [...new Set(teamIds)];
  const out = new Map<number, MlbPlayerStatus>();
  await Promise.all(unique.map(async (teamId) => {
    try {
      const data = await fetchMlb<{ roster: Array<{ person: { id: number }; status: { code: string } }> }>(
        `/teams/${teamId}/roster/40Man`,
      );
      for (const entry of data.roster) {
        out.set(entry.person.id, ROSTER_STATUS[entry.status.code] ?? null);
      }
    } catch {
      /* that team's status just falls back to "active" for its players */
    }
  }));
  return out;
}

// ---- schedule / game status ---------------------------------------------------

interface ScheduleResponse {
  dates: Array<{ games: Array<{
    status: { detailedState: string };
    gameDate: string;
    teams: {
      away: { team: { id: number }; probablePitcher?: { id: number; fullName: string } };
      home: { team: { id: number }; probablePitcher?: { id: number; fullName: string } };
    };
    lineups?: { homePlayers?: Array<{ id: number }>; awayPlayers?: Array<{ id: number }> };
  }> }>;
}

/** One batched call for every distinct team playing today, keyed by team id. */
export async function getScheduleByTeams(teamIds: number[], date: string): Promise<Map<number, TeamGameInfo>> {
  const unique = [...new Set(teamIds)];
  const out = new Map<number, TeamGameInfo>();
  if (unique.length === 0) return out;

  const data = await fetchMlb<ScheduleResponse>(
    `/schedule?sportId=1&date=${date}&teamId=${unique.join(',')}&hydrate=probablePitcher,lineups,team`,
  );

  for (const game of data.dates[0]?.games ?? []) {
    const { away, home } = game.teams;
    const lineupIds = game.lineups && (game.lineups.homePlayers?.length || game.lineups.awayPlayers?.length)
      ? new Set([...(game.lineups.homePlayers ?? []), ...(game.lineups.awayPlayers ?? [])].map((p) => p.id))
      : null;

    out.set(away.team.id, {
      opponent: `@ ${MLB_TEAM_ABBR[home.team.id] ?? '?'}`,
      gameStatus: game.status.detailedState,
      gameDate: game.gameDate ?? null,
      probablePitcherId: home.probablePitcher?.id ?? null,
      probablePitcherName: home.probablePitcher?.fullName ?? null,
      lineupIds,
    });
    out.set(home.team.id, {
      opponent: `vs ${MLB_TEAM_ABBR[away.team.id] ?? '?'}`,
      gameStatus: game.status.detailedState,
      gameDate: game.gameDate ?? null,
      probablePitcherId: away.probablePitcher?.id ?? null,
      probablePitcherName: away.probablePitcher?.fullName ?? null,
      lineupIds,
    });
  }

  return out;
}

/**
 * Three-state, matching `Player.startingToday` in `src/types.ts`: null means
 * unknown, never "not starting". For a pitcher that's whether they're the
 * announced probable starter (known days ahead); for a hitter it's whether
 * they're in the posted lineup (usually not known until a couple of hours
 * before first pitch).
 */
export function startingToday(personId: number, isPitcher: boolean, game: TeamGameInfo | undefined): boolean | null {
  if (!game) return null;
  if (isPitcher) {
    if (game.probablePitcherId == null) return null;
    return game.probablePitcherId === personId;
  }
  if (game.lineupIds == null) return null;
  return game.lineupIds.has(personId);
}

// ---- stats --------------------------------------------------------------------

interface StatSplit { stat: Record<string, unknown>; sport?: { id: number } }
interface StatBlock { type: { displayName: string }; group: { displayName: string }; splits: StatSplit[] }
interface PeopleStatsResponse { people: Array<{ id: number; stats?: StatBlock[] }> }

const num = (v: unknown): number => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v) || 0;
  return 0;
};

// Bunts category key -> MLB Stats API field name.
const HITTING_KEYS: Record<string, string> = { R: 'runs', HR: 'homeRuns', RBI: 'rbi', SB: 'stolenBases', AVG: 'avg', G: 'gamesPlayed' };
const PITCHING_KEYS: Record<string, string> = { W: 'wins', SV: 'saves', K: 'strikeOuts', ERA: 'era', WHIP: 'whip', G: 'gamesPitched' };

function mapStat(raw: Record<string, unknown> | undefined, keys: Record<string, string>): Record<string, number> {
  if (!raw) return {};
  const out: Record<string, number> = {};
  for (const [bunt, mlb] of Object.entries(keys)) out[bunt] = num(raw[mlb]);
  return out;
}

/**
 * Some stat types (byDateRange in particular) return more than one split --
 * a major-league-only one and an "All" cross-level one. `sport.id === 1` is
 * the majors; that's the one that matches what a fantasy line means.
 */
function pickSplit(block: StatBlock | undefined): Record<string, unknown> | undefined {
  if (!block || block.splits.length === 0) return undefined;
  return (block.splits.find((s) => s.sport == null || s.sport.id === 1) ?? block.splits[0]).stat;
}

export interface PersonStatLines {
  season: Record<string, number>;
  last14: Record<string, number>;
}

/** One batched call for every player's season line and last-14-day line. */
export async function getPlayerStats(
  personIds: number[],
  season: number,
  last14Start: string,
  last14End: string,
): Promise<Map<number, PersonStatLines>> {
  const out = new Map<number, PersonStatLines>();
  if (personIds.length === 0) return out;

  const hydrate = `stats(group=[hitting,pitching],type=[season,byDateRange],season=${season},startDate=${last14Start},endDate=${last14End})`;
  const data = await fetchMlb<PeopleStatsResponse>(
    `/people?personIds=${personIds.join(',')}&hydrate=${encodeURIComponent(hydrate)}`,
  );

  for (const person of data.people) {
    const find = (type: string, group: string) =>
      person.stats?.find((s) => s.type.displayName === type && s.group.displayName === group);

    const pitchingSeason = find('season', 'pitching');
    const isPitcher = (pitchingSeason?.splits.length ?? 0) > 0;

    out.set(person.id, {
      season: isPitcher
        ? mapStat(pickSplit(pitchingSeason), PITCHING_KEYS)
        : mapStat(pickSplit(find('season', 'hitting')), HITTING_KEYS),
      last14: isPitcher
        ? mapStat(pickSplit(find('byDateRange', 'pitching')), PITCHING_KEYS)
        : mapStat(pickSplit(find('byDateRange', 'hitting')), HITTING_KEYS),
    });
  }
  return out;
}

// ---- career vs. opposing pitcher -------------------------------------------------

export interface VsPitcherStats {
  pitcherName: string;
  games: number;
  atBats: number;
  hits: number;
  homeRuns: number;
  rbi: number;
  avg: number;
  obp: number;
  slg: number;
  strikeOuts: number;
  walks: number;
}

/**
 * One (hitter, opposing starter) pair to look up. `pitcherName` rides along
 * so the caller doesn't need a second lookup just to label the result.
 */
export interface VsPitcherMatchup {
  personId: number;
  pitcherId: number;
  pitcherName: string;
}

/**
 * Career totals for a hitter against a specific pitcher -- everything they've
 * ever faced each other, not scoped to a season. Batters facing the SAME
 * pitcher today are batched into one call each (grouped by pitcherId), since
 * `opposingPlayerId` is a single value per request and can't itself batch.
 * A pair with no history comes back with an empty split, which is treated
 * the same as a lookup failure: simply absent from the returned map, not an
 * error -- "he's never faced this pitcher" is a normal, common case.
 */
export async function getBatterVsPitcher(matchups: VsPitcherMatchup[]): Promise<Map<number, VsPitcherStats>> {
  const out = new Map<number, VsPitcherStats>();
  if (matchups.length === 0) return out;

  const byPitcher = new Map<number, number[]>();
  for (const m of matchups) {
    const list = byPitcher.get(m.pitcherId) ?? [];
    list.push(m.personId);
    byPitcher.set(m.pitcherId, list);
  }
  const nameByPitcher = new Map(matchups.map((m) => [m.pitcherId, m.pitcherName]));

  await Promise.all([...byPitcher.entries()].map(async ([pitcherId, personIds]) => {
    try {
      const hydrate = `stats(group=hitting,type=vsPlayerTotal,opposingPlayerId=${pitcherId})`;
      const data = await fetchMlb<PeopleStatsResponse>(
        `/people?personIds=${personIds.join(',')}&hydrate=${encodeURIComponent(hydrate)}`,
      );
      for (const person of data.people) {
        const stat = person.stats?.find((s) => s.type.displayName === 'vsPlayerTotal')?.splits[0]?.stat;
        if (!stat || num(stat.atBats) === 0) continue;   // no career history -- leave unset
        out.set(person.id, {
          pitcherName: nameByPitcher.get(pitcherId) ?? '',
          games: num(stat.gamesPlayed),
          atBats: num(stat.atBats),
          hits: num(stat.hits),
          homeRuns: num(stat.homeRuns),
          rbi: num(stat.rbi),
          avg: num(stat.avg),
          obp: num(stat.obp),
          slg: num(stat.slg),
          strikeOuts: num(stat.strikeOuts),
          walks: num(stat.baseOnBalls),
        });
      }
    } catch {
      /* that pitcher's matchup data just stays unset for these hitters */
    }
  }));

  return out;
}

// ---- recent games ---------------------------------------------------------------

function qualityFor(isPitcher: boolean, stat: Record<string, unknown>): GameLine['quality'] {
  if (isPitcher) {
    const er = num(stat.earnedRuns);
    const ip = parseFloat(String(stat.inningsPitched ?? '0')) || 0;
    if (ip === 0) return 'dnp';
    const era9 = (er * 9) / ip;   // earned runs per 9 innings, for this outing only
    if (er === 0 && ip >= 5) return 'good';
    if (era9 >= 6) return 'bad';
    return 'neutral';
  }
  const ab = num(stat.atBats);
  if (ab === 0) return 'dnp';
  if (num(stat.homeRuns) > 0 || num(stat.hits) >= 3) return 'good';
  if (num(stat.hits) === 0) return 'bad';
  return 'neutral';
}

interface GameLogResponse {
  people: Array<{ id: number; stats?: Array<{
    type: { displayName: string };
    group: { displayName: string };
    splits: Array<{ date: string; isHome: boolean; opponent?: { id: number }; stat: Record<string, unknown> }>;
  }> }>;
}

/** One batched call for every player's last `limit` played games, newest first. */
export async function getRecentGames(personIds: number[], season: number, limit = 5): Promise<Map<number, GameLine[]>> {
  const out = new Map<number, GameLine[]>();
  if (personIds.length === 0) return out;

  const hydrate = `stats(group=[hitting,pitching],type=[gameLog],season=${season},limit=${limit})`;
  const data = await fetchMlb<GameLogResponse>(
    `/people?personIds=${personIds.join(',')}&hydrate=${encodeURIComponent(hydrate)}`,
  );

  for (const person of data.people) {
    const block = person.stats?.find((s) => s.type.displayName === 'gameLog');
    const isPitcher = block?.group.displayName === 'pitching';
    const splits = [...(block?.splits ?? [])]
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      .slice(0, limit);

    out.set(person.id, splits.map((s) => ({
      date: s.date,
      opponent: `${s.isHome ? 'vs' : '@'} ${s.opponent ? MLB_TEAM_ABBR[s.opponent.id] ?? '?' : '?'}`,
      summary: String(s.stat.summary ?? ''),
      quality: qualityFor(isPitcher, s.stat),
    })));
  }
  return out;
}
