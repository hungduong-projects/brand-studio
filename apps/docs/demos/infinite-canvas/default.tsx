import { InfiniteCanvas } from '@brand-studio/ui';
import { beans, cameraViews, cup, pour } from '@/demos/assets';

export default function InfiniteCanvasDemo() {
  return (
    <div style={{ width: '100%' }}>
      <InfiniteCanvas label="Halden archive" images={[cup, cameraViews[0], beans, cameraViews[2], pour, cameraViews[3], cameraViews[1], cameraViews[4], cameraViews[5]]} />
    </div>
  );
}
