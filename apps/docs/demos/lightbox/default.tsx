import { Lightbox } from '@brand-studio/ui';
import { beans, cameraViews, cup, pour } from '@/demos/assets';

export default function LightboxDemo() {
  return (
    <div style={{ width: '100%', maxWidth: 720, padding: '32px 0' }}>
      <Lightbox label="Field notes" images={[cup, beans, pour, cameraViews[0], cameraViews[2], cameraViews[5]]} />
    </div>
  );
}
