import { Button, ParticleField } from '@brand-studio/ui';

export default function ParticleFieldDemo() {
  return (
    <ParticleField style={{ width: '100%', maxWidth: 720, padding: '72px 32px', borderRadius: 20, border: '1px solid var(--bs-line-soft)', textAlign: 'center' }}>
      <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--bs-muted)' }}>Night mode, new in firmware 2.1</p>
      <h3 style={{ margin: '0 auto 20px', fontSize: 'clamp(26px, 5vw, 40px)', maxWidth: 460 }}>Shoot by starlight.</h3>
      <Button tone="secondary">See the night samples</Button>
    </ParticleField>
  );
}
