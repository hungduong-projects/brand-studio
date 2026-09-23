import { SiteBar } from '@brand-studio/ui';

const shop = [{ label: 'Buy a camera', href: '#buy' }, { label: 'Compare kits', href: '#compare' }, { label: 'Straps and cases', href: '#straps' }];

export default function SiteBarDemo() {
  // The transform keeps the menu's page curtain inside this frame instead of the docs page.
  return (
    <div style={{ position: 'relative', width: '100%', height: 340, overflow: 'hidden', transform: 'translateZ(0)' }}>
      <SiteBar
        brand={<a href="#">Halden</a>}
        items={[
          { label: 'Cameras', href: '#cameras', current: true, menu: [{ label: 'Explore cameras', links: [{ label: 'Halden R', href: '#r' }, { label: 'Halden S', href: '#s' }] }, { label: 'Shop', links: shop }] },
          { label: 'Lenses', href: '#lenses', menu: [{ label: 'Explore lenses', links: [{ label: '35 mm ƒ/2', href: '#35' }, { label: '50 mm ƒ/1.4', href: '#50' }] }, { label: 'Shop', links: shop }] },
          { label: 'Film', href: '#film' },
          { label: 'Service', href: '#service' },
        ]}
        actions={<a href="#bag">Bag</a>}
      />
      <p style={{ padding: '3rem 1.5rem', margin: 0, color: 'var(--bs-muted)' }}>Hover Cameras or Lenses, or tab to the arrow beside them and press Enter.</p>
    </div>
  );
}
