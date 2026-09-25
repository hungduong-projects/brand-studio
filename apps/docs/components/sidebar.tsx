'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { catalog, categories, componentHref, guideHref, guides } from '@/lib/catalog';
import { GroupHeading } from './category-icon';

export function Sidebar() {
  const pathname = usePathname();
  const nav = useRef<HTMLElement>(null);
  // Keep the current page in view when the docs are opened on a deep link.
  useEffect(() => { nav.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' }); }, [pathname]);
  const link = (href: string, title: string) => <li key={href}><Link href={href} aria-current={pathname === href || pathname === href.replace(/\/$/, '') ? 'page' : undefined}>{title}</Link></li>;
  return <nav ref={nav} aria-label="Docs" className="sidebar__nav">
    <div className="sidebar__group"><GroupHeading name="Getting Started" /><ul>{guides.map((guide) => link(guideHref(guide.slug), guide.title))}</ul></div>
    {categories.map((category) => <div key={category} className="sidebar__group">
      <GroupHeading name={category} />
      <ul>{catalog.filter((entry) => entry.category === category).map((entry) => link(componentHref(entry.slug), entry.title))}</ul>
    </div>)}
  </nav>;
}
