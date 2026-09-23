import type { ReactNode } from 'react';
import { Sidebar } from '@/components/sidebar';

export default function DocsLayout({ children }: { children: ReactNode }) {
  return <div className="docs-shell">
    <aside className="sidebar">
      <Sidebar />
    </aside>
    {children}
  </div>;
}
