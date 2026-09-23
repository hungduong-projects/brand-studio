'use client';

import { useState } from 'react';
import { Button, StreamingText } from '@brand-studio/ui';

const answer = 'Try the Ethiopia Guji. It is a washed light roast with peach and jasmine notes, close to the Kenyan coffee you reordered twice. Brew it at 93 °C and give the bloom a full 30 seconds.';

export default function StreamingTextDemo() {
  const [run, setRun] = useState(0);
  return (
    <div style={{ display: 'grid', gap: 20, maxWidth: 520 }}>
      <StreamingText key={run} text={answer} />
      <div><Button tone="secondary" onClick={() => setRun(run + 1)}>Replay</Button></div>
    </div>
  );
}
