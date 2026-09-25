import Link from 'next/link';
import { pageOrder } from '@/lib/catalog';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const arrow = (direction: 'left' | 'right') => direction === 'left' ? <ArrowLeft aria-hidden="true" size={16} /> : <ArrowRight aria-hidden="true" size={16} />;

function neighbours(href: string) {
  const index = pageOrder.findIndex((page) => page.href === href);
  return { previous: pageOrder[index - 1], next: pageOrder[index + 1] };
}

/** Small arrow buttons beside the page title. */
export function PagerArrows({ href }: { href: string }) {
  const { previous, next } = neighbours(href);
  return <div className="pager-arrows">
    {previous ? <Link href={previous.href} className="icon-button" aria-label={`Previous: ${previous.title}`}>{arrow('left')}</Link> : <span className="icon-button" aria-hidden="true" data-disabled>{arrow('left')}</span>}
    {next ? <Link href={next.href} className="icon-button" aria-label={`Next: ${next.title}`}>{arrow('right')}</Link> : <span className="icon-button" aria-hidden="true" data-disabled>{arrow('right')}</span>}
  </div>;
}

export function Pager({ href }: { href: string }) {
  const { previous, next } = neighbours(href);
  return <nav className="pager" aria-label="Pages">
    {previous && <Link href={previous.href} rel="prev">{arrow('left')}{previous.title}</Link>}
    {next && <Link href={next.href} rel="next" className="pager__next">{next.title}{arrow('right')}</Link>}
  </nav>;
}
