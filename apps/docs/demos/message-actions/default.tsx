'use client';

import { useState } from 'react';
import { ChatMessage, MessageActions, StreamingText } from '@brand-studio/ui';

const answer = 'Rest the Guji for two more days. Beans roasted this light keep releasing gas for about ten days, and brewing early tastes sharp.';

export default function MessageActionsDemo() {
  const [run, setRun] = useState(0);
  return (
    <div style={{ width: '100%', maxWidth: 520 }}>
      <ChatMessage name="Brew assistant" avatar="B" actions={<MessageActions copyText={answer} onRetry={() => setRun(value => value + 1)} />}>
        <StreamingText key={run} text={answer} />
      </ChatMessage>
    </div>
  );
}
