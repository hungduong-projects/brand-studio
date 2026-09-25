import Tabs from 'expo-router/js-tabs';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ColorValue } from 'react-native';
import { useStore } from '../../store';
import { os, useTheme } from '../../theme';
import { Icon } from '../../ui';
import type { IconName } from '../../ui';

/** Three tabs with labels, as both platforms advise. Android draws Material's pill behind the selected icon. */
export default function TabsLayout() {
  const t = useTheme();
  const { waiting } = useStore();
  const insets = useSafeAreaInsets();
  const icon = (name: IconName) => ({ focused, color }: { focused: boolean; color: ColorValue }) =>
    <View style={os === 'android' ? { width: 64, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? t.color.pressed : 'transparent' } : undefined}>
      <Icon name={name} size={os === 'android' ? 22 : 23} color={color} stroke={focused ? 2.2 : 1.7} />
    </View>;

  return <Tabs screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: t.color.ink,
    tabBarInactiveTintColor: t.color.muted,
    // Material's navigation bar is 80dp tall; the iOS tab bar keeps its default height.
    tabBarStyle: { backgroundColor: os === 'android' ? t.color.elevated : t.color.surface, borderTopColor: t.color.lineSoft, ...(os === 'android' ? { height: 80 + insets.bottom, paddingTop: 12 } : null) },
    // Geist's label needs a little more room than the 10pt system font the default layout assumes.
    tabBarIconStyle: os === 'ios' ? { height: 24 } : undefined,
    // Labels keep their size, as system tab bars do; each tab's accessible name still reads out in full.
    tabBarAllowFontScaling: false,
    tabBarLabelStyle: { fontFamily: t.fonts.medium, fontSize: os === 'android' ? 12 : 11, lineHeight: 14, marginTop: os === 'android' ? 4 : 0 },
    tabBarBadgeStyle: { backgroundColor: t.color.ink, color: t.color.surface, fontFamily: t.fonts.monoMedium, fontSize: 11 },
  }}>
    <Tabs.Screen name="index" options={{ title: 'Inbox', tabBarIcon: icon('inbox'), tabBarBadge: waiting.length || undefined, tabBarAccessibilityLabel: `Inbox, ${waiting.length} waiting` }} />
    <Tabs.Screen name="sent" options={{ title: 'Sent', tabBarIcon: icon('sent') }} />
    <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings') }} />
  </Tabs>;
}
