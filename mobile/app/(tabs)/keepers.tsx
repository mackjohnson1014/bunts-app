import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '../../src/api/client';
import { theme } from '../../src/theme';
import { useAsync } from '../../src/useAsync';
import { Body, Card, Muted, Screen } from '../../src/ui';

export default function KeepersScreen() {
  const roster = useAsync(() => api.getRoster());
  const keepers = useAsync(() => api.getKeepers());

  const byKey = new Map((roster.data?.players ?? []).map((p) => [p.playerKey, p]));
  const slots = roster.data?.league.keeperSlots ?? 0;
  const top = keepers.data?.[0]?.score ?? 1;

  return (
    <Screen
      title="Keepers"
      subtitle={slots ? `Running tally · ${slots} keeper slots next season` : 'Running tally'}
      loading={roster.loading || keepers.loading}
      error={roster.error ?? keepers.error}
      onReload={() => { roster.reload(); keepers.reload(); }}
    >
      {(keepers.data ?? []).map((k) => {
        const player = byKey.get(k.playerKey);
        const inside = k.rank <= slots;
        return (
          <Card key={k.playerKey} style={inside ? { borderColor: theme.color.accent } : undefined}>
            <View style={s.head}>
              <Text style={[s.rank, inside && { color: theme.color.accent }]}>{k.rank}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.name} numberOfLines={1}>{player?.name ?? k.playerKey}</Text>
                <Muted>
                  {player ? `${player.mlbTeam} · ${player.positions.join('/')}` : ''}
                  {player?.percentOwned != null ? ` · ${player.percentOwned}% rostered` : ''}
                </Muted>
              </View>
              <Text style={s.score}>{k.score.toFixed(1)}</Text>
            </View>

            <View style={s.barTrack}>
              <View style={[s.barFill, {
                width: `${Math.max(4, Math.round((k.score / top) * 100))}%`,
                backgroundColor: inside ? theme.color.accent : theme.color.surfaceAlt,
              }]} />
            </View>

            <Body style={{ fontSize: theme.font.small, color: theme.color.textMuted }}>{k.note}</Body>
          </Card>
        );
      })}

      <View style={{ marginTop: theme.space(4) }}>
        <Muted>
          Scores accumulate across the season. The cut line moves — a hot September
          can change who is worth keeping, so this is a tally, not a verdict.
        </Muted>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: theme.space(3) },
  rank: {
    color: theme.color.textMuted, fontSize: theme.font.heading,
    fontWeight: '800', width: 22, textAlign: 'center',
  },
  name: { color: theme.color.text, fontSize: theme.font.body, fontWeight: '600' },
  score: { color: theme.color.text, fontSize: theme.font.body, fontVariant: ['tabular-nums'] },
  barTrack: {
    height: 4, borderRadius: 2, backgroundColor: theme.color.surfaceAlt,
    marginTop: theme.space(3), marginBottom: theme.space(2), overflow: 'hidden',
  },
  barFill: { height: 4, borderRadius: 2 },
});
