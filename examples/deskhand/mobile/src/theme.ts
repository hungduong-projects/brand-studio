import { Platform, useColorScheme } from 'react-native';
import brand from './brand/brand.json';
import { previewOs } from './preview';

/**
 * The contract's semantic tokens, mapped to React Native values. Components read roles
 * (surface, ink, accent), never literal colours. `npm run sync-brand` refreshes brand.json
 * from the website's contract, so the site and the app share one source.
 */
type Tokens = typeof brand.tokens.light;

/** Which platform's conventions to follow. The web export follows iOS unless previewing Android. */
export const os: 'ios' | 'android' = Platform.OS === 'android' || previewOs === 'android' ? 'android' : 'ios';

/** Smallest touch target: 44pt in Apple's HIG, 48dp in Material. */
export const target = os === 'android' ? 48 : 44;

const hex = (value: string) => [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16));
/** Mix two hex colours, like CSS color-mix(in srgb, a p%, b). */
const mix = (a: string, b: string, p: number) => '#' + hex(a).map((v, i) => Math.round(v * p + hex(b)[i] * (1 - p)).toString(16).padStart(2, '0')).join('');

/** The contract names "Geist Variable" for web. Native loads Geist's static weights, one family name per weight. */
const family = brand.tokens.light.font.match(/^"?([^",]+)/)?.[1].replace(/ Variable$/, '');
const geist = family === 'Geist';
export const fonts = {
  text: geist ? 'Geist_400Regular' : undefined,
  medium: geist ? 'Geist_500Medium' : undefined,
  strong: geist ? 'Geist_600SemiBold' : undefined,
  /** Contract invariant: mono only for ticket, order and money data. */
  mono: geist ? 'GeistMono_400Regular' : Platform.select({ ios: 'Menlo', default: 'monospace' }),
  monoMedium: geist ? 'GeistMono_500Medium' : Platform.select({ ios: 'Menlo', default: 'monospace' }),
};

/** Type roles. iOS follows Dynamic Type sizes, Android follows Material 3 roles. Both scale with the system text size. */
const type = os === 'android'
  ? { title: 28, headline: 22, body: 16, callout: 15, footnote: 14, caption: 12 }
  : { title: 34, headline: 20, body: 17, callout: 16, footnote: 13, caption: 12 };

function build(t: Tokens, scheme: 'light' | 'dark') {
  return {
    scheme,
    color: {
      surface: t.surface,
      elevated: t.elevated,
      ink: t.ink,
      muted: t.muted,
      accent: t.accent,
      onAccent: t.onAccent,
      line: t.line,
      /** Hairlines between rows, like the site's --bs-line-soft. */
      lineSoft: mix(t.line, t.surface, 0.45),
      /** Pressed rows and the Android tab indicator. */
      pressed: mix(t.ink, t.surface, 0.08),
      /** App-only status role, chosen for 4.5:1 on surface and elevated in each scheme. */
      danger: scheme === 'dark' ? '#ff9b8f' : '#b3261e',
    },
    radius: parseFloat(t.radius),
    type,
    fonts,
  };
}

export type Theme = ReturnType<typeof build>;
const themes = { light: build(brand.tokens.light, 'light'), dark: build(brand.tokens.dark, 'dark') };

export function useTheme(): Theme {
  return themes[useColorScheme() === 'dark' ? 'dark' : 'light'];
}
