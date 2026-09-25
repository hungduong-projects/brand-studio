import { ScrollFormation } from '@brand-studio/ui';
import { beans, cameraViews, cup, pour } from '@/demos/assets';

export default function ScrollFormationDemo() {
  return (
    <ScrollFormation
      label="The Halden kit"
      title="Everything in the box, in its place."
      images={[cameraViews[0], cup, cameraViews[1], beans, cameraViews[2], pour, cameraViews[3], cameraViews[4], cameraViews[5]]}
    />
  );
}
