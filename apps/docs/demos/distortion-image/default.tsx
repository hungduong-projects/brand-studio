import { DistortionImage } from '@brand-studio/ui';
import { cup } from '@/demos/assets';

export default function DistortionImageDemo() {
  return (
    <figure style={{ width: '100%', maxWidth: 560, margin: 0 }}>
      <DistortionImage asset={cup} sizes="560px" className="demo-distort" />
      <figcaption style={{ marginTop: 12, fontSize: 14, color: 'var(--bs-muted)' }}>The cobalt cup. Move the pointer across it.</figcaption>
      <style>{'.demo-distort { aspect-ratio: 4 / 3; }'}</style>
    </figure>
  );
}
