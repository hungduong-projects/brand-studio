'use client';

import { useState } from 'react';
import { DictationButton } from '@brand-studio/ui';

export default function DictationButtonDemo() {
  const [level, setLevel] = useState(0);
  return (
    <div style={{ display: 'grid', gap: 20, justifyItems: 'center' }}>
      <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
        <div style={{ display: 'grid', gap: 8, justifyItems: 'center', fontSize: 14 }}><DictationButton onLevel={setLevel} />Click to toggle</div>
        <div style={{ display: 'grid', gap: 8, justifyItems: 'center', fontSize: 14 }}><DictationButton mode="hold" onLevel={setLevel} />Hold to talk</div>
      </div>
      <p style={{ margin: 0, color: 'var(--bs-muted)', fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>Level {Math.round(level * 100)}%</p>
    </div>
  );
}
