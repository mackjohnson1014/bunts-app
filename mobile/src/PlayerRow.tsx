import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Pill } from './ui';
import { statusColor, theme } from './theme';
import type { Player } from './types';

/**
 * One roster line. The lineup indicator has three states on purpose:
 * starting, not starting, and unknown. Rendering "unknown" as "not starting"
 * is the single most damaging bug this app could ship -- it would tell Mack to
 * bench a player who is in fact playing.
 */
export function PlayerRow({ player, right }: { player: Player; right?: React.ReactNode }) {
  const isPitcher = player.positions.some((p) => p === 'SP' || p === 'RP' || p === 'P');
  const keys = isPitcher ? ['W', 'SV', 'K', 'ERA', 'WHIP'] : ['R', 'HR', 'RBI', 'SB', 'AVG'];

  return (
    <View style={s.row}>
      <View style={s.slotBox}>
        <Text style={s.slot}>{player.slot}</Text>
      </View>

      <View style={s.main}>
        <View style={s.nameLine}>
          <Text style={s.name} numberOfLines={1}>{player.name}</Text>
          {player.status ? <Pill label={player.status} color={statusColor(player.status)} /> : null}
        </View>

        <Text style={s.meta} numberOfLines={1}>
          {player.mlbTeam} · {player.positions.join('/')}
          {player.opponent ? ` · ${player.opponent}` : ''}
        </Text>

        <View style={s.stats}>
          {keys.map((k) => (
            <View key={k} style={s.stat}>
              <Text style={s.statKey}>{k}</Text>
              <Text style={s.statVal}>{fmt(player.seasonStats[k])}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={s.right}>
        {right ?? <LineupDot starting={player.startingToday} />}
      </View>
    </View>
  );
}

export function LineupDot({ starting }: { starting: boolean | null }) {
  const { color, label } =
    starting === true ? { color: theme.color.good, label: 'In' }
    : starting === false ? { color: theme.color.bad, label: 'Out' }
    : { color: theme.color.textMuted, label: '—' };
  return (
    <View style={s.dotWrap}>
      <View style={[s.dot, { backgroundColor: color }]} />
      <Text style={[s.dotLabel, { color }]}>{label}</Text>
    </View>
  );
}

const fmt = (v: number | undefined) => {
  if (v === undefined) return '–';
  return v < 10 && !Number.isInteger(v) ? v.toFixed(3).replace(/^0/, '') : String(v);
};

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.space(3) },
  slotBox: {
    width: 40, paddingVertical: 3, borderRadius: 6,
    backgroundColor: theme.color.surfaceAlt, alignItems: 'center',
  },
  slot: { color: theme.color.textMuted, fontSize: theme.font.tiny, fontWeight: '700' },
  main: { flex: 1 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: theme.space(2) },
  name: { color: theme.color.text, fontSize: theme.font.body, fontWeight: '600', flexShrink: 1 },
  meta: { color: theme.color.textMuted, fontSize: theme.font.tiny, marginTop: 2 },
  stats: { flexDirection: 'row', gap: theme.space(4), marginTop: theme.space(2) },
  stat: { alignItems: 'flex-start' },
  statKey: { color: theme.color.textMuted, fontSize: 9, letterSpacing: 0.5 },
  statVal: { color: theme.color.text, fontSize: theme.font.small, fontVariant: ['tabular-nums'] },
  right: { alignItems: 'center', minWidth: 34 },
  dotWrap: { alignItems: 'center', gap: 3, paddingTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotLabel: { fontSize: 9, fontWeight: '700' },
});
