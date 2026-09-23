import { pageOrder } from '@/lib/catalog';

const arrow = (direction: 'left' | 'right') => <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={direction === 'left' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} /></svg>;

function neighbours(href: string) {
  const index = pageOrder.findIndex((page) => page.href === href);
  return { previous: pageOrder[index - 1], next: pageOrder[index + 1] };
}

/** Small arrow buttons beside the page title. */
export function PagerArrows({ href }: { href: string }) {
  const { previous, next } = neighbours(href);
  return <div className="pager-arrows">
    {previous ? <a href={previous.href} className="icon-button" aria-label={`Previous: ${previous.title}`}>{arrow('left')}</a> : <span className="icon-button" aria-hidden="true" data-disabled>{arrow('left')}</span>}
    {next ? <a href={next.href} className="icon-button" aria-label={`Next: ${next.title}`}>{arrow('right')}</a> : <span className="icon-button" aria-hidden="true" data-disabled>{arrow('right')}</span>}
  </div>;
}

export function Pager({ href }: { href: string }) {
  const { previous, next } = neighbours(href);
  return <nav className="pager" aria-label="Pages">
    {previous && <a href={previous.href} rel="prev">{arrow('left')}{previous.title}</a>}
    {next && <a href={next.href} rel="next" className="pager__next">{next.title}{arrow('right')}</a>}
  </nav>;
}
