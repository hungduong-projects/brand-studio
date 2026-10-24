import { GlitchText } from '@brand-studio/ui';

export default function GlitchTextDemo() {
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 12, textAlign: 'center' }}>
      <div style={{ font: '800 clamp(5rem, 22vw, 9rem)/1 ui-monospace, SFMono-Regular, Menlo, monospace', letterSpacing: '-.04em' }}>
        <GlitchText text="404" />
      </div>
      <p style={{ margin: 0, color: 'var(--bs-muted)' }}>Lost signal. This page is not here.</p>
    </div>
  );
}
