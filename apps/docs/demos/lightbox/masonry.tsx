import { Lightbox } from '@brand-studio/ui';
import { beans, cameraViews, cameraWides, cup, pour } from '@/demos/assets';

export default function LightboxMasonryDemo() {
  return (
    <div style={{ width: '100%', maxWidth: 720, padding: '32px 0' }}>
      <Lightbox layout="masonry" label="Contact sheet" images={[cup, cameraViews[0], cameraWides[1], beans, cameraViews[3], pour, cameraWides[0], cameraViews[5]]} />
    </div>
  );
}
