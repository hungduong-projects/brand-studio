'use client';

import { useEffect, useState } from 'react';
import { DictationButton, MagnetTabs, VoiceOrb } from '@brand-studio/ui';
import type { VoiceOrbShape, VoiceState } from '@brand-studio/ui';

const states: VoiceState[] = ['idle', 'listening', 'thinking', 'speaking'];
const shapes: (VoiceOrbShape | 'state')[] = ['state', 'network', 'meridians', 'ribbon', 'morph'];

export default function VoiceOrbDemo() {
  const [state, setState] = useState<VoiceState>('listening');
  const [shape, setShape] = useState<VoiceOrbShape | 'state'>('state');
  const [mic, setMic] = useState(false);
  const [level, setLevel] = useState(0);
  // Without the microphone, a made-up voice drives the level.
  useEffect(() => {
    if (mic || (state !== 'listening' && state !== 'speaking')) { if (!mic) setLevel(0); return; }
    let frame = 0;
    const tick = (time: number) => { setLevel(Math.max(0, Math.sin(time / 180) * Math.sin(time / 530)) * 0.9); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mic, state]);
  return (
    <div style={{ width: '100%', display: 'grid', gap: 28, justifyItems: 'center' }}>
      <VoiceOrb state={state} level={level} size={140} shape={shape === 'state' ? undefined : shape} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '100%', overflowX: 'auto' }}>
          <MagnetTabs items={states.map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} value={state} onValueChange={value => setState(value as VoiceState)} aria-label="Orb state" />
        </div>
        <DictationButton label="Use my microphone" listening={mic} onListeningChange={on => { setMic(on); if (on) setState('listening'); }} onLevel={setLevel} />
      </div>
      <div style={{ maxWidth: '100%', overflowX: 'auto' }}>
        <MagnetTabs items={shapes.map(value => ({ value, label: value === 'state' ? 'State look' : value[0].toUpperCase() + value.slice(1) }))} value={shape} onValueChange={value => setShape(value as VoiceOrbShape | 'state')} aria-label="Orb shape" />
      </div>
    </div>
  );
}
