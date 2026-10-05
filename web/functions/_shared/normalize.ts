/**
 * Yahoo -> Bunts translation.
 *
 * STATUS: stubbed. We have never seen a real Yahoo fantasy response for this
 * league, so writing this now would be writing fiction. The shapes in
 * web/src/types.ts are the contract; this file is the only place that should
 * need to change once `yahoo.py dump` produces real JSON.
 *
 * Yahoo's JSON is notoriously awkward -- objects keyed by numeric strings,
 * arrays that mix metadata and content, a `count` sibling you have to respect.
 * Resist the urge to hand-index it; walk it.
 *
 * Confirmed from Yahoo's docs (sports.yahoo.com/developer/docs, read 2026-10-05)
 * -- endpoints and field names only, NOT the JSON shapes, which still need a dump:
 *  - Stats come back keyed by numeric `stat_id`, not name. The id -> name map
 *    for this league is in `league/{key}/settings` (stat_categories). Build the
 *    lookup from that response; don't hardcode ids.
 *  - MLB rosters are by DATE, not week: `team/{key}/roster;date=YYYY-MM-DD`
 *    (defaults to today). Each player carries a `selected_position` -- that is
 *    the real LU/BN slot the sample roster currently guesses.
 *  - Team resources include `roster_adds` (coverage_type week, value = adds
 *    used) -> TeamWeekTotals adds / OpponentActivity.
 *  - This week's opponent: `team/{key}/matchups;weeks={n}` (current week is
 *    `current_week` in league metadata), or `league/{key}/scoreboard`.
 *
 * Lives in web/functions/_shared/ (moved from backend/src/ on 2026-10-05) so
 * the /api handlers and the cron Worker share one translation layer.
 */

export interface Player {
  playerKey: string;
  name: string;
  mlbTeam: string;
  positions: string[];
  slot: string;
  status: string | null;
  startingToday: boolean | null;
  opponent: string | null;
  opposingPitcher: string | null;
  seasonStats: Record<string, number>;
  last14Stats: Record<string, number>;
  percentOwned: number | null;
}

export interface Roster {
  team: { teamKey: string; name: string; leagueKey: string; logoUrl: string | null; rank: number | null };
  league: { leagueKey: string; name: string; scoringCategories: string[]; keeperSlots: number; currentWeek: number | null };
  players: Player[];
  fetchedAt: string;
}

/**
 * Recursively collect every object in Yahoo's tree that has the given key.
 * Yahoo nests inconsistently; this is more robust than positional indexing.
 */
export function collect(node: unknown, key: string, out: unknown[] = []): unknown[] {
  if (Array.isArray(node)) {
    for (const v of node) collect(v, key, out);
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === key) out.push(v);
      collect(v, key, out);
    }
  }
  return out;
}

export function normalizeRoster(_raw: unknown): Roster {
  throw new Error(
    'normalizeRoster is not implemented yet — run `python3 yahoo.py dump` once ' +
    'Yahoo provisions access, then write this against the real response.',
  );
}
