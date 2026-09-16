import { useState } from 'react';
import { api } from '../api';
import { isPitcher, PlayerRow, Screen } from '../components';
import { PlayerSheet } from '../PlayerSheet';
import type { Player } from '../types';
import { STARTING_SLOTS } from '../types';
import { useAsync } from '../useAsync';

/**
 * Starting slot first, then bench, then IL/NA. No separate section headers for
 * this anymore -- each row's lineup light already shows which bucket it's in,
 * and Array#sort is stable, so players keep their source order within a bucket.
 */
const rosterRank = (p: Player) => (STARTING_SLOTS.includes(p.slot) ? 0 : p.slot === 'BN' ? 1 : 2);
const byRosterOrder = (list: Player[]) => [...list].sort((a, b) => rosterRank(a) - rosterRank(b));

type PosFilter = 'all' | 'hitters' | 'pitchers';
const FILTERS: { id: PosFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'hitters', label: 'Hitters' },
  { id: 'pitchers', label: 'Pitchers' },
];

export default function RosterScreen() {
  const { data, error, loading, reload } = useAsync(() => api.getRoster());
  const [selected, setSelected] = useState<Player | null>(null);
  const [filter, setFilter] = useState<PosFilter>('all');

  const players = data?.players ?? [];
  const hitters = byRosterOrder(players.filter((p) => !isPitcher(p)));
  const pitchers = byRosterOrder(players.filter((p) => isPitcher(p)));
  const showHitters = filter !== 'pitchers';
  const showPitchers = filter !== 'hitters';

  return (
    <>
      <Screen
        title={data?.team.name ?? 'Roster'}
        subtitle={
          data
            ? `${data.league.name}${data.team.rank ? ` · ${ordinal(data.team.rank)} place` : ''}`
            : undefined
        }
        sample={data?.sample}
        updatedAt={data?.fetchedAt ?? null}
        loading={loading}
        error={error}
        onReload={reload}
      >
        {players.length > 0 ? (
          <div className="segmented" role="radiogroup" aria-label="Filter by position">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                role="radio"
                aria-checked={filter === f.id}
                aria-selected={filter === f.id}
                className="seg"
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        ) : null}

        {/* Section headers only make sense when both groups are showing --
            with the filter narrowed to one, the segmented control already says so. */}
        {filter === 'all' && hitters.length > 0 ? <p className="sect">Hitters</p> : null}
        {showHitters && hitters.map((p) => <PlayerRow key={p.playerKey} player={p} onOpen={setSelected} />)}

        {filter === 'all' && pitchers.length > 0 ? <p className="sect">Pitchers</p> : null}
        {showPitchers && pitchers.map((p) => <PlayerRow key={p.playerKey} player={p} onOpen={setSelected} />)}
      </Screen>

      <PlayerSheet player={selected} onClose={() => setSelected(null)} />
    </>
  );
}

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
};
