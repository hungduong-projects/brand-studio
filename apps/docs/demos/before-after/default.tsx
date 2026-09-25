import { BeforeAfter } from '@brand-studio/ui';
import { pour, pourFlat } from '@/demos/assets';

export default function BeforeAfterDemo() {
  return (
    <figure style={{ width: '100%', maxWidth: 720, margin: 0 }}>
      <BeforeAfter label="Compare the flat profile with Halden colour" before={pourFlat} after={pour} beforeLabel="Flat" afterLabel="Halden colour" />
      <figcaption style={{ marginTop: 12, fontSize: 14, color: 'var(--bs-muted)' }}>Shot on the Halden R. Drag the handle to see the in-camera grade.</figcaption>
    </figure>
  );
}
