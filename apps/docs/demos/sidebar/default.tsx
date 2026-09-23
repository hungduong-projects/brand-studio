import { Sidebar } from '@brand-studio/ui';

const icon = (d: string) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;

export default function SidebarDemo() {
  return (
    <div style={{ width: 248, height: 380, border: '1px solid var(--bs-line-soft)', borderRadius: 12, overflow: 'hidden' }}>
      <Sidebar
        label="Roastery"
        header={<strong style={{ display: 'block', padding: '4px 10px' }}>Still Roastery</strong>}
        sections={[
          { items: [
            { label: 'Overview', href: '#overview', current: true, icon: icon('M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z') },
            { label: 'Orders', href: '#orders', badge: 12, icon: icon('M4 7h16l-1.5 11a2 2 0 0 1-2 1.7h-9a2 2 0 0 1-2-1.7ZM9 7V5a3 3 0 0 1 6 0v2') },
            { label: 'Subscribers', href: '#subscribers', icon: icon('M16 19a4 4 0 0 0-8 0M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6') },
          ] },
          { label: 'Stock', items: [
            { label: 'Green beans', href: '#beans', badge: 4, icon: icon('M12 3c4 3 4 15 0 18M12 3c-4 3-4 15 0 18') },
            { label: 'Roast log', href: '#log', icon: icon('M5 4h14v16H5zM9 8h6M9 12h6M9 16h3') },
          ] },
        ]}
        footer={<span style={{ fontSize: 13, color: 'var(--bs-muted)', padding: '0 10px' }}>Signed in as Mai</span>}
      />
    </div>
  );
}
