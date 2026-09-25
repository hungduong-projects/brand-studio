import { Button, ShaderBackground } from '@brand-studio/ui';

export default function ShaderBackgroundDemo() {
  return (
    <ShaderBackground style={{ width: '100%', maxWidth: 640, borderRadius: 16, padding: '56px 32px', border: '1px solid var(--bs-line-soft)' }}>
      <p style={{ margin: '0 0 8px', fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase' }}>Autumn lot · Huila</p>
      <h3 style={{ margin: '0 0 20px', fontSize: 'clamp(28px, 5vw, 44px)', maxWidth: 420 }}>Stone fruit, brown sugar, a long finish.</h3>
      <Button>Reserve a bag</Button>
    </ShaderBackground>
  );
}
