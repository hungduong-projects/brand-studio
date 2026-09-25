import { ScrambleText } from '@brand-studio/ui';

export default function ScrambleTextDemo() {
  return (
    <div style={{ width: '100%', maxWidth: 560 }}>
      <ScrambleText as="p" text="LOT 27 · HUILA · WASHED" className="demo-scramble" />
      <h3 style={{ margin: '12px 0 8px', fontSize: 'clamp(26px, 5vw, 40px)' }}>Stone fruit and brown sugar.</h3>
      <p style={{ margin: 0, color: 'var(--bs-muted)' }}>Roasted on Monday, in your cup by Friday. Hover the lot line to play it again.</p>
      <style>{'.demo-scramble { margin: 0; font: 600 13px/1.4 ui-monospace, Menlo, monospace; letter-spacing: .12em; color: var(--bs-accent); }'}</style>
    </div>
  );
}
