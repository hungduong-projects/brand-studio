'use client';

import { useState } from 'react';
import { Button, KineticText } from '@brand-studio/ui';

export default function KineticTextDemo() {
  const [run, setRun] = useState(0);
  const [by, setBy] = useState<'word' | 'letter'>('word');
  return (
    <div style={{ width: '100%', maxWidth: 620, display: 'grid', gap: 24 }}>
      <KineticText key={`${run}-${by}`} by={by} text="Roasted on Monday, in your cup by Friday." />
      <div style={{ display: 'flex', gap: 8 }}>
        <Button tone="secondary" onClick={() => setRun(run + 1)}>Replay</Button>
        <Button tone="secondary" onClick={() => setBy(by === 'word' ? 'letter' : 'word')}>By {by === 'word' ? 'letter' : 'word'}</Button>
      </div>
    </div>
  );
}
