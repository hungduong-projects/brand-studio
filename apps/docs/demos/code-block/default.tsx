'use client';

import { useState } from 'react';
import { Button, CodeBlock } from '@brand-studio/ui';

const code = `export function brewRatio(coffeeGrams: number, strength = 16) {
  const water = coffeeGrams * strength;
  const bloom = coffeeGrams * 2;
  return { water, bloom, pours: [bloom, water * 0.6, water] };
}

brewRatio(15); // { water: 240, bloom: 30, ... }`;

export default function CodeBlockDemo() {
  const [run, setRun] = useState(0);
  return (
    <div style={{ width: '100%', maxWidth: 600, display: 'grid', gap: 12, justifyItems: 'end' }}>
      <div style={{ width: '100%' }}><CodeBlock key={run} code={code} filename="brew.ts" language="TypeScript" reveal lineNumbers /></div>
      <Button tone="secondary" onClick={() => setRun(value => value + 1)}>Replay</Button>
    </div>
  );
}
