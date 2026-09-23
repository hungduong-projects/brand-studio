import { Switch } from '@brand-studio/ui';

export default function SwitchDescription() {
  return (
    <div style={{ display: 'grid', gap: 20, maxWidth: 360 }}>
      <Switch label="Weekly digest" description="One email on Monday with new roasts." />
      <Switch label="Text messages" description="Not available in your region yet." disabled />
    </div>
  );
}
