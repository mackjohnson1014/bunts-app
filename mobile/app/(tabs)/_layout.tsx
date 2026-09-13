import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { theme } from '../../src/theme';

/** Text glyphs instead of an icon dependency -- one less thing to install. */
const icon = (glyph: string) => ({ color }: { color: ColorValue }) => (
  <Text style={{ color, fontSize: 18 }}>{glyph}</Text>
);

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.color.accent,
        tabBarInactiveTintColor: theme.color.textMuted,
        tabBarStyle: {
          backgroundColor: theme.color.surface,
          borderTopColor: theme.color.border,
        },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Roster', tabBarIcon: icon('▦') }} />
      <Tabs.Screen name="lineup" options={{ title: 'Start/Sit', tabBarIcon: icon('⇅') }} />
      <Tabs.Screen name="keepers" options={{ title: 'Keepers', tabBarIcon: icon('★') }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alerts', tabBarIcon: icon('!') }} />
    </Tabs>
  );
}
