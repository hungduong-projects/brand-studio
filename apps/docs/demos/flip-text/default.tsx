import { FlipText } from '@brand-studio/ui';

export default function FlipTextDemo() {
  return (
    <h2 style={{ margin: 0, fontSize: 'clamp(28px, 5vw, 48px)', textAlign: 'center' }}>
      Coffee for <FlipText words={['slow mornings', 'long drives', 'late shifts', 'good company']} />
    </h2>
  );
}
