'use client';

import { useState } from 'react';
import { AgentThinking, Button } from '@brand-studio/ui';

const states = [
  { state: 'idle', label: 'Ready when you are' },
  { state: 'listening', label: 'Listening' },
  { state: 'thinking', label: 'Comparing roast notes' },
  { state: 'speaking', label: 'Answering' },
] as const;

export default function AgentThinkingDemo() {
  const [current, setCurrent] = useState<(typeof states)[number]>(states[2]);
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 40 }}>
      <AgentThinking state={current.state} label={current.label} size={72} />
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }} role="group" aria-label="Agent state">
        {states.map((item) => (
          <Button key={item.state} tone={item === current ? 'primary' : 'secondary'} shape="pill" aria-pressed={item === current} onClick={() => setCurrent(item)}>
            {item.state}
          </Button>
        ))}
      </div>
    </div>
  );
}
