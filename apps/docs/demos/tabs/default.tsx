import { Tabs } from '@brand-studio/ui';

export default function TabsDemo() {
  return (
    <div style={{ width: '100%', maxWidth: 440 }}>
      <Tabs
        aria-label="Brew guide"
        items={[
          { value: 'pour', label: 'Pour over', content: <p>15 g coffee to 250 g water. Bloom for 30 seconds, then pour slowly.</p> },
          { value: 'press', label: 'French press', content: <p>30 g coarse coffee to 500 g water. Steep for four minutes.</p> },
          { value: 'cold', label: 'Cold brew', content: <p>100 g coarse coffee to 1 litre of cold water. Rest overnight.</p> },
        ]}
      />
    </div>
  );
}
