import { ActionLink, ProductBar } from '@brand-studio/ui';

export default function ProductBarDemo() {
  return (
    <div style={{ width: '100%', height: 280, overflow: 'auto' }}>
      <ProductBar
        title="Halden R"
        items={[
          { label: 'Overview', href: '#overview', current: true },
          { label: 'Tech specs', href: '#specs' },
          { label: 'Compare', href: '#compare' },
        ]}
        action={<ActionLink href="#buy" shape="pill">Buy</ActionLink>}
      />
      <div style={{ padding: '2rem 1.5rem', height: 800, color: 'var(--bs-muted)' }}>Scroll this frame: the bar stays at the top.</div>
    </div>
  );
}
