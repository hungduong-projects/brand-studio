'use client';

import { useState } from 'react';
import { Button, ScatterText } from '@brand-studio/ui';

export default function ScatterTextDemo() {
  const [tidy, setTidy] = useState(false);
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 20, textAlign: 'center' }}>
      <h2 style={{ margin: 0, fontSize: 'clamp(2.4rem, 9vw, 4.5rem)', fontWeight: 800 }}>
        <ScatterText text="Page not found" tidy={tidy} />
      </h2>
      <p style={{ margin: 0, maxWidth: '30ch', color: 'var(--bs-muted)' }}>Drag the letters about, or put them back in one go.</p>
      <Button tone="secondary" onClick={() => setTidy(value => !value)}>{tidy ? 'Knock it over' : 'Put it back'}</Button>
    </div>
  );
}
