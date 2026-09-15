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

export default function RosterScreen() {
  const { data, error, loading, reload } = useAsync(() => api.getRoster());
  const [selected, setSelected] = useState<Player | null>(null);

  const players = data?.players ?? [];
  const hitters = byRosterOrder(players.filter((p) => !isPitcher(p)));
  const pitchers = byRosterOrder(players.filter((p) => isPitcher(p)));

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
        {hitters.length > 0 ? <p className="sect">Hitters</p> : null}
        {hitters.map((p) => <PlayerRow key={p.playerKey} player={p} onOpen={setSelected} />)}

        {pitchers.length > 0 ? <p className="sect">Pitchers</p> : null}
        {pitchers.map((p) => <PlayerRow key={p.playerKey} player={p} onOpen={setSelected} />)}
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
