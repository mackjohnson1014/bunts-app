/**
 * Yahoo -> Bunts translation.
 *
 * STATUS: stubbed. We have never seen a real Yahoo fantasy response for this
 * league, so writing this now would be writing fiction. The shapes in
 * mobile/src/types.ts are the contract; this file is the only place that should
 * need to change once `yahoo.py dump` produces real JSON.
 *
 * Yahoo's JSON is notoriously awkward -- objects keyed by numeric strings,
 * arrays that mix metadata and content, a `count` sibling you have to respect.
 * Resist the urge to hand-index it; walk it.
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
