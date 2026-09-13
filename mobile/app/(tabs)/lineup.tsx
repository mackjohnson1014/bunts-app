import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '../../src/api/client';
import { LineupDot } from '../../src/PlayerRow';
import { theme } from '../../src/theme';
import type { LineupCall, Recommendation } from '../../src/types';
import { useAsync } from '../../src/useAsync';
import { Body, Card, Muted, Screen, SectionLabel } from '../../src/ui';

export default function LineupScreen() {
  const roster = useAsync(() => api.getRoster());
  const calls = useAsync(() => api.getLineupCalls());

  const loading = roster.loading || calls.loading;
  const error = roster.error ?? calls.error;
  const byKey = new Map((roster.data?.players ?? []).map((p) => [p.playerKey, p]));

  const actionable = (calls.data ?? []).filter((c) => c.recommendation !== 'hold');
  const holds = (calls.data ?? []).filter((c) => c.recommendation === 'hold');

  return (
    <Screen
      title="Start / Sit"
      subtitle="Suggestions only — apply changes yourself in the Yahoo app"
      loading={loading}
      error={error}
      onReload={() => { roster.reload(); calls.reload(); }}
    >
      {actionable.length === 0 && holds.length === 0 ? (
        <Card><Body>Nothing to change today.</Body></Card>
      ) : null}

      {actionable.length > 0 && <SectionLabel>Worth acting on</SectionLabel>}
      {actionable.map((c) => (
        <CallCard key={c.playerKey} call={c} name={byKey.get(c.playerKey)?.name ?? c.playerKey}
          starting={byKey.get(c.playerKey)?.startingToday ?? null} />
      ))}

      {holds.length > 0 && <SectionLabel>Check again later</SectionLabel>}
      {holds.map((c) => (
        <CallCard key={c.playerKey} call={c} name={byKey.get(c.playerKey)?.name ?? c.playerKey}
          starting={byKey.get(c.playerKey)?.startingToday ?? null} />
      ))}

      <View style={{ marginTop: theme.space(5) }}>
        <Muted>Confidence below 60% means the call is close to a coin flip.</Muted>
      </View>
    </Screen>
  );
}

function CallCard({ call, name, starting }: { call: LineupCall; name: string; starting: boolean | null }) {
  const c = recColor(call.recommendation);
  return (
    <Card>
      <View style={s.head}>
        <View style={[s.tag, { backgroundColor: c + '22', borderColor: c }]}>
          <Text style={[s.tagText, { color: c }]}>{call.recommendation.toUpperCase()}</Text>
        </View>
        <Text style={s.name} numberOfLines={1}>{name}</Text>
        <LineupDot starting={starting} />
      </View>
      <Body style={{ marginTop: theme.space(2), fontSize: theme.font.small }}>{call.reason}</Body>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${Math.round(call.confidence * 100)}%`, backgroundColor: c }]} />
      </View>
      <Muted>{Math.round(call.confidence * 100)}% confidence</Muted>
    </Card>
  );
}

const recColor = (r: Recommendation) =>
  r === 'start' ? theme.color.good : r === 'sit' ? theme.color.bad : theme.color.textMuted;

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: theme.space(2) },
  tag: { borderWidth: 1, borderRadius: 5, paddingHorizontal: theme.space(2), paddingVertical: 2 },
  tagText: { fontSize: theme.font.tiny, fontWeight: '800', letterSpacing: 0.5 },
  name: { color: theme.color.text, fontSize: theme.font.body, fontWeight: '600', flex: 1 },
  barTrack: {
    height: 4, borderRadius: 2, backgroundColor: theme.color.surfaceAlt,
    marginTop: theme.space(3), marginBottom: theme.space(1), overflow: 'hidden',
  },
  barFill: { height: 4, borderRadius: 2 },
});
