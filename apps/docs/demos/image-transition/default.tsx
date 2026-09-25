import { ImageTransition } from '@brand-studio/ui';
import { beans, cup, pour } from '@/demos/assets';

export default function ImageTransitionDemo() {
  return (
    <div style={{ width: '100%', maxWidth: 720 }}>
      <ImageTransition label="The morning ritual" images={[beans, pour, cup]} />
    </div>
  );
}
