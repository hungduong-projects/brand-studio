'use client';

import { usePathname } from 'next/navigation';
import { catalog, componentHref } from '@/lib/catalog';

const links = [
  { href: '/docs/', label: 'Docs', match: (path: string) => path.startsWith('/docs') && !path.startsWith('/docs/components') && !path.startsWith('/docs/theming') },
  { href: componentHref(catalog[0].slug), label: 'Components', match: (path: string) => path.startsWith('/docs/components') },
  { href: '/docs/theming/', label: 'Theming', match: (path: string) => path.startsWith('/docs/theming') },
];

export function MainNav() {
  const path = usePathname();
  return <nav aria-label="Main" className="main-nav">
    {links.map((link) => <a key={link.label} href={link.href} aria-current={link.match(path) ? 'page' : undefined}>{link.label}</a>)}
  </nav>;
}
