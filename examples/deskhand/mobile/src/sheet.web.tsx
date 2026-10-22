import { router } from 'expo-router';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from './theme';

/**
 * Expo Router 58 draws no sheet on web, so the web build draws its own: the ticket stays visible under a dim
 * backdrop, and the sheet rests at its first detent (62%), like the native form sheet. Escape, a tap on the
 * backdrop and the browser's back button close it.
 */
export function Sheet({ label, children }: { label: string; children: ReactNode }) {
  const t = useTheme();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') router.back(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return <View style={{ flex: 1, justifyContent: 'flex-end' }}>
    {/* Hidden from assistive tech: the sheet's Done (Close on Android) button is the accessible way out. */}
    <Pressable aria-hidden focusable={false} onPress={() => router.back()} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.25)' }]} />
    <View role="dialog" aria-modal aria-label={label} style={{ height: '62%', borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden', backgroundColor: t.color.elevated }}>
      {children}
    </View>
  </View>;
}
