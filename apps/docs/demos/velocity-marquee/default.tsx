import { VelocityMarquee } from '@brand-studio/ui';

export default function VelocityMarqueeDemo() {
  return (
    <div style={{ width: '100%', padding: '48px 0' }}>
      <VelocityMarquee lines={['Single origin', 'Roasted every Monday', 'Shipped on Friday']} />
    </div>
  );
}
