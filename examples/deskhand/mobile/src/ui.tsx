import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AccessibilityRole, ColorValue, PressableProps, StyleProp, TextProps, TextStyle, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { os, target, useTheme } from './theme';

type Role = 'title' | 'headline' | 'body' | 'callout' | 'footnote' | 'caption';

/** Text in a type role. `mono` is for ticket, order and money data only. */
export function T({ variant = 'body', tone = 'ink', weight = 'text', mono, style, ...props }: TextProps & {
  variant?: Role; tone?: 'ink' | 'muted' | 'onAccent' | 'danger'; weight?: 'text' | 'medium' | 'strong'; mono?: boolean;
}) {
  const t = useTheme();
  const size = t.type[variant];
  const family = mono ? (weight === 'text' ? t.fonts.mono : t.fonts.monoMedium) : t.fonts[weight];
  return <Text {...props} style={[{
    color: t.color[tone], fontFamily: family, fontSize: mono ? size - 1 : size,
    lineHeight: Math.round(size * (variant === 'title' ? 1.15 : 1.4)),
    letterSpacing: variant === 'title' ? -0.6 : variant === 'headline' ? -0.3 : 0,
  }, style]} />;
}

const paths = {
  inbox: 'M4 13.5 6.2 5.8A1.5 1.5 0 0 1 7.6 4.8h8.8a1.5 1.5 0 0 1 1.4 1l2.2 7.7M4 13.5V18a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 18v-4.5M4 13.5h4.5l1.2 2h4.6l1.2-2H20',
  sent: 'M20.5 3.5 10 14M20.5 3.5 14 20.5l-4-6.5-6.5-4 17-6.5Z',
  settings: 'M5 7h9M18 7h1M5 17h1M10 17h9M16 5v4M8 15v4',
  chevron: 'm9 5 7 7-7 7',
  chevronBack: 'm15 5-7 7 7 7',
  arrowBack: 'M19 12H5m6-6-6 6 6 6',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  alert: 'M12 8v5M12 16.5v.5M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0',
};
export type IconName = keyof typeof paths;

export function Icon({ name, size = 24, color, stroke = 1.8 }: { name: IconName; size?: number; color: ColorValue; stroke?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Path d={paths[name]} stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>;
}

/** Scrollable screen with a large title, clear of the status bar and notch. */
export function Screen({ title, lead, children }: { title: string; lead?: ReactNode; children: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return <ScrollView style={{ backgroundColor: t.color.surface }} contentContainerStyle={{ paddingTop: insets.top + (os === 'android' ? 20 : 12), paddingBottom: 32, paddingLeft: insets.left + 20, paddingRight: insets.right + 20 }}>
    <T variant="title" weight="strong" accessibilityRole="header">{title}</T>
    {lead ? <View style={{ marginTop: 6 }}>{lead}</View> : null}
    {children}
  </ScrollView>;
}

/** Section label above a group. Uppercase on iOS grouped lists, sentence case on Android. */
export function Section({ label, children, note, style }: { label: string; children: ReactNode; note?: string; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ marginTop: 28 }, style]}>
    <T variant="footnote" tone="muted" weight="medium" accessibilityRole="header" style={{ marginBottom: 8, marginLeft: os === 'ios' ? 4 : 0, textTransform: os === 'ios' ? 'uppercase' : 'none', letterSpacing: os === 'ios' ? 0.4 : 0.1 }}>{label}</T>
    {children}
    {note ? <T variant="footnote" tone="muted" style={{ marginTop: 8, marginHorizontal: os === 'ios' ? 4 : 0 }}>{note}</T> : null}
  </View>;
}

/** A rounded group of rows on the elevated surface. */
export function Group({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[{ backgroundColor: t.color.elevated, borderRadius: t.radius + 4, borderWidth: StyleSheet.hairlineWidth, borderColor: t.color.lineSoft, overflow: 'hidden' }, style]}>{children}</View>;
}

/** A tappable row. Fills the width, grows with text size, never shorter than the platform's touch target. */
export function Row({ children, divider, chevron, style, role = 'button', ...props }: PressableProps & { children: ReactNode; divider?: boolean; chevron?: boolean; role?: AccessibilityRole; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <Pressable accessibilityRole={role} {...props} style={({ pressed }) => [{
    minHeight: target + 12, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: pressed ? t.color.pressed : 'transparent',
    borderTopWidth: divider ? StyleSheet.hairlineWidth : 0, borderTopColor: t.color.lineSoft,
  }, style]}>
    <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
    {chevron ? <Icon name="chevron" size={18} color={t.color.muted} /> : null}
  </Pressable>;
}

/** Buttons. Primary uses the accent: the contract reserves it for citations, sources and the primary action. */
export function Button({ label, onPress, kind = 'primary', busy, icon, hint, style }: {
  label: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'plain'; busy?: boolean; icon?: IconName; hint?: string; style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const fg = kind === 'primary' ? t.color.onAccent : t.color.ink;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint} accessibilityState={{ disabled: !!busy, busy: !!busy }} disabled={busy} onPress={onPress}
    style={({ pressed }) => [{
      minHeight: kind === 'plain' ? target : target + 8, paddingHorizontal: kind === 'plain' ? 8 : 20, paddingVertical: 10,
      borderRadius: os === 'android' ? 999 : t.radius, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: kind === 'primary' ? t.color.accent : 'transparent',
      borderWidth: kind === 'secondary' ? 1 : 0, borderColor: t.color.ink,
      opacity: pressed ? 0.75 : 1,
    }, style]}>
    {busy ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={20} color={fg} /> : null}
    <T variant="body" weight="strong" style={{ color: fg, textAlign: 'center', flexShrink: 1 }}>{label}</T>
  </Pressable>;
}

/** Source number: the same numbering as the website's chips. `mark` fills it with the highlighter. */
export function SourceNumber({ n, mark }: { n: number; mark?: boolean }) {
  const t = useTheme();
  return <View style={{ minWidth: 24, height: 24, paddingHorizontal: 4, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: mark ? t.color.accent : t.color.ink }}>
    <T variant="caption" mono weight="medium" maxFontSizeMultiplier={1.4} style={{ color: mark ? t.color.onAccent : t.color.surface, lineHeight: 16 }}>{n}</T>
  </View>;
}

/** Small outlined label, for limits and states. Not a control. */
export function Tag({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return <View style={{ alignSelf: 'flex-start', borderWidth: 1, borderColor: t.color.line, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
    <T variant="caption" weight="medium" style={style}>{children}</T>
  </View>;
}

/** The web export's back button. On iOS and Android the native header draws a system-sized one instead. */
export function WebBack({ label }: { label: string }) {
  const t = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={`Back to ${label}`} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
    style={({ pressed }) => ({ minHeight: target, minWidth: target, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, opacity: pressed ? 0.6 : 1 })}>
    <Icon name={os === 'android' ? 'arrowBack' : 'chevronBack'} size={os === 'android' ? 24 : 26} color={t.color.ink} stroke={2} />
    {os === 'ios' ? <T variant="body" style={{ marginLeft: -2 }}>{label}</T> : null}
  </Pressable>;
}
