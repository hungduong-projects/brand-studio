import { KeyFigures } from '@brand-studio/ui';

export default function KeyFiguresDemo() {
  return (
    <KeyFigures
      label="The camera in numbers"
      items={[
        { lead: 'Lens up to', value: 'ƒ/1.4', detail: 'Enough light for a room lit by one lamp.' },
        { lead: 'Shutter up to', value: '1/1000', unit: 's', detail: 'Set by a spring and a gear.' },
        { lead: 'Batteries', value: '0', detail: 'Cold and heat change nothing.' },
      ]}
    />
  );
}
