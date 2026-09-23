import { Button } from '@brand-studio/ui';

export default function ButtonInverse() {
  return (
    <div style={{ padding: 32, borderRadius: 12, background: 'var(--bs-accent)' }}>
      <Button tone="inverse">Book a table</Button>
    </div>
  );
}
