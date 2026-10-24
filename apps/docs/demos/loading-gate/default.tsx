'use client';

import { useRef, useState } from 'react';
import { Button, LoadingGate } from '@brand-studio/ui';

const orders = ['Ethiopia Guji · 2 bags', 'Huila Washed · 1 bag', 'House Espresso · 3 bags'];

// The slow note and the time-out come sooner than the defaults (8 s and 20 s), so every stage shows in a short visit.
export default function LoadingGateDemo() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [loaded, setLoaded] = useState(false);
  const timer = useRef(0);
  const load = (ms?: number) => {
    clearTimeout(timer.current);
    setError(undefined);
    setLoading(true);
    if (ms) timer.current = window.setTimeout(() => { setLoading(false); setLoaded(true); }, ms);
  };
  return (
    <div style={{ display: 'grid', gap: 16, width: '100%', maxWidth: 420 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Button tone="secondary" onClick={() => load(200)}>Quick answer</Button>
        <Button tone="secondary" onClick={() => load(4000)}>Slow answer</Button>
        <Button tone="secondary" onClick={() => load()}>No answer</Button>
      </div>
      <LoadingGate
        loading={loading}
        error={error}
        label="Loading orders"
        slowAfter={2500}
        timeout={6000}
        onTimeout={() => { setLoading(false); setError('Orders did not load'); }}
        onRetry={() => load(1200)}
        onCancel={() => { clearTimeout(timer.current); setLoading(false); }}
      >
        {loaded
          ? <ul style={{ margin: 0, paddingInlineStart: 20 }}>{orders.map(order => <li key={order}>{order}</li>)}</ul>
          : <p style={{ margin: 0 }}>Pick how the server answers.</p>}
      </LoadingGate>
    </div>
  );
}
