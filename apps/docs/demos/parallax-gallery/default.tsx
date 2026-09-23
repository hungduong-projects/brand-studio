import { ParallaxGallery } from '@brand-studio/ui';
import { beans, cup, pour } from '@/demos/assets';

export default function ParallaxGalleryDemo() {
  return (
    <div style={{ width: '100%', padding: '48px 0' }}>
      <ParallaxGallery images={[cup, beans, pour, beans, pour, cup, pour, cup, beans]} />
    </div>
  );
}
