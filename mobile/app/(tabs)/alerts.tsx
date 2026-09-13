import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { api, usingMockData } from '../../src/api/client';
import { theme } from '../../src/theme';
import { Body, Card, Muted, Screen, SectionLabel } from '../../src/ui';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type Status = 'idle' | 'working' | 'registered' | 'denied' | 'unsupported' | 'error';

export default function AlertsScreen() {
  const [status, setStatus] = useState<Status>('idle');
  const [token, setToken] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    Notifications.getPermissionsAsync().then((p) => {
      if (p.granted) setStatus('idle');
    });
  }, []);

  async function enable() {
    setStatus('working');
    setDetail(null);
    try {
      if (!Device.isDevice) {
        setStatus('unsupported');
        setDetail('Push notifications need a physical device. Simulators cannot receive them.');
        return;
      }
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('lineups', {
          name: 'Lineup alerts',
          importance: Notifications.AndroidImportance.HIGH,
        });
      }
      const existing = await Notifications.getPermissionsAsync();
      const granted = existing.granted
        ? existing
        : await Notifications.requestPermissionsAsync();
      if (!granted.granted) {
        setStatus('denied');
        return;
      }
      const t = await Notifications.getExpoPushTokenAsync();
      setToken(t.data);
      await api.registerPushToken(t.data);
      setStatus('registered');
    } catch (e) {
      setStatus('error');
      setDetail(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Screen title="Alerts" subtitle="Get told when a rostered player is scratched">
      <Card>
        <Body>
          Bunts checks posted lineups a few times an hour. When a player on your
          roster is announced as not starting, you get a push notification.
        </Body>
        <Muted>
          {'\n'}It cannot fix the lineup for you — Yahoo only grants read access,
          so you still make the swap in the Yahoo app.
        </Muted>
      </Card>

      <SectionLabel>This device</SectionLabel>
      <Card>
        <View style={s.statusRow}>
          <View style={[s.dot, { backgroundColor: dotColor(status) }]} />
          <Text style={s.statusText}>{statusLabel(status)}</Text>
        </View>

        {detail ? <Muted>{'\n'}{detail}</Muted> : null}

        {status !== 'registered' ? (
          <Pressable onPress={enable} style={s.button} disabled={status === 'working'}>
            <Text style={s.buttonText}>
              {status === 'working' ? 'Working…' : 'Enable notifications'}
            </Text>
          </Pressable>
        ) : null}

        {token ? (
          <>
            <Muted>{'\n'}Expo push token</Muted>
            <Text style={s.token} numberOfLines={2}>{token}</Text>
          </>
        ) : null}

        {usingMockData ? (
          <Muted>
            {'\n'}Backend URL is unset, so the token was not actually sent anywhere.
          </Muted>
        ) : null}
      </Card>
    </Screen>
  );
}

const statusLabel = (s: Status) => ({
  idle: 'Not enabled on this device',
  working: 'Requesting permission…',
  registered: 'Enabled — backend has this device',
  denied: 'Permission denied in system settings',
  unsupported: 'Not available here',
  error: 'Something went wrong',
}[s]);

const dotColor = (s: Status) =>
  s === 'registered' ? theme.color.good
  : s === 'denied' || s === 'error' ? theme.color.bad
  : theme.color.textMuted;

const s = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space(2) },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: theme.color.text, fontSize: theme.font.body },
  button: {
    marginTop: theme.space(4), backgroundColor: theme.color.accent,
    paddingVertical: theme.space(3), borderRadius: 8, alignItems: 'center',
  },
  buttonText: { color: '#0E1116', fontSize: theme.font.body, fontWeight: '700' },
  token: {
    color: theme.color.textMuted, fontSize: theme.font.tiny,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 4,
  },
});
