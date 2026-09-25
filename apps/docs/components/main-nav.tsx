'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { catalog, componentHref } from '@/lib/catalog';

const links = [
  { href: '/docs/', label: 'Docs', match: (path: string) => path.startsWith('/docs') && !path.startsWith('/docs/components') && !path.startsWith('/docs/theming') },
  { href: componentHref(catalog[0].slug), label: 'Components', match: (path: string) => path.startsWith('/docs/components') },
  { href: '/docs/theming/', label: 'Theming', match: (path: string) => path.startsWith('/docs/theming') },
  // The examples are a separate app copied into /examples/, so this nav never renders on them.
  { href: '/examples/', label: 'Examples', match: () => false },
];

export function MainNav() {
  const path = usePathname();
  return <nav aria-label="Main" className="main-nav">
    {links.map((link) => {
      const props = { href: link.href, 'aria-current': link.match(path) ? 'page' as const : undefined, children: link.label };
      // /examples/ is a separate app, so it needs a full page load.
      return link.href.startsWith('/examples') ? <a key={link.label} {...props} /> : <Link key={link.label} {...props} />;
    })}
  </nav>;
}
