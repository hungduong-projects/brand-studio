import { MagnetTabs } from '@brand-studio/ui';

export default function MagnetTabsPanels() {
  return (
    <div style={{ width: '100%', maxWidth: 420 }}>
      <MagnetTabs
        aria-label="Plan"
        items={[
          { value: 'monthly', label: 'Monthly', content: <p>One bag every four weeks. Pause any time.</p> },
          { value: 'fortnightly', label: 'Fortnightly', content: <p>One bag every two weeks, with free delivery.</p> },
          { value: 'weekly', label: 'Weekly', content: <p>For offices and big households.</p> },
        ]}
      />
    </div>
  );
}
