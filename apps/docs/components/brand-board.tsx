'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { flushSync } from 'react-dom';
import { BrandTheme, VoiceOrb } from '@brand-studio/ui';
import type { BrandPalette, BrandTokens, VoiceState } from '@brand-studio/ui';
import { registry } from '@/demos/registry';
import { brands, brandKeys, type BrandKey } from '@/lib/brands';
import { catalog, componentHref } from '@/lib/catalog';
import { useDemoBrand } from './demo-brand';

type Pick = BrandKey | 'yours';
const fonts = {
  Geist: '"Geist Variable", system-ui, sans-serif',
  Manrope: '"Manrope", sans-serif',
  Serif: 'ui-serif, Georgia, serif',
  Mono: '"Geist Mono", ui-monospace, monospace',
} as const;
type FontName = keyof typeof fonts;

// Each cell names the demo it shows; `area` places it in the board's grid.
const cells = [
  { demo: 'chat-thread/default', area: 'chat' },
  { demo: 'approval-card/default', area: 'approve' },
  { demo: 'task-rows/default', area: 'tasks' },
  { demo: 'card/default', area: 'card' },
  { demo: 'agent-thinking/default', area: 'thinking' },
  { demo: 'tool-chips/default', area: 'tools' },
  { demo: 'switch/description', area: 'switch' },
];
const voiceStates: VoiceState[] = ['listening', 'thinking', 'speaking', 'idle'];
const voiceLabels = ['Listening', 'Thinking', 'Speaking', 'Ready'];

/** Black or white, whichever reads better on `hex`, plus whether the colour is too light to use as text. */
function contrastFor(hex: string) {
  const [r, g, b] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255).map((value) => (value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4));
  const light = .2126 * r! + .7152 * g! + .0722 * b! > .4;
  return { onAccent: light ? '#0a0a0a' : '#ffffff', light };
}

/** Hollis with your accent, corners and typeface swapped in. */
function yourPalette(accent: string, radius: number, font: FontName): BrandPalette {
  const { onAccent, light } = contrastFor(accent);
  const swap = (tokens: BrandTokens): BrandTokens => ({ ...tokens, accent, onAccent, accentText: light ? tokens.ink : accent, radius: `${radius}px`, font: fonts[font], voiceFont: fonts[font] });
  return { light: swap(brands.hollis.palette.light), dark: swap(brands.hollis.palette.dark) };
}

const familyName = (font: string) => font.split(',')[0]!.replace(/"/g, '').replace(' Variable', '');

/**
 * The home page's board: brand tabs over live components. Picking a brand re-skins the board in a circle that spreads
 * from the tab; Yours lets the reader set the accent, corners and typeface and watch every card follow.
 */
export function BrandBoard() {
  const { brand, mode, set } = useDemoBrand();
  const [yours, setYours] = useState(false);
  const [accent, setAccent] = useState('#15803d');
  const [radius, setRadius] = useState(14);
  const [font, setFont] = useState<FontName>('Manrope');
  const [voice, setVoice] = useState(0);
  const body = useRef<HTMLDivElement>(null);
  const picked: Pick = yours ? 'yours' : brand;
  const palette = yours ? yourPalette(accent, radius, font) : brands[brand].palette;
  const tokens = palette[mode];

  // The header's brand picker also drives the board, so a pick there leaves Yours.
  useEffect(() => setYours(false), [brand]);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => setVoice((index) => (index + 1) % voiceStates.length), 3200);
    return () => clearInterval(timer);
  }, []);

  const choose = (next: Pick) => (event: ChangeEvent<HTMLInputElement>) => {
    const apply = () => { setYours(next === 'yours'); if (next !== 'yours') set({ brand: next }, false); };
    const board = body.current, tab = event.currentTarget.closest('label');
    if (!board || !tab || !document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) { apply(); return; }
    // The new board grows out of the picked tab as a circle, reaching the far corner as it ends.
    const box = board.getBoundingClientRect(), from = tab.getBoundingClientRect();
    const x = from.left + from.width / 2 - box.left, y = from.top + from.height / 2 - box.top;
    const root = document.documentElement.style;
    root.setProperty('--reveal-x', `${x}px`);
    root.setProperty('--reveal-y', `${y}px`);
    root.setProperty('--reveal-r', `${Math.hypot(Math.max(x, box.width - x), Math.max(y, box.height - y))}px`);
    document.documentElement.classList.add('board-reveal');
    document.startViewTransition(() => flushSync(apply)).finished.finally(() => document.documentElement.classList.remove('board-reveal'));
  };

  const snippet = `{ "accent": "${tokens.accent}", "font": "${familyName(tokens.font)}", "radius": "${tokens.radius}" }`;

  return <section className="board" aria-labelledby="board-title">
    <h2 id="board-title" className="sr-only">Live components in your choice of brand</h2>
    <div className="board__bar">
      <fieldset className="board__tabs">
        <legend className="sr-only">Brand for the board</legend>
        {[...brandKeys, 'yours' as const].map((key) => <label key={key} className="board__tab">
          <input type="radio" name="board-brand" value={key} checked={picked === key} onChange={choose(key)} />
          <span className="board__swatch" style={{ background: key === 'yours' ? accent : brands[key].palette.light.accent }} aria-hidden="true" />
          {key === 'yours' ? 'Yours' : brands[key].label}
        </label>)}
      </fieldset>
      <div className="board__contract">
        {yours && <>
          <label className="board__control">Accent <input type="color" value={accent} onChange={(event) => setAccent(event.target.value)} /></label>
          <label className="board__control">Corners <input type="range" min={0} max={28} value={radius} onChange={(event) => setRadius(+event.target.value)} /><output>{radius}px</output></label>
          <label className="board__control">Typeface <select value={font} onChange={(event) => setFont(event.target.value as FontName)}>{Object.keys(fonts).map((name) => <option key={name}>{name}</option>)}</select></label>
        </>}
        <code className="board__snippet" aria-label="The brand contract values in use"><span className="board__swatch" style={{ background: tokens.accent }} aria-hidden="true" />{snippet}</code>
      </div>
    </div>
    <div ref={body} className="board__body">
      <BrandTheme palette={palette} mode={mode} className="board__grid" data-brand={picked}>
        <figure className="board__cell" style={{ gridArea: 'voice' }}>
          {/* Hidden from screen readers: the orb's status would announce a new state every few seconds. */}
          <div className="board__stage" aria-hidden="true"><VoiceOrb state={voiceStates[voice]} level={.5} size={176} label={voiceLabels[voice]} /></div>
          <figcaption><a href={componentHref('voice-orb')}>Voice Orb</a></figcaption>
        </figure>
        {cells.map(({ demo, area }) => {
          const Demo = registry[demo]!, entry = catalog.find((item) => item.slug === demo.split('/')[0])!;
          return <figure key={demo} className="board__cell" style={{ gridArea: area }}>
            <div className="board__stage"><Demo /></div>
            <figcaption><a href={componentHref(entry.slug)}>{entry.title}</a></figcaption>
          </figure>;
        })}
      </BrandTheme>
    </div>
    <p className="board__note">Every card is the real package. Still, Hollis and Deskhand are fictional brands.</p>
  </section>;
}
