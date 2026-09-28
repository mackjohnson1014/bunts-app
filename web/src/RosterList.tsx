import { useState } from 'react';
import { HITTER_KEYS, isPitcher, LOWER_IS_BETTER, PITCHER_KEYS, PlayerRow, StatHeader } from './components';
import type { Player } from './types';
import { STARTING_SLOTS } from './types';

/**
 * The roster list itself -- Hitters/Pitchers toggle, sticky sortable stat
 * header, and one row per player with this week's line underneath. Shared by
 * our own Roster screen and the opponent sheet on Matchup, so both teams are
 * read in exactly the same layout.
 */

/** Default order when no stat sort is chosen: starting slot, then bench,
 * then IL/NA. Array#sort is stable, so players keep their source order
 * within a bucket. */
const rosterRank = (p: Player) => (STARTING_SLOTS.includes(p.slot) ? 0 : p.slot === 'BN' ? 1 : 2);

type SortDir = 'asc' | 'desc';
type Sort = { key: string | null; dir: SortDir };

const defaultDirFor = (key: string): SortDir => (LOWER_IS_BETTER.has(key) ? 'asc' : 'desc');

const byStat = (key: string, dir: SortDir) => (a: Player, b: Player) => {
  const av = a.seasonStats[key];
  const bv = b.seasonStats[key];
  if (av === undefined && bv === undefined) return 0;
  if (av === undefined) return 1;  // players missing this stat always sort last
  if (bv === undefined) return -1;
  return dir === 'asc' ? av - bv : bv - av;
};

/**
 * Applies the active stat sort (or the default roster order when none is
 * chosen), then -- for pitchers only -- pins today's probable starters to
 * the top regardless of that ordering. Filter preserves relative order, so
 * partitioning an already stably-sorted array like this is itself stable.
 */
function orderPlayers(list: Player[], sort: Sort, pinStartingPitchers: boolean): Player[] {
  const sorted = [...list].sort(sort.key ? byStat(sort.key, sort.dir) : (a, b) => rosterRank(a) - rosterRank(b));
  if (!pinStartingPitchers) return sorted;
  const starting = sorted.filter((p) => p.startingToday === true);
  const rest = sorted.filter((p) => p.startingToday !== true);
  return [...starting, ...rest];
}

type PosFilter = 'hitters' | 'pitchers';
const FILTERS: { id: PosFilter; label: string }[] = [
  { id: 'hitters', label: 'Hitters' },
  { id: 'pitchers', label: 'Pitchers' },
];

export function RosterList({ players, onOpen }: { players: Player[]; onOpen: (p: Player) => void }) {
  const [filter, setFilter] = useState<PosFilter>('hitters');
  const [sort, setSort] = useState<Sort>({ key: null, dir: 'desc' });

  const hitters = orderPlayers(players.filter((p) => !isPitcher(p)), sort, false);
  const pitchers = orderPlayers(players.filter((p) => isPitcher(p)), sort, true);
  const shown = filter === 'hitters' ? hitters : pitchers;
  const keys = filter === 'hitters' ? HITTER_KEYS : PITCHER_KEYS;

  // A hitter stat sort (AVG, say) makes no sense on the Pitchers tab and vice
  // versa, so switching tabs drops back to the default roster order.
  const selectFilter = (f: PosFilter) => {
    setFilter(f);
    setSort({ key: null, dir: 'desc' });
  };

  const sortBy = (key: string) => {
    setSort((prev) => (
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: defaultDirFor(key) }
    ));
  };

  return (
    <>
      {players.length > 0 ? (
        <div className="segmented" role="radiogroup" aria-label="Filter by position">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              role="radio"
              aria-checked={filter === f.id}
              aria-selected={filter === f.id}
              className="seg"
              onClick={() => selectFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      ) : null}

      {shown.length > 0 ? (
        <StatHeader keys={keys} sortKey={sort.key} sortDir={sort.dir} onSort={sortBy} />
      ) : null}
      {shown.map((p) => <PlayerRow key={p.playerKey} player={p} onOpen={onOpen} />)}
    </>
  );
}
