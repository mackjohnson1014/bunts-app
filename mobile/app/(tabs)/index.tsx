import React from 'react';
import { View } from 'react-native';
import { api, usingMockData } from '../../src/api/client';
import { PlayerRow } from '../../src/PlayerRow';
import { theme } from '../../src/theme';
import { STARTING_SLOTS } from '../../src/types';
import { useAsync } from '../../src/useAsync';
import { Body, Card, Muted, Screen, SectionLabel } from '../../src/ui';

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
          ? `${data.league.name}${data.team.rank ? ` · ${ordinal(data.team.rank)} place` : ''}${usingMockData ? ' · mock data' : ''}`
          : undefined
      }
      loading={loading}
      error={error}
      onReload={reload}
    >
      {starters.length > 0 && (
        <>
          <SectionLabel>Starting lineup</SectionLabel>
          {starters.map((p) => (
            <Card key={p.playerKey}><PlayerRow player={p} /></Card>
          ))}
        </>
      )}

      {bench.length > 0 && (
        <>
          <SectionLabel>Bench</SectionLabel>
          {bench.map((p) => (
            <Card key={p.playerKey}><PlayerRow player={p} /></Card>
          ))}
        </>
      )}

      {inactive.length > 0 && (
        <>
          <SectionLabel>Injured / inactive</SectionLabel>
          {inactive.map((p) => (
            <Card key={p.playerKey}><PlayerRow player={p} /></Card>
          ))}
        </>
      )}

      <View style={{ marginTop: theme.space(6) }}>
        <Muted>Fantasy data provided by Yahoo Fantasy</Muted>
        {usingMockData ? (
          <Body style={{ color: theme.color.warn, fontSize: theme.font.tiny, marginTop: theme.space(2) }}>
            Showing fixtures. Set EXPO_PUBLIC_BUNTS_API to point at the backend.
          </Body>
        ) : null}
      </View>
    </Screen>
  );
}

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
};
