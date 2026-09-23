'use client';

import { useState } from 'react';
import { SelectionActions, StreamingText } from '@brand-studio/ui';

const replies: Record<string, (text: string) => string> = {
  explain: text => `“${text}” means the flavour the coffee leaves after you swallow, and how long it lasts.`,
  shorten: () => 'A long, sweet finish.',
  translate: () => 'Un final largo y dulce.',
};

export default function SelectionActionsDemo() {
  const [reply, setReply] = useState<string>();
  return (
    <div style={{ width: '100%', maxWidth: 560, display: 'grid', gap: 20 }}>
      <SelectionActions
        actions={[{ id: 'explain', label: 'Explain' }, { id: 'shorten', label: 'Shorten' }, { id: 'translate', label: 'Translate' }]}
        onAction={(id, text) => setReply(replies[id](text))}
      >
        <p style={{ margin: 0, fontSize: 18, lineHeight: 1.6 }}>
          Washed Huila opens with red apple and panela, then settles into a finish that stays long and sweet well after the cup cools. Select any words to ask about them.
        </p>
      </SelectionActions>
      <div style={{ minHeight: 48, color: 'var(--bs-muted)' }}>{reply ? <StreamingText key={reply} text={reply} /> : null}</div>
    </div>
  );
}
