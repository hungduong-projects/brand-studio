'use client';

import { useState } from 'react';
import { Checkbox } from '@brand-studio/ui';

const bags = ['Ethiopia Guji', 'Colombia Huila', 'Kenya Nyeri'];

export default function CheckboxDemo() {
  const [picked, setPicked] = useState(['Ethiopia Guji']);
  const toggle = (bag: string, on: boolean) => setPicked((current) => (on ? [...current, bag] : current.filter((item) => item !== bag)));
  return (
    <div style={{ display: 'grid', gap: 14, maxWidth: 360 }}>
      <Checkbox
        label="All three bags"
        checked={picked.length === bags.length}
        indeterminate={picked.length > 0 && picked.length < bags.length}
        onCheckedChange={(on) => setPicked(on ? bags : [])}
      />
      <div style={{ display: 'grid', gap: 12, paddingLeft: 32 }}>
        {bags.map((bag) => <Checkbox key={bag} label={bag} checked={picked.includes(bag)} onCheckedChange={(on) => toggle(bag, on)} />)}
      </div>
    </div>
  );
}
