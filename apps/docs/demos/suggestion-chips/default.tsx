'use client';

import { useState } from 'react';
import { SuggestionChips } from '@brand-studio/ui';

export default function SuggestionChipsDemo() {
  const [asked, setAsked] = useState<string>();
  return (
    <div style={{ width: '100%', maxWidth: 520, display: 'grid', gap: 16, textAlign: 'center', justifyItems: 'center' }}>
      <h3 style={{ margin: 0, fontSize: 22 }}>{asked ?? 'What are we brewing today?'}</h3>
      <SuggestionChips
        key={asked}
        label={asked ? 'Follow-up questions' : 'Ways to start'}
        suggestions={asked ? ['Why that grind size?', 'What if I only have a French press?', 'Save this recipe'] : ['Dial in a new bag', 'Which beans are ready?', 'Plan this week’s roasts', 'Write tasting notes']}
        onSelect={setAsked}
      />
    </div>
  );
}
