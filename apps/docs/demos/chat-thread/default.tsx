'use client';

import { useState } from 'react';
import { ChatComposer, ChatMessage, ChatThread, MessageActions, StreamingText } from '@brand-studio/ui';

const replies = [
  'For a 250 ml cup, use 15 g of coffee ground like coarse sand, and water around 94°C.',
  'Pour in three stages over about three minutes. If it tastes sour, grind a little finer next time.',
  'The Huila beans rested nine days, so they are ready. The Guji needs two more.',
];

interface Turn { id: number; from: 'user' | 'agent'; text: string }

export default function ChatThreadDemo() {
  const [turns, setTurns] = useState<Turn[]>([
    { id: 1, from: 'user', text: 'How should I brew the new Huila beans?' },
    { id: 2, from: 'agent', text: 'A pour-over brings out the red fruit. Want the recipe?' },
  ]);
  const [busy, setBusy] = useState(false);
  const send = (text: string) => {
    const reply = replies[(turns.length / 2 - 1) % replies.length];
    setTurns(list => [...list, { id: list.length + 1, from: 'user', text }]);
    setBusy(true);
    setTimeout(() => { setTurns(list => [...list, { id: list.length + 1, from: 'agent', text: reply }]); setBusy(false); }, 700);
  };
  return (
    <div style={{ width: '100%', maxWidth: 560, height: 440, display: 'grid', gridTemplateRows: '1fr auto', gap: 12 }}>
      <ChatThread label="Brew assistant">
        {turns.map(turn => (
          <ChatMessage key={turn.id} from={turn.from} name={turn.from === 'user' ? 'You' : 'Brew assistant'} avatar={turn.from === 'agent' ? 'B' : undefined}
            actions={turn.from === 'agent' ? <MessageActions copyText={turn.text} /> : undefined}>
            {turn.from === 'agent' && turn.id > 2 ? <StreamingText text={turn.text} /> : <p>{turn.text}</p>}
          </ChatMessage>
        ))}
      </ChatThread>
      <ChatComposer placeholder="Ask about your coffee" busy={busy} onSubmit={send} onStop={() => setBusy(false)} />
    </div>
  );
}
