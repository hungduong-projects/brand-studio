'use client';

import { SwipeDeck } from '@brand-studio/ui';
import { useState } from 'react';
import { beans, cup, pour } from '@/demos/assets';

const lots = [
  { id: 'huila', title: 'Huila, Colombia', asset: cup, body: <p>Stone fruit and brown sugar · washed</p> },
  { id: 'sidama', title: 'Sidama, Ethiopia', asset: pour, body: <p>Jasmine and bergamot · natural</p> },
  { id: 'kirinyaga', title: 'Kirinyaga, Kenya', asset: beans, body: <p>Blackcurrant and cola · washed</p> },
];

export default function SwipeDeckDemo() {
  const [box, setBox] = useState<string[]>([]);
  return (
    <div style={{ width: '100%', maxWidth: 420 }}>
      <SwipeDeck label="Build this month’s box" cards={lots} leftLabel="Skip" rightLabel="Add to box"
        onSwipe={(card, direction) => { if (direction === 'right') setBox(current => current.includes(card.title) ? current : [...current, card.title]); }} />
      <p style={{ margin: '16px 0 0', textAlign: 'center', fontSize: 14, color: 'var(--bs-muted)' }}>In your box: {box.length ? box.join(', ') : 'nothing yet'}</p>
    </div>
  );
}
