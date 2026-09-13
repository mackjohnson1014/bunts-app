import { api } from '../api';
import { PlayerRow, Screen } from '../components';
import { STARTING_SLOTS } from '../types';
import { useAsync } from '../useAsync';

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
};

export default function RosterScreen() {
  const { data, error, loading, reload } = useAsync(() => api.getRoster());

  const starters = data?.players.filter((p) => STARTING_SLOTS.includes(p.slot)) ?? [];
  const bench = data?.players.filter((p) => p.slot === 'BN') ?? [];
  const inactive = data?.players.filter((p) => p.slot === 'IL' || p.slot === 'NA') ?? [];

  return (
    <Screen
      title={data?.team.name ?? 'Roster'}
      subtitle={
        data
          ? `${data.league.name}${data.team.rank ? ` · ${ordinal(data.team.rank)} place` : ''}`
          : undefined
      }
      loading={loading}
      error={error}
      onReload={reload}
    >
      {starters.length > 0 ? <p className="sect">Starting lineup</p> : null}
      {starters.map((p) => <PlayerRow key={p.playerKey} player={p} />)}

      {bench.length > 0 ? <p className="sect">Bench</p> : null}
      {bench.map((p) => <PlayerRow key={p.playerKey} player={p} />)}

      {inactive.length > 0 ? <p className="sect">Injured / inactive</p> : null}
      {inactive.map((p) => <PlayerRow key={p.playerKey} player={p} />)}
    </Screen>
  );
}
