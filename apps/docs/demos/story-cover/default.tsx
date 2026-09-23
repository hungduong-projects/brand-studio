import { ActionLink, StoryCover } from '@brand-studio/ui';
import { pour } from '@/demos/assets';

export default function StoryCoverDemo() {
  return (
    <div style={{ width: '100%', padding: '48px clamp(16px, 6vw, 64px)', background: `url(${pour.src}) center / cover` }}>
      <StoryCover
        kicker="Still Coffee"
        title="Three plates"
        lead="How one cup is made, from the bean to the first sip."
        chapters={[
          { label: 'The bean', href: '#beans', marker: 'I' },
          { label: 'The pour', href: '#pour', marker: 'II' },
          { label: 'The cup', href: '#cup', marker: 'III' },
        ]}
        actions={<><ActionLink href="#beans" shape="pill">Start reading</ActionLink><ActionLink href="#menu" tone="inverse" shape="pill">See the menu</ActionLink></>}
      />
    </div>
  );
}
