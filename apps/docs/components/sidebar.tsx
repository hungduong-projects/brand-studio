'use client';

import { usePathname } from 'next/navigation';
import { catalog, categories, componentHref, guideHref, guides } from '@/lib/catalog';

export function Sidebar() {
  const pathname = usePathname();
  const link = (href: string, title: string) => <li key={href}><a href={href} aria-current={pathname === href || pathname === href.replace(/\/$/, '') ? 'page' : undefined}>{title}</a></li>;
  return <nav aria-label="Docs" className="sidebar__nav">
    <div className="sidebar__group"><h2>Getting Started</h2><ul>{guides.map((guide) => link(guideHref(guide.slug), guide.title))}</ul></div>
    {categories.map((category) => <div key={category} className="sidebar__group">
      <h2>{category}</h2>
      <ul>{catalog.filter((entry) => entry.category === category).map((entry) => link(componentHref(entry.slug), entry.title))}</ul>
    </div>)}
  </nav>;
}
