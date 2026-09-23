import { Button } from '@brand-studio/ui';

export default function ButtonPill() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      <Button shape="pill">Start a trial</Button>
      <Button shape="pill" tone="secondary">See pricing</Button>
    </div>
  );
}
