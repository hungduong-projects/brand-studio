import { VideoText } from '@brand-studio/ui';

export default function VideoTextDemo() {
  return (
    <div style={{ width: '100%', maxWidth: 760 }}>
      <VideoText as="h3" text="HALDEN R" src="/videos/halden-macro.mp4" className="demo-videotext" />
      <p style={{ margin: '8px 0 0', color: 'var(--bs-muted)' }}>Brass, leather and one fixed lens. Ships 14 October.</p>
      <style>{'.demo-videotext { margin: 0; font-size: clamp(44px, 12.5vw, 116px); white-space: nowrap; font-weight: 800; line-height: .9; letter-spacing: -.05em; }'}</style>
    </div>
  );
}
