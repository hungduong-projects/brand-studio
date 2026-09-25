import { DotGlobe } from '@brand-studio/ui';

const origins = [
  { label: 'Huila, Colombia', lat: 2.5, lng: -75.6 },
  { label: 'Cerrado, Brazil', lat: -18.9, lng: -47 },
  { label: 'Sidama, Ethiopia', lat: 6.7, lng: 38.5 },
  { label: 'Kirinyaga, Kenya', lat: -0.5, lng: 37.3 },
  { label: 'The roastery, London', lat: 51.5, lng: -0.1 },
];

export default function DotGlobeDemo() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 24, width: '100%', maxWidth: 820 }}>
      <div style={{ flex: '1 1 260px' }}>
        <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--bs-muted)' }}>Where this season’s lots come from</p>
        <h3 style={{ margin: '0 0 12px', fontSize: 'clamp(26px, 5vw, 40px)' }}>Four farms, one roastery.</h3>
        <p style={{ margin: 0, color: 'var(--bs-muted)' }}>Each lot travels green to London and is roasted the week it ships. Drag the globe to follow the route.</p>
      </div>
      <div style={{ flex: '1 1 300px', display: 'grid', placeItems: 'center' }}>
        <DotGlobe label="Origins and roastery" markers={origins} />
      </div>
    </div>
  );
}
