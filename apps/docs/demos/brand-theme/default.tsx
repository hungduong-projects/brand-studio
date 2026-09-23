'use client';

import { useState } from 'react';
import '@fontsource-variable/newsreader';
import { Badge, BrandTheme, Button, Card, Switch } from '@brand-studio/ui';
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

export default function BrandThemeDemo() {
  const [name, setName] = useState(names[0]);
  const [dark, setDark] = useState(false);
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 24, width: '100%', maxWidth: 420 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <div role="group" aria-label="Palette" style={{ display: 'flex', gap: 8 }}>
          {names.map((item) => (
            <Button key={item} shape="pill" tone={item === name ? 'primary' : 'secondary'} aria-pressed={item === name} onClick={() => setName(item)}>{item}</Button>
          ))}
        </div>
        <Switch label="Dark" checked={dark} onCheckedChange={setDark} />
      </div>
      <BrandTheme palette={palettes[name]} mode={dark ? 'dark' : 'light'} style={{ width: '100%', padding: 20, borderRadius: 16, transition: 'background-color 300ms' }}>
        <Card
          title={<span className="bs-voice" style={{ display: 'block', marginBottom: 6, fontSize: '1.5rem', lineHeight: 1.15 }}>Saturday tasting</span>}
          description="Six coffees from one farm, poured side by side. About an hour."
          footer={<><Button>Book a seat</Button><Button tone="secondary">Details</Button></>}
        >
          <div style={{ display: 'flex', gap: 8 }}><Badge tone="accent">4 seats left</Badge><Badge tone="outline">Sat · 10:00</Badge></div>
        </Card>
      </BrandTheme>
    </div>
  );
}
