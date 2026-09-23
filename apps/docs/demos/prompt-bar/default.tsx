'use client';

import { useState } from 'react';
import { PromptBar } from '@brand-studio/ui';
import type { PromptSubmission } from '@brand-studio/ui';

export default function PromptBarDemo() {
  const [last, setLast] = useState<PromptSubmission>();
  return (
    <div style={{ width: '100%', maxWidth: 600, display: 'grid', gap: 16, paddingTop: 180 }}>
      <PromptBar
        sources={[
          { id: 'roasts', label: 'Roast log', hint: 'Sheet' },
          { id: 'notes', label: 'Tasting notes', hint: 'Doc' },
          { id: 'supplier', label: 'Supplier prices', hint: 'Sheet' },
          { id: 'orders', label: 'Open orders', hint: 'Shop' },
        ]}
        commands={[
          { id: 'summarise', label: 'summarise', hint: 'Short summary' },
          { id: 'reorder', label: 'reorder', hint: 'Draft a purchase order' },
          { id: 'email', label: 'email', hint: 'Write to a customer' },
        ]}
        models={[{ value: 'fast', label: 'Fast' }, { value: 'deep', label: 'Deep thinking' }]}
        onSubmit={setLast}
      />
      <p style={{ margin: 0, minHeight: 24, color: 'var(--bs-muted)', fontSize: 14 }}>
        {last ? `${last.command ? `/${last.command} ` : ''}${last.text}${last.sources.length ? ` · sources: ${last.sources.join(', ')}` : ''} · ${last.model}` : 'Try typing @ or /'}
      </p>
    </div>
  );
}
