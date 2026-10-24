'use client';

import { useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { Moon, Sun } from 'lucide-react';
import '@fontsource-variable/newsreader';
import { BrandTheme, Button } from '@brand-studio/ui';
import type { BrandPalette } from '@brand-studio/ui';

const palettes: Record<string, BrandPalette> = {
  Harbour: {
    light: { surface: '#eef2f5', elevated: '#ffffff', ink: '#14202b', muted: '#56636f', accent: '#1f5f8b', onAccent: '#ffffff', line: '#cdd6de', font: '"Geist Variable", system-ui, sans-serif', voiceFont: '"Newsreader Variable", Georgia, serif', radius: '4px' },
    dark: { surface: '#0f161d', elevated: '#18222c', ink: '#eef2f5', muted: '#a3b0bc', accent: '#8cc3ea', onAccent: '#0f161d', line: '#2e3b47', font: '"Geist Variable", system-ui, sans-serif', voiceFont: '"Newsreader Variable", Georgia, serif', radius: '4px' },
  },
  Orchard: {
    light: { surface: '#eef3e8', elevated: '#ffffff', ink: '#17200f', muted: '#56614b', accent: '#2f6b2f', onAccent: '#ffffff', line: '#cfdac4', font: 'Manrope, system-ui, sans-serif', voiceFont: 'Manrope, system-ui, sans-serif', radius: '18px' },
    dark: { surface: '#111a0f', elevated: '#1a2417', ink: '#eef3e8', muted: '#a9b69d', accent: '#9bd49b', onAccent: '#111a0f', line: '#33422d', font: 'Manrope, system-ui, sans-serif', voiceFont: 'Manrope, system-ui, sans-serif', radius: '18px' },
  },
  Ember: {
    light: { surface: '#f7efe8', elevated: '#fffaf6', ink: '#24140c', muted: '#6e5646', accent: '#c2410c', onAccent: '#ffffff', line: '#e6d3c4', font: '"Geist Variable", system-ui, sans-serif', voiceFont: '"Geist Mono", ui-monospace, monospace', radius: '10px' },
    dark: { surface: '#1a110c', elevated: '#241811', ink: '#f7efe8', muted: '#c2a898', accent: '#fb923c', onAccent: '#1a110c', line: '#45301f', font: '"Geist Variable", system-ui, sans-serif', voiceFont: '"Geist Mono", ui-monospace, monospace', radius: '10px' },
  },
};
const names = Object.keys(palettes);

function Ticket({ hidden }: { hidden?: boolean }) {
  return (
    <div aria-hidden={hidden || undefined} inert={hidden || undefined} style={{ display: 'grid', justifyItems: 'center', gap: 14, padding: '36px 28px', textAlign: 'center' }}>
      <span style={{ font: '600 .6875rem/1 var(--bs-font)', letterSpacing: '.14em', color: 'var(--bs-accent-text)' }}>SAT 12 OCT · 10:00</span>
      <h3 className="bs-voice" style={{ margin: 0, fontSize: '2.5rem', fontWeight: 500, lineHeight: 1.05 }}>Saturday tasting</h3>
      <p style={{ margin: 0, maxWidth: '36ch', color: 'var(--bs-muted)', fontSize: '.9375rem' }}>Six coffees from one farm, poured side by side. About an hour, 4 of 8 seats left.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 6 }}>
        <Button>Book a seat</Button>
        <Button tone="secondary">Details</Button>
      </div>
    </div>
  );
}

export default function BrandThemeDemo() {
  const [name, setName] = useState(names[0]);
  const [split, setSplit] = useState(50);
  const stage = useRef<HTMLDivElement>(null);
  const drag = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId) || !stage.current) return;
    const box = stage.current.getBoundingClientRect();
    setSplit(Math.min(100, Math.max(0, ((event.clientX - box.left) / box.width) * 100)));
  };
  const nudge = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowLeft: -5, ArrowRight: 5, Home: -100, End: 100 }[event.key];
    if (step) { event.preventDefault(); setSplit((value) => Math.min(100, Math.max(0, value + step))); }
  };
  const layer = { gridArea: '1 / 1', borderRadius: 'calc(var(--bs-radius) + 12px)', transition: 'background-color 300ms, border-radius 300ms' };
  return (
    // Two themes on one palette, pinned light and dark; the seam clips the dark copy so both modes show at once.
    <div style={{ display: 'grid', gap: 16, width: '100%', maxWidth: 520 }}>
      <div role="group" aria-label="Palette" style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
        {names.map((item) => {
          const { light, dark } = palettes[item];
          const on = item === name;
          return (
            <button key={item} type="button" aria-pressed={on} aria-label={item} title={item} onClick={() => setName(item)} style={{ position: 'relative', width: 36, height: 36, padding: 0, border: 0, borderRadius: 99, cursor: 'pointer', background: `linear-gradient(90deg, ${light.surface} 50%, ${dark.surface} 50%)`, boxShadow: on ? `0 0 0 2px var(--bs-surface), 0 0 0 4px ${light.accent}` : '0 0 0 1px var(--bs-line)', transition: 'box-shadow 200ms' }}>
              <span aria-hidden="true" style={{ position: 'absolute', inset: 10, borderRadius: 99, background: `linear-gradient(90deg, ${light.accent} 50%, ${dark.accent} 50%)` }} />
            </button>
          );
        })}
      </div>
      <div ref={stage} style={{ position: 'relative', display: 'grid' }}>
        <BrandTheme palette={palettes[name]} mode="light" style={{ ...layer, border: '1px solid var(--bs-line)' }}><Ticket /></BrandTheme>
        <BrandTheme palette={palettes[name]} mode="dark" style={{ ...layer, border: '1px solid var(--bs-line)', clipPath: `inset(-1px -1px -1px ${split}%)` }}><Ticket hidden /></BrandTheme>
        <div role="slider" tabIndex={0} aria-label="Light and dark split" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(split)} aria-valuetext={`${Math.round(split)}% light`} onKeyDown={nudge} onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)} onPointerMove={drag} style={{ position: 'absolute', top: 0, bottom: 0, left: `${split}%`, width: 32, translate: '-16px 0', touchAction: 'none', cursor: 'ew-resize' }}>
          <span aria-hidden="true" style={{ position: 'absolute', top: 0, bottom: 0, left: 15, width: 2, background: 'rgb(255 255 255 / .85)', boxShadow: '0 0 0 1px rgb(0 0 0 / .25)' }} />
          <span aria-hidden="true" style={{ position: 'absolute', bottom: 0, left: '50%', translate: '-50% 50%', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 99, background: '#fff', color: '#111', boxShadow: '0 4px 14px rgb(0 0 0 / .35)' }}>
            <Sun size={14} /><Moon size={14} />
          </span>
        </div>
      </div>
    </div>
  );
}
