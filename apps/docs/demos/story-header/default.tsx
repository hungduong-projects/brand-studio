import { ActionLink, StoryHeader } from '@brand-studio/ui';
import { cup } from '@/demos/assets';

export default function StoryHeaderDemo() {
  // The transform keeps the fixed header inside this frame instead of the docs page.
  return (
    <div style={{ position: 'relative', width: '100%', height: 260, overflow: 'hidden', transform: 'translateZ(0)', background: `url(${cup.src}) center / cover` }}>
      <StoryHeader
        brand={<a href="#">Still</a>}
        items={[
          { label: 'Coffee', href: '#coffee' },
          { label: 'Brew guides', href: '#guides' },
        ]}
        current={{ label: 'The pour', href: '#pour', marker: 'II' }}
        actions={<ActionLink href="#visit" shape="pill">Visit</ActionLink>}
      />
    </div>
  );
}
