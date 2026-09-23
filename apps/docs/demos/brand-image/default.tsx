import { BrandImage } from '@brand-studio/ui';
import { cup } from '@/demos/assets';

export default function BrandImageDemo() {
  return (
    <div style={{ width: '100%', maxWidth: 560, aspectRatio: '3 / 2', borderRadius: 'var(--bs-radius)', overflow: 'hidden' }}>
      <BrandImage asset={cup} sizes="(min-width: 768px) 560px, 100vw" />
    </div>
  );
}
