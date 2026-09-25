import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaInsetsContext, SafeAreaProvider } from 'react-native-safe-area-context';
import { Geist_400Regular } from '@expo-google-fonts/geist/400Regular';
import { Geist_500Medium } from '@expo-google-fonts/geist/500Medium';
import { Geist_600SemiBold } from '@expo-google-fonts/geist/600SemiBold';
import { GeistMono_400Regular } from '@expo-google-fonts/geist-mono/400Regular';
import { GeistMono_500Medium } from '@expo-google-fonts/geist-mono/500Medium';
import { useReducedMotion } from '../motion';
import { previewInsets } from '../preview';
import { StoreProvider } from '../store';
import { os, useTheme } from '../theme';

/** Deep links to a ticket still get a back button to the tabs. */
export const unstable_settings = { initialRouteName: '(tabs)' };

export default function RootLayout() {
  const [loaded] = useFonts({ Geist_400Regular, Geist_500Medium, Geist_600SemiBold, GeistMono_400Regular, GeistMono_500Medium });
  const t = useTheme();
  const reduced = useReducedMotion();
  if (!loaded) return null;
  const base = t.scheme === 'dark' ? DarkTheme : DefaultTheme;
  const nav = { ...base, colors: { ...base.colors, primary: t.color.ink, background: t.color.surface, card: t.color.surface, text: t.color.ink, border: t.color.lineSoft, notification: t.color.ink } };

  const app = <StoreProvider>
    <ThemeProvider value={nav}>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{
        headerStyle: { backgroundColor: t.color.surface },
        headerTintColor: t.color.ink,
        headerTitleStyle: { fontFamily: t.fonts.monoMedium, fontSize: 17 },
        headerTitleAlign: os === 'android' ? 'left' : 'center',
        headerShadowVisible: false,
        contentStyle: { backgroundColor: t.color.surface },
        // Reduce Motion: screens change without sliding.
        animation: reduced ? 'none' : 'default',
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Inbox' }} />
        <Stack.Screen name="ticket/[id]" />
        <Stack.Screen name="source" options={{
          presentation: 'formSheet', headerShown: false,
          sheetAllowedDetents: [0.62, 1], sheetGrabberVisible: true, sheetCornerRadius: 16,
          contentStyle: { backgroundColor: t.color.elevated },
        }} />
      </Stack>
    </ThemeProvider>
  </StoreProvider>;

  return <SafeAreaProvider>
    {previewInsets ? <SafeAreaInsetsContext.Provider value={previewInsets}>{app}</SafeAreaInsetsContext.Provider> : app}
  </SafeAreaProvider>;
}
