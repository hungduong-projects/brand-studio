'use client';

import { useState } from 'react';
import { Select } from '@brand-studio/ui';

const sizes = [
  { value: '250', label: '250 g' },
  { value: '500', label: '500 g' },
  { value: '1000', label: '1 kg' },
];

export default function SelectControlled() {
  const [size, setSize] = useState('500');
  return (
    <div style={{ width: '100%', maxWidth: 280, display: 'grid', gap: 12 }}>
      <Select label="Bag size" options={sizes} value={size} onValueChange={setSize} />
      <p style={{ margin: 0, color: 'var(--bs-muted)' }}>Selected: {size} g</p>
    </div>
  );
}
