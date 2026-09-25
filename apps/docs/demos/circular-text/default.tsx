import { CircularText } from '@brand-studio/ui';
import { ArrowDown } from 'lucide-react';

export default function CircularTextDemo() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 32, width: '100%', maxWidth: 640 }}>
      <div style={{ flex: '1 1 260px' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 'clamp(26px, 5vw, 40px)' }}>Roasted Monday. Yours by Friday.</h3>
        <p style={{ margin: 0, color: 'var(--bs-muted)' }}>This month’s lot is a washed Huila with stone fruit and brown sugar.</p>
      </div>
      <a href="#lots" aria-label="See this month’s lots" style={{ color: 'var(--bs-accent)' }}>
        <CircularText text="This month’s lot · Scroll to taste · " size={132}>
          <ArrowDown size={28} aria-hidden="true" />
        </CircularText>
      </a>
    </div>
  );
}
