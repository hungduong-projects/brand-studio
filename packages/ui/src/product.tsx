"use client";

import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useEntrance } from './entrance.js';

export interface Highlight { media: ReactNode; caption: ReactNode }

/**
 * A row of large slides that plays by itself while it is on screen. The pill under it shows which slide is up and how
 * long it has left, and has a pause button. It starts paused when the reader prefers reduced motion.
 */
export function HighlightsGallery({ title, items, interval = 6000, label = 'Highlights', className = '' }: { title?: ReactNode; items: Highlight[]; interval?: number; label?: string; className?: string }) {
  const track = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const [held, setHeld] = useState(false);
  const running = playing && visible && !held && items.length > 1;

  const show = useCallback((next: number) => {
    const list = track.current;
    const slide = list?.children[next] as HTMLElement | undefined;
    if (!list || !slide) return;
    list.scrollTo({ left: slide.offsetLeft - list.offsetLeft - (list.clientWidth - slide.clientWidth) / 2, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    setIndex(next);
  }, []);

  useEffect(() => { if (matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(false); }, []);
  useEffect(() => {
    const list = track.current;
    if (!list) return;
    const seen = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.5 });
    seen.observe(list);
    // Keep the dots in step when the reader swipes the row by hand.
    const slides = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) setIndex([...list.children].indexOf(entry.target));
    }), { root: list, threshold: 0.6 });
    [...list.children].forEach(child => slides.observe(child));
    return () => { seen.disconnect(); slides.disconnect(); };
  }, [items.length]);
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => show((index + 1) % items.length), interval);
    return () => clearTimeout(timer);
  }, [running, index, interval, items.length, show]);

  return <section className={`bs-highlights ${className}`} aria-label={typeof title === 'string' ? title : label}
    onPointerEnter={() => setHeld(true)} onPointerLeave={() => setHeld(false)}
    onFocus={() => setHeld(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setHeld(false); }}>
    {title && <h2 className="bs-highlights__title">{title}</h2>}
    <ul ref={track} className="bs-highlights__track">
      {items.map((item, i) => <li key={i} className="bs-highlights__slide" aria-hidden={i !== index || undefined}>
        <div className="bs-highlights__media">{item.media}</div>
        <p className="bs-highlights__caption">{item.caption}</p>
      </li>)}
    </ul>
    {items.length > 1 && <div className="bs-highlights__controls">
      <div className="bs-highlights__dots" role="group" aria-label={`${label}: choose a slide`}>
        {items.map((_, i) => <button key={i} type="button" className="bs-highlights__dot" aria-label={`Slide ${i + 1} of ${items.length}`} aria-current={i === index || undefined}
          data-running={i === index && running || undefined} style={{ '--bs-highlight-time': `${interval}ms` } as CSSProperties} onClick={() => show(i)}>
          <span aria-hidden="true" />
        </button>)}
      </div>
      <button type="button" className="bs-highlights__play" aria-label={playing ? `Pause ${label}` : `Play ${label}`} onClick={() => setPlaying(!playing)}>
        <svg viewBox="0 0 16 16" aria-hidden="true">{playing ? <path d="M5 3.5v9M11 3.5v9" /> : <path d="M5.5 3.5v9l7-4.5z" />}</svg>
      </button>
    </div>}
  </section>;
}

export interface ViewerItem { value: string; label: string; media: ReactNode; caption?: ReactNode }

/** A large stage for one product image at a time, with pill tabs under it to switch between views. */
export function ProductViewer({ title, items, defaultValue, label = 'Views', className = '' }: { title?: ReactNode; items: ViewerItem[]; defaultValue?: string; label?: string; className?: string }) {
  return <section className={`bs-viewer ${className}`}>
    {title && <h2 className="bs-viewer__title">{title}</h2>}
    <BaseTabs.Root className="bs-viewer__root" defaultValue={defaultValue ?? items[0]?.value}>
      {items.map(item => <BaseTabs.Panel key={item.value} value={item.value} className="bs-viewer__panel">
        <div className="bs-viewer__media">{item.media}</div>
        {item.caption && <p className="bs-viewer__caption">{item.caption}</p>}
      </BaseTabs.Panel>)}
      <BaseTabs.List className="bs-viewer__tabs" aria-label={label}>
        {items.map(item => <BaseTabs.Tab key={item.value} value={item.value} className="bs-viewer__tab">{item.label}</BaseTabs.Tab>)}
        <BaseTabs.Indicator className="bs-viewer__indicator" />
      </BaseTabs.List>
    </BaseTabs.Root>
  </section>;
}

export interface CarouselCard { title: ReactNode; eyebrow?: ReactNode; body?: ReactNode; media?: ReactNode; href?: string }

/** A row of tall cards that scrolls sideways, with round previous and next buttons. Each card can link somewhere. */
export function CardCarousel({ title, cards, action, label, className = '' }: { title?: ReactNode; cards: CarouselCard[]; action?: ReactNode; label?: string; className?: string }) {
  const id = useId();
  const track = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const entrance = useEntrance<HTMLElement>();
  const measure = useCallback(() => {
    const list = track.current;
    if (!list) return;
    setEdge({ start: list.scrollLeft <= 4, end: list.scrollLeft + list.clientWidth >= list.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    measure();
    addEventListener('resize', measure);
    return () => removeEventListener('resize', measure);
  }, [measure]);
  const step = (direction: 1 | -1) => {
    const list = track.current;
    const card = list?.firstElementChild as HTMLElement | null;
    if (!list || !card) return;
    list.scrollBy({ left: direction * (card.offsetWidth + 20) * Math.max(1, Math.floor(list.clientWidth / (card.offsetWidth + 20))), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  return <section ref={entrance} className={`bs-carousel ${className}`} aria-labelledby={title ? `${id}-title` : undefined} aria-label={title ? undefined : label}>
    {(title || action) && <div className="bs-carousel__head">
      {title && <h2 id={`${id}-title`} className="bs-carousel__title">{title}</h2>}
      {action && <div className="bs-carousel__action">{action}</div>}
    </div>}
    <ul ref={track} className="bs-carousel__track" onScroll={measure}>
      {cards.map((card, i) => {
        const body = <>
          {card.eyebrow && <p className="bs-carousel__eyebrow">{card.eyebrow}</p>}
          <h3 className="bs-carousel__card-title">{card.title}</h3>
          {card.body && <p className="bs-carousel__body">{card.body}</p>}
          {card.media && <div className="bs-carousel__media">{card.media}</div>}
        </>;
        return <li key={i} className="bs-carousel__card" style={{ '--i': i } as CSSProperties}>{card.href ? <a href={card.href}>{body}</a> : body}</li>;
      })}
    </ul>
    <div className="bs-carousel__nav">
      <button type="button" aria-label="Previous cards" disabled={edge.start} onClick={() => step(-1)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m10 3-5 5 5 5" /></svg></button>
      <button type="button" aria-label="Next cards" disabled={edge.end} onClick={() => step(1)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg></button>
    </div>
  </section>;
}

export interface KeyFigure { lead?: ReactNode; value: ReactNode; unit?: ReactNode; detail: ReactNode }

/** Big numbers side by side, each under a thin rule with a short lead-in and what the number means. */
export function KeyFigures({ items, label, className = '' }: { items: KeyFigure[]; label?: string; className?: string }) {
  const entrance = useEntrance<HTMLUListElement>();
  return <ul ref={entrance} className={`bs-figures ${className}`} aria-label={label}>
    {items.map((item, i) => <li key={i} className="bs-figures__item" style={{ '--i': i } as CSSProperties}>
      {item.lead && <span className="bs-figures__lead">{item.lead}</span>}
      <strong className="bs-figures__value">{item.value}{item.unit && <small>{item.unit}</small>}</strong>
      <span className="bs-figures__detail">{item.detail}</span>
    </li>)}
  </ul>;
}

export interface CompareModel { name: string; media?: ReactNode; badge?: ReactNode; summary?: ReactNode; price?: ReactNode; action?: ReactNode; current?: boolean }
export interface CompareRow { label: string; icon?: ReactNode; values: (ReactNode | null)[] }

/** Models side by side: picture, name, price and action at the top, then one line per feature. A missing feature shows a dash. */
export function ModelCompare({ title, models, rows, currentLabel = 'Currently viewing', missingLabel = 'Not included', className = '' }: { title?: ReactNode; models: CompareModel[]; rows: CompareRow[]; currentLabel?: string; missingLabel?: string; className?: string }) {
  return <section className={`bs-compare ${className}`} style={{ '--bs-compare-count': models.length } as CSSProperties}>
    {title && <h2 className="bs-compare__title">{title}</h2>}
    <div className="bs-compare__grid">
      {models.map((model, m) => <article key={model.name} className="bs-compare__model" aria-label={model.name}>
        {model.media && <div className="bs-compare__media">{model.media}</div>}
        {model.badge && <p className="bs-compare__badge">{model.badge}</p>}
        <h3 className="bs-compare__name">{model.name}</h3>
        {model.summary && <p className="bs-compare__summary">{model.summary}</p>}
        {model.price && <p className="bs-compare__price">{model.price}</p>}
        {model.current ? <p className="bs-compare__current">{currentLabel}</p> : model.action && <div className="bs-compare__action">{model.action}</div>}
        <dl className="bs-compare__rows">
          {rows.map(row => <div key={row.label} className="bs-compare__row">
            <dt className={row.values[m] == null ? 'bs-sr-only' : undefined}>{row.label}</dt>
            <dd>{row.values[m] == null
              ? <><span aria-hidden="true">—</span><span className="bs-sr-only">{row.label}: {missingLabel}</span></>
              : <>{row.icon && <span className="bs-compare__icon" aria-hidden="true">{row.icon}</span>}{row.values[m]}</>}</dd>
          </div>)}
        </dl>
      </article>)}
    </div>
  </section>;
}

export interface FooterColumn { title: string; links: { label: string; href: string }[] }

/** The closing directory of a site: numbered fine print, a breadcrumb back up the site, link columns and a legal line. */
export function FooterDirectory({ breadcrumbs = [], columns, notes = [], legal, label = 'Site directory', className = '' }: { breadcrumbs?: { label: string; href: string }[]; columns: FooterColumn[]; notes?: ReactNode[]; legal?: ReactNode; label?: string; className?: string }) {
  const id = useId();
  return <footer className={`bs-directory ${className}`}>
    {notes.length > 0 && <ol className="bs-directory__notes">{notes.map((note, i) => <li key={i}>{note}</li>)}</ol>}
    {breadcrumbs.length > 0 && <nav aria-label="Breadcrumb" className="bs-directory__crumbs">
      <ol>{breadcrumbs.map((crumb, i) => <li key={i}><a href={crumb.href} aria-current={i === breadcrumbs.length - 1 ? 'page' : undefined}>{crumb.label}</a></li>)}</ol>
    </nav>}
    <nav aria-label={label} className="bs-directory__columns">
      {columns.map((column, i) => <div key={column.title} className="bs-directory__column">
        <h3 id={`${id}-${i}`}>{column.title}</h3>
        <ul aria-labelledby={`${id}-${i}`}>{column.links.map((link, i) => <li key={i}><a href={link.href}>{link.label}</a></li>)}</ul>
      </div>)}
    </nav>
    {legal && <div className="bs-directory__legal">{legal}</div>}
  </footer>;
}
