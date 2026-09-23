'use client';

import { useEffect, useState } from 'react';
import { Button, LiveTranscript } from '@brand-studio/ui';

const phrases = ['Order two bags of the Huila', 'for North Street Café,', 'ground for filter,', 'and deliver them on Friday.'];

export default function LiveTranscriptDemo() {
  const [step, setStep] = useState(-1);
  const playing = step >= 0 && step < phrases.length * 4;
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => setStep(value => value + 1), 320);
    return () => clearTimeout(timer);
  }, [playing, step]);
  // Each phrase shows as a growing guess for three ticks, then settles.
  const phrase = Math.floor(step / 4), tick = step % 4;
  const done = phrases.slice(0, playing ? phrase : phrases.length).join(' ');
  const words = playing ? phrases[phrase].split(' ') : [];
  const interim = playing && tick < 3 ? words.slice(0, Math.ceil(words.length * (tick + 1) / 3)).join(' ') : '';
  const text = playing && tick === 3 ? [done, phrases[phrase]].filter(Boolean).join(' ') : step < 0 ? '' : done;
  return (
    <div style={{ width: '100%', maxWidth: 560, display: 'grid', gap: 20, justifyItems: 'start' }}>
      <LiveTranscript text={text} interim={interim} listening={playing} />
      <Button tone="secondary" onClick={() => setStep(0)} disabled={playing}>{step < 0 ? 'Play dictation' : 'Play again'}</Button>
    </div>
  );
}
