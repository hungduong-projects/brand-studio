import { StaggerGrid } from '@brand-studio/ui';
import { beans, cameraViews, cup, pour } from '@/demos/assets';

export default function StaggerGridDemo() {
  return (
    <div style={{ width: '100%', padding: 24 }}>
      <StaggerGrid label="Halden field notes" images={[cameraViews[0], cup, cameraViews[2], beans, cameraViews[3], pour, cameraViews[4], cameraViews[5]]} />
    </div>
  );
}
