import { ProximityText } from '@brand-studio/ui';

export default function ProximityTextDemo() {
  return (
    <div style={{ width: '100%', maxWidth: 640 }}>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--bs-muted)' }}>Halden journal · Issue 04</p>
      <ProximityText as="h3" text="Made to be carried, not kept." className="demo-proximity" />
      <style>{'.demo-proximity { margin: 0; font-size: clamp(34px, 7vw, 64px); line-height: 1.05; letter-spacing: -.03em; }'}</style>
    </div>
  );
}
