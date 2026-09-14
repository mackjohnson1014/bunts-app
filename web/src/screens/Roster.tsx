import { useState } from 'react';
import { api } from '../api';
import { PlayerRow, Screen } from '../components';
import { PlayerSheet } from '../PlayerSheet';
import type { Player } from '../types';
import { STARTING_SLOTS } from '../types';
import { useAsync } from '../useAsync';

type Sort = 'slot' | 'name' | 'form';

const SORTS: { id: Sort; label: string }[] = [
  { id: 'slot', label: 'Lineup' },
  { id: 'name', label: 'Name' },
  { id: 'form', label: 'Form' },
];

/** Recent-game quality as a single number, so "hot" can be sorted on. */
const formScore = (p: Player) =>
  p.recentGames.reduce((n, g) => n + (g.quality === 'good' ? 1 : g.quality === 'bad' ? -1 : 0), 0);

export default function RosterScreen() {
  const { data, error, loading, reload } = useAsync(() => api.getRoster());
  const [sort, setSort] = useState<Sort>('slot');
  const [selected, setSelected] = useState<Player | null>(null);

  const order = (list: Player[]) => {
    const copy = [...list];
    if (sort === 'name') return copy.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'form') return copy.sort((a, b) => formScore(b) - formScore(a));
    return copy;   // already in lineup order from the source
  };

  const players = data?.players ?? [];
  const starters = order(players.filter((p) => STARTING_SLOTS.includes(p.slot)));
  const bench = order(players.filter((p) => p.slot === 'BN'));
  const inactive = order(players.filter((p) => p.slot === 'IL' || p.slot === 'NA'));

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
        <div className="segmented" role="tablist" aria-label="Sort roster">
          {SORTS.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={sort === s.id}
              className="seg"
              onClick={() => setSort(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {starters.length > 0 ? <p className="sect">Starting lineup</p> : null}
        {starters.map((p) => <PlayerRow key={p.playerKey} player={p} onOpen={setSelected} />)}

        {bench.length > 0 ? <p className="sect">Bench</p> : null}
        {bench.map((p) => <PlayerRow key={p.playerKey} player={p} onOpen={setSelected} />)}

        {inactive.length > 0 ? <p className="sect">Injured / inactive</p> : null}
        {inactive.map((p) => <PlayerRow key={p.playerKey} player={p} onOpen={setSelected} />)}
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
