'use client';

import { useEffect, useState } from 'react';
import { Button, ChatMessage, Markdown, visualBlocks } from '@brand-studio/ui';

const chart = { title: 'Cups sold', unit: ' cups', labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], series: [{ name: 'Hot', values: [42, 38, 45, 51, 58, 74, 61] }], lit: 'Sat', note: 'Saturday was the busiest day: 74 cups.' };
const flow = {
  title: 'Before Saturday',
  nodes: [{ id: 'roast', label: 'Roast on Thursday', tag: 'You' }, { id: 'rest', label: 'Rest the beans two days' }, { id: 'stock', label: 'Enough for 80 cups?', kind: 'decision' }, { id: 'open', label: 'Open as usual' }, { id: 'order', label: 'Order a second bag', tag: 'Agent' }],
  edges: [{ from: 'roast', to: 'rest' }, { from: 'rest', to: 'stock' }, { from: 'stock', to: 'open', label: 'Yes' }, { from: 'stock', to: 'order', label: 'No' }],
  lit: ['roast', 'rest', 'stock', 'open'],
};
const answer = [
  'Saturday is your busiest day, so roast on **Thursday**.',
  '```chart\n' + JSON.stringify(chart, null, 1) + '\n```',
  'The beans need two days of rest. Here is the plan:',
  '```flow\n' + JSON.stringify(flow, null, 1) + '\n```',
  'Want me to place the order if stock runs short?',
].join('\n\n');

export default function MarkdownBlocksDemo() {
  const [shown, setShown] = useState(answer.length);
  const streaming = shown < answer.length;
  useEffect(() => {
    if (!streaming) return;
    const timer = setTimeout(() => setShown(length => Math.min(answer.length, length + 12)), 20);
    return () => clearTimeout(timer);
  }, [shown, streaming]);
  return (
    <div style={{ width: '100%', maxWidth: 620, display: 'grid', gap: 12, justifyItems: 'end' }}>
      <div style={{ width: '100%' }}>
        <ChatMessage name="Brew assistant" avatar="B"><Markdown text={answer.slice(0, shown)} streaming={streaming} blocks={visualBlocks} /></ChatMessage>
      </div>
      <Button tone="secondary" disabled={streaming} onClick={() => setShown(0)}>{streaming ? 'Writing' : 'Replay as a stream'}</Button>
    </div>
  );
}
