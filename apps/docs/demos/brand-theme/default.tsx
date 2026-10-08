'use client';

import { useState } from 'react';
import '@fontsource-variable/newsreader';
import { Badge, BrandTheme, Button, Card, MagnetTabs } from '@brand-studio/ui';
import type { BrandPalette } from '@brand-studio/ui';

const palettes: Record<string, BrandPalette> = {
  Harbour: {
    light: { surface: '#eef2f5', elevated: '#ffffff', ink: '#14202b', muted: '#56636f', accent: '#1f5f8b', onAccent: '#ffffff', line: '#cdd6de', font: '"Geist Variable", system-ui, sans-serif', voiceFont: '"Newsreader Variable", Georgia, serif', radius: '2px' },
    dark: { surface: '#0f161d', elevated: '#18222c', ink: '#eef2f5', muted: '#a3b0bc', accent: '#8cc3ea', onAccent: '#0f161d', line: '#2e3b47', font: '"Geist Variable", system-ui, sans-serif', voiceFont: '"Newsreader Variable", Georgia, serif', radius: '2px' },
  },
  Orchard: {
    light: { surface: '#eef3e8', elevated: '#ffffff', ink: '#17200f', muted: '#56614b', accent: '#2f6b2f', onAccent: '#ffffff', line: '#cfdac4', font: 'Manrope, system-ui, sans-serif', voiceFont: 'Manrope, system-ui, sans-serif', radius: '18px' },
    dark: { surface: '#111a0f', elevated: '#1a2417', ink: '#eef3e8', muted: '#a9b69d', accent: '#9bd49b', onAccent: '#111a0f', line: '#33422d', font: 'Manrope, system-ui, sans-serif', voiceFont: 'Manrope, system-ui, sans-serif', radius: '18px' },
  },
  Ember: {
    light: { surface: '#f7efe8', elevated: '#fffaf6', ink: '#24140c', muted: '#6e5646', accent: '#c2410c', onAccent: '#ffffff', line: '#e6d3c4', font: '"Geist Variable", system-ui, sans-serif', voiceFont: '"Geist Mono", ui-monospace, monospace', radius: '8px' },
    dark: { surface: '#1a110c', elevated: '#241811', ink: '#f7efe8', muted: '#c2a898', accent: '#fb923c', onAccent: '#1a110c', line: '#45301f', font: '"Geist Variable", system-ui, sans-serif', voiceFont: '"Geist Mono", ui-monospace, monospace', radius: '8px' },
  },
};
const names = Object.keys(palettes);

const modes = [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System' }];

export default function BrandThemeDemo() {
  const [name, setName] = useState(names[0]);
  const [mode, setMode] = useState<'light' | 'dark' | 'system'>('light');
  return (
    // The controls sit inside the theme, so they change with the card. The frame's corners follow the palette's radius.
    <BrandTheme palette={palettes[name]} mode={mode} style={{ display: 'grid', gap: 20, width: '100%', maxWidth: 560, padding: 20, borderRadius: 'calc(var(--bs-radius) * 2)', border: '1px solid var(--bs-line)', transition: 'background-color 300ms' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <MagnetTabs aria-label="Palette" items={names.map((item) => ({ value: item, label: item }))} value={name} onValueChange={setName} />
        <MagnetTabs aria-label="Mode" items={modes} value={mode} onValueChange={(value) => setMode(value as typeof mode)} />
      </div>
      <Card
        title={<span className="bs-voice" style={{ display: 'block', marginBottom: 6, fontSize: '1.5rem', lineHeight: 1.15 }}>Saturday tasting</span>}
        description="Six coffees from one farm, poured side by side. About an hour."
        footer={<><Button>Book a seat</Button><Button tone="secondary">Details</Button></>}
      >
        <div style={{ display: 'flex', gap: 8 }}><Badge tone="accent">4 seats left</Badge><Badge tone="outline">Sat · 10:00</Badge></div>
      </Card>
    </BrandTheme>
  );
}
