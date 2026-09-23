'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export interface TocItem { title: ReactNode; url: string; depth: number }

/** "On This Page" with the section in view marked as current. */
export function Toc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState(items[0]?.url);
  useEffect(() => {
    const headings = items.map((item) => document.getElementById(item.url.slice(1))).filter((node): node is HTMLElement => !!node);
    const update = () => {
      const current = headings.filter((heading) => heading.getBoundingClientRect().top < 120).at(-1) ?? headings[0];
      if (current) setActive(`#${current.id}`);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [items]);
  if (!items.length) return null;
  return <nav aria-label="On this page" className="toc">
    <h2>On This Page</h2>
    <ul>{items.map((item) => <li key={item.url} data-depth={item.depth}><a href={item.url} aria-current={active === item.url ? 'location' : undefined}>{item.title}</a></li>)}</ul>
  </nav>;
}
