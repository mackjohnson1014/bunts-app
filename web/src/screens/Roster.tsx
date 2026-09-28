import { useState } from 'react';
import { api } from '../api';
import { Screen } from '../components';
import { PlayerSheet } from '../PlayerSheet';
import { RosterList } from '../RosterList';
import type { Player } from '../types';
import { useAsync } from '../useAsync';

export default function RosterScreen() {
  const { data, error, loading, reload } = useAsync(() => api.getRoster());
  const [selected, setSelected] = useState<Player | null>(null);

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
        <RosterList players={data?.players ?? []} onOpen={setSelected} />
      </Screen>

      <PlayerSheet player={selected} onClose={() => setSelected(null)} />
    </>
  );
}

export const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
};
