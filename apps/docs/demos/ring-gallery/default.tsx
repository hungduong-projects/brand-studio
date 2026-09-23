import { RingGallery } from '@brand-studio/ui';
import { cameraViews } from '@/demos/assets';

export default function RingGalleryDemo() {
  return (
    <div style={{ width: '100%' }}>
      <RingGallery label="Halden R, every angle" images={[...cameraViews, ...cameraViews.slice(0, 2)]} />
    </div>
  );
}
