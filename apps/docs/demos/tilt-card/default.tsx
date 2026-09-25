import { BrandImage, Button, TiltCard } from '@brand-studio/ui';
import { cameraViews } from '@/demos/assets';

export default function TiltCardDemo() {
  return (
    <TiltCard style={{ width: '100%', maxWidth: 320 }}>
      <BrandImage asset={cameraViews[0]} sizes="320px" className="demo-tilt-image" />
      <div style={{ padding: '16px 20px 20px' }}>
        <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--bs-muted)' }}>Halden R · Graphite</p>
        <p style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 600 }}>£1,890</p>
        <Button shape="pill" style={{ width: '100%' }}>Add to bag</Button>
      </div>
      <style>{'.demo-tilt-image { aspect-ratio: 1; }'}</style>
    </TiltCard>
  );
}
