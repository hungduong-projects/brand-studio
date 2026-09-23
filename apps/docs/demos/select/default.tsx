import { Select } from '@brand-studio/ui';

const roasts = [
  { value: 'light', label: 'Light roast' },
  { value: 'medium', label: 'Medium roast' },
  { value: 'dark', label: 'Dark roast' },
  { value: 'decaf', label: 'Decaf', disabled: true },
];

export default function SelectDemo() {
  return (
    <div style={{ width: '100%', maxWidth: 280 }}>
      <Select label="Roast" options={roasts} placeholder="Choose a roast" />
    </div>
  );
}
