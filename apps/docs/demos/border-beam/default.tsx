import { BorderBeam, Button } from '@brand-studio/ui';

export default function BorderBeamDemo() {
  return (
    <BorderBeam style={{ width: '100%', maxWidth: 360, padding: 24, background: 'var(--bs-elevated)', border: '1px solid var(--bs-line)' }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>Roaster’s pick</h3>
      <p style={{ margin: '0 0 20px', color: 'var(--bs-muted)' }}>A new lot every month, chosen by the people who roast it.</p>
      <Button>Subscribe</Button>
    </BorderBeam>
  );
}
