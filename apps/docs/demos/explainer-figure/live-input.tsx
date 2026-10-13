'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { ExplainerFigure } from '@brand-studio/ui';
import liveDesk from './live-desk.json';

const sources = ['Returns and refunds', 'Order #48213', 'Payments'];

export default function ExplainerFigureLiveInputDemo() {
  // value runs from 1 to 3 sources; the figure's first three steps are one, two and three drawers open.
  const [value, setValue] = useState(1);
  // The slider drives the figure only while someone uses it; otherwise the step list and drag own it and the slider follows.
  const [driving, setDriving] = useState(false);
  const tween = useRef(0);
  const glide = (to: number) => {
    cancelAnimationFrame(tween.current);
    setDriving(true);
    const from = value, start = performance.now();
    const frame = (now: number) => {
      const t = Math.min((now - start) / 320, 1), eased = 1 - (1 - t) ** 3;
      setValue(from + (to - from) * eased);
      if (t < 1) tween.current = requestAnimationFrame(frame); else setDriving(false);
    };
    tween.current = requestAnimationFrame(frame);
  };
  const keys = (event: KeyboardEvent<HTMLInputElement>) => {
    const to = ({ ArrowRight: Math.round(value) + 1, ArrowUp: Math.round(value) + 1, ArrowLeft: Math.round(value) - 1, ArrowDown: Math.round(value) - 1, Home: 1, End: 3 } as Record<string, number>)[event.key];
    if (to === undefined) return;
    event.preventDefault();
    glide(Math.max(1, Math.min(3, to)));
  };
  const read = Math.round(value);
  return (
    <div style={{ width: '100%', maxWidth: 560, display: 'grid', gap: 12 }}>
      <label style={{ display: 'grid', gap: 6, padding: '0 10px' }}>
        <span style={{ display: 'flex', justifyContent: 'space-between', gap: 12, font: '11px/1.3 ui-monospace, SFMono-Regular, Menlo, monospace', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--bs-muted)' }}>
          <span>Sources read</span><span style={{ color: 'var(--bs-ink)' }}>{read} of 3</span>
        </span>
        <input type="range" min={1} max={3} step={0.01} value={value} aria-valuetext={`${read} of 3 sources read`}
          onChange={event => { cancelAnimationFrame(tween.current); setDriving(true); setValue(Number(event.target.value)); }}
          onPointerUp={() => glide(Math.round(value))} onKeyDown={keys}
          style={{ width: '100%', minHeight: 44, accentColor: 'var(--bs-accent)', cursor: 'ew-resize' }} />
        <span style={{ fontSize: 13, color: 'var(--bs-muted)' }} aria-live="polite">{sources.slice(0, read).join(' · ')}</span>
      </label>
      <ExplainerFigure figure={liveDesk} position={driving ? value - 1 : undefined} onStepChange={step => { if (!driving) setValue(Math.min(step, 2) + 1); }} />
    </div>
  );
}
