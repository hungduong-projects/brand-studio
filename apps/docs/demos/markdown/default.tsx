'use client';

import { useEffect, useState } from 'react';
import { Button, ChatMessage, Markdown } from '@brand-studio/ui';

const answer = [
  'A pour-over suits the **Huila** beans. They rested nine days, so they are *ready*.',
  '## Recipe for one cup',
  '| Step | Water | Time |\n|---|--:|--:|\n| Bloom | 30 g | 0:30 |\n| First pour | 150 g | 1:15 |\n| Final pour | 250 g | 3:00 |',
  '1. Grind **15 g** like coarse sand\n2. Heat the water to 94 °C[^1]\n3. Pour in three stages',
  '- [x] Rinse the filter\n- [ ] Warm the cup',
  'For another dose, `brewRatio` works out the water:',
  '```ts\nbrewRatio(15); // { water: 240, bloom: 30 }\n```',
  '> Sour cup? Grind a little finer next time. The [chat thread](/docs/components/chat-thread/) shows the whole conversation.',
  '[^1]: Just off the boil. Darker roasts like it a few degrees cooler.',
].join('\n\n');

export default function MarkdownDemo() {
  const [shown, setShown] = useState(answer.length);
  const streaming = shown < answer.length;
  useEffect(() => {
    if (!streaming) return;
    const timer = setTimeout(() => setShown(length => Math.min(answer.length, length + 4)), 20);
    return () => clearTimeout(timer);
  }, [shown, streaming]);
  return (
    <div style={{ width: '100%', maxWidth: 620, display: 'grid', gap: 12, justifyItems: 'end' }}>
      <div style={{ width: '100%' }}>
        <ChatMessage name="Brew assistant" avatar="B"><Markdown text={answer.slice(0, shown)} streaming={streaming} /></ChatMessage>
      </div>
      <Button tone="secondary" disabled={streaming} onClick={() => setShown(0)}>{streaming ? 'Writing' : 'Replay as a stream'}</Button>
    </div>
  );
}
