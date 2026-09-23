import { ImageTrail } from '@brand-studio/ui';
import { beans, cup, pour } from '@/demos/assets';

export default function ImageTrailDemo() {
  return (
    <ImageTrail images={[cup, beans, pour]} className="demo-trail">
      <p style={{ margin: 0, fontSize: 'clamp(28px, 5vw, 56px)', fontWeight: 600, textAlign: 'center' }}>Move your mouse here.</p>
    </ImageTrail>
  );
}
