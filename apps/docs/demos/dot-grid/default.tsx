import { Button, DotGrid } from '@brand-studio/ui';

export default function DotGridDemo() {
  return (
    <DotGrid style={{ width: '100%', maxWidth: 720, padding: '64px 32px', borderRadius: 20, border: '1px solid var(--bs-line-soft)', background: 'var(--bs-elevated)' }}>
      <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--bs-muted)' }}>Halden developer kit</p>
      <h3 style={{ margin: '0 0 20px', fontSize: 'clamp(26px, 5vw, 40px)', maxWidth: 440 }}>Every dial, open to your own code.</h3>
      <Button>Read the API</Button>
    </DotGrid>
  );
}
