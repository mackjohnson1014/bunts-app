import React from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from './theme';

export function Screen({
  title, subtitle, children, loading, error, onReload,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  onReload?: () => void;
}) {
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          onReload ? <RefreshControl refreshing={!!loading} onRefresh={onReload} tintColor={theme.color.textMuted} /> : undefined
        }
      >
        <Text style={s.title}>{title}</Text>
        {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}

        {error ? (
          <Card>
            <Text style={[s.body, { color: theme.color.bad }]}>{error}</Text>
            {onReload ? (
              <Pressable onPress={onReload} style={s.retry}>
                <Text style={s.retryText}>Try again</Text>
              </Pressable>
            ) : null}
          </Card>
        ) : loading ? (
          <View style={s.center}><ActivityIndicator color={theme.color.accent} /></View>
        ) : (
          children
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export const Card = ({ children, style }: { children: React.ReactNode; style?: object }) => (
  <View style={[s.card, style]}>{children}</View>
);

export const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <Text style={s.sectionLabel}>{children}</Text>
);

export const Pill = ({ label, color }: { label: string; color: string }) => (
  <View style={[s.pill, { borderColor: color }]}>
    <Text style={[s.pillText, { color }]}>{label}</Text>
  </View>
);

export const Muted = ({ children }: { children: React.ReactNode }) => (
  <Text style={s.muted}>{children}</Text>
);

export const Body = ({ children, style }: { children: React.ReactNode; style?: object }) => (
  <Text style={[s.body, style]}>{children}</Text>
);

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },
  scroll: { padding: theme.space(4), paddingBottom: theme.space(12) },
  title: { color: theme.color.text, fontSize: theme.font.title, fontWeight: '700' },
  subtitle: { color: theme.color.textMuted, fontSize: theme.font.small, marginTop: theme.space(1), marginBottom: theme.space(4) },
  sectionLabel: {
    color: theme.color.textMuted, fontSize: theme.font.tiny, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase',
    marginTop: theme.space(5), marginBottom: theme.space(2),
  },
  card: {
    backgroundColor: theme.color.surface, borderRadius: theme.radius,
    borderWidth: 1, borderColor: theme.color.border,
    padding: theme.space(3), marginBottom: theme.space(2),
  },
  center: { paddingVertical: theme.space(16), alignItems: 'center' },
  body: { color: theme.color.text, fontSize: theme.font.body },
  muted: { color: theme.color.textMuted, fontSize: theme.font.small },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: theme.space(2), paddingVertical: 2 },
  pillText: { fontSize: theme.font.tiny, fontWeight: '700' },
  retry: { marginTop: theme.space(3), alignSelf: 'flex-start' },
  retryText: { color: theme.color.accent, fontSize: theme.font.body, fontWeight: '600' },
});
