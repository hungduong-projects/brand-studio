import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Animated, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { docs, ticket as findTicket } from '../data';
import { useReducedMotion } from '../motion';
import { os, useTheme } from '../theme';
import { Button, SourceNumber, T } from '../ui';

/** The highlighter sweeps across the cited line, left to right. With Reduce Motion it is simply there. */
function Highlight({ children }: { children: ReactNode }) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const sweep = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced === null) return;
    if (reduced) sweep.setValue(1);
    else Animated.timing(sweep, { toValue: 1, duration: 520, delay: 280, useNativeDriver: true }).start();
  }, [reduced]);
  return <View style={{ marginHorizontal: -8, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, overflow: 'hidden' }}>
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: t.color.accent, transformOrigin: 'left', transform: [{ scaleX: sweep }] }]} />
    {children}
  </View>;
}

export default function SourceSheet() {
  const { ticket: id, n } = useLocalSearchParams<{ ticket: string; n: string }>();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const tk = findTicket(id);
  const index = Number(n) - 1;
  const source = tk?.sources[index];
  const close = () => router.back();
  const closeLabel = os === 'android' ? 'Close' : 'Done';

  if (!tk || !source) return <View style={{ padding: 24, gap: 16 }}>
    <T variant="headline" weight="strong" accessibilityRole="header">Source not found</T>
    <Button kind="secondary" label={closeLabel} onPress={close} />
  </View>;

  const doc = docs[source.doc];
  const claim = tk.reply.find(p => typeof p !== 'string' && p.cite === index + 1);

  return <ScrollView style={{ backgroundColor: t.color.elevated }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 20 : 10, paddingBottom: insets.bottom + 24 }}>
    {/* iOS draws the sheet's grabber natively; Material's bottom sheet has a drag handle the app draws. */}
    {Platform.OS !== 'ios' ? <View style={{ alignSelf: 'center', width: 32, height: 4, borderRadius: 2, backgroundColor: t.color.line, marginBottom: 10 }} /> : null}
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <SourceNumber n={index + 1} mark />
      <T variant="footnote" tone="muted" weight="medium" style={{ flex: 1 }}>{doc.kind}</T>
      <Button kind="plain" label={closeLabel} onPress={close} style={{ marginRight: -8 }} />
    </View>
    <T variant="headline" weight="strong" accessibilityRole="header" mono={doc.mono} style={{ marginTop: 4 }}>{doc.mono ? `Order ${doc.title}` : doc.title}</T>

    <View style={{ marginTop: 16, gap: 4 }}>
      {doc.rows.map((row, i) => {
        const line = <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <T variant="body" style={i === source.row ? { color: t.color.onAccent } : undefined}>{row.text}</T>
          {row.value ? <T variant="body" mono style={i === source.row ? { color: t.color.onAccent } : undefined}>{row.value}</T> : null}
        </View>;
        return <View key={i} accessibilityLabel={i === source.row ? `Cited line: ${row.text}${row.value ? ' ' + row.value : ''}` : undefined} accessible={i === source.row} style={{ paddingVertical: 6, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderTopColor: t.color.lineSoft }}>
          {i === source.row ? <Highlight>{line}</Highlight> : line}
        </View>;
      })}
    </View>

    {claim && typeof claim !== 'string' ? <View style={{ marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: t.color.line }}>
      <T variant="footnote" tone="muted" weight="medium">Cited in the reply to {tk.customer}</T>
      <T variant="body" style={{ marginTop: 6 }}>“{claim.text}”</T>
    </View> : null}
  </ScrollView>;
}
