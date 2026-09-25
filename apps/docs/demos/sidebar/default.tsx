import { Sidebar } from '@brand-studio/ui';
import { BookOpen, Flame, LayoutDashboard, Package, Users } from 'lucide-react';

export default function SidebarDemo() {
  return (
    <div style={{ width: 248, height: 380, border: '1px solid var(--bs-line-soft)', borderRadius: 12, overflow: 'hidden' }}>
      <Sidebar
        label="Roastery"
        header={<strong style={{ display: 'block', padding: '4px 10px' }}>Still Roastery</strong>}
        sections={[
          { items: [
            { label: 'Overview', href: '#overview', current: true, icon: <LayoutDashboard /> },
            { label: 'Orders', href: '#orders', badge: 12, icon: <Package /> },
            { label: 'Subscribers', href: '#subscribers', icon: <Users /> },
          ] },
          { label: 'Stock', items: [
            { label: 'Green beans', href: '#beans', badge: 4, icon: <Flame /> },
            { label: 'Roast log', href: '#log', icon: <BookOpen /> },
          ] },
        ]}
        footer={<span style={{ fontSize: 13, color: 'var(--bs-muted)', padding: '0 10px' }}>Signed in as Mai</span>}
      />
    </div>
  );
}
