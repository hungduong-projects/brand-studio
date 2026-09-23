"use client";

import { useEffect, useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { CSSProperties, ElementType, PointerEvent, ReactNode } from 'react';
import { BrandImage } from './core.js';
import type { ImageAsset, StoryChapter } from './core.js';

/** Images in three columns that drift at different speeds while the page scrolls. Without scroll-driven animation support it is a still grid. */
export function ParallaxGallery({ images, className = '' }: { images: ImageAsset[]; className?: string }) {
  const columns: ImageAsset[][] = [[], [], []];
  images.forEach((image, index) => columns[index % 3].push(image));
  return <div className={`bs-parallax ${className}`}>
    {columns.map((column, index) => <div key={index} className="bs-parallax__column" data-column={index}>
      {column.map(image => <BrandImage key={image.src + image.alt} asset={image} sizes="(min-width: 768px) 33vw, 100vw" />)}
    </div>)}
  </div>;
}

/** Vertical scroll moves chapters sideways on wide screens. On phones and with reduced motion it becomes a swipeable row. */
export function HorizontalStory({ title, chapters, className = '' }: { title: string; chapters: StoryChapter[]; className?: string }) {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLOListElement>(null);
  const [enhanced, setEnhanced] = useState(false);
  const headingId = useId();

  useEffect(() => {
    const section = root.current;
    const row = track.current;
    if (!section || !row) return;
    const media = window.matchMedia('(min-width: 900px) and (prefers-reduced-motion: no-preference)');
    let frame = 0;
    const update = () => {
      frame = 0;
      const length = Math.max(row.scrollWidth - row.clientWidth, 0);
      section.style.setProperty('--bs-hstory-length', `${length}px`);
      const progress = length ? Math.min(Math.max(-section.getBoundingClientRect().top / length, 0), 1) : 0;
      row.style.transform = `translateX(${-progress * length}px)`;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const configure = () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      setEnhanced(media.matches);
      if (!media.matches) { row.style.transform = ''; section.style.removeProperty('--bs-hstory-length'); return; }
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
      schedule();
    };
    configure();
    media.addEventListener('change', configure);
    return () => { cancelAnimationFrame(frame); media.removeEventListener('change', configure); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); };
  }, [chapters]);

  return <section ref={root} className={`bs-hstory ${className}`} data-enhanced={enhanced} aria-labelledby={headingId}>
    <div className="bs-hstory__pin">
      <h2 id={headingId} className="bs-hstory__title">{title}</h2>
      <ol ref={track} className="bs-hstory__track" tabIndex={enhanced ? undefined : 0} aria-label={enhanced ? undefined : `${title}, scroll sideways`}>
        {chapters.map((chapter, index) => <li key={chapter.id} id={chapter.id} className="bs-hstory__panel">
          <BrandImage asset={chapter.asset} sizes="(min-width: 900px) 45vw, 85vw" />
          <p className="bs-hstory__label">{chapter.label ?? String(index + 1).padStart(2, '0')}</p>
          <h3>{chapter.title}</h3>
          <p>{chapter.body}</p>
        </li>)}
      </ol>
    </div>
  </section>;
}

interface TrailImage { id: number; x: number; y: number; image: ImageAsset }

/** Moving a mouse over the area leaves a fading trail of images. Decorative; touch and reduced motion show only the content. */
export function ImageTrail({ images, children, spacing = 90, className = '' }: { images: ImageAsset[]; children?: ReactNode; spacing?: number; className?: string }) {
  const [trail, setTrail] = useState<TrailImage[]>([]);
  const last = useRef<{ x: number; y: number } | null>(null);
  const count = useRef(0);
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || !images.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    if (last.current && Math.hypot(x - last.current.x, y - last.current.y) < spacing) return;
    last.current = { x, y };
    const item = { id: count.current, x, y, image: images[count.current % images.length] };
    count.current += 1;
    setTrail(current => [...current.slice(-11), item]);
    window.setTimeout(() => setTrail(current => current.filter(entry => entry.id !== item.id)), 900);
  };
  return <div className={`bs-trail ${className}`} onPointerMove={move} onPointerLeave={() => { last.current = null; }}>
    <div className="bs-trail__images" aria-hidden="true">
      {trail.map(entry => <img key={entry.id} src={entry.image.src} alt="" width={entry.image.width} height={entry.image.height} style={{ left: entry.x, top: entry.y }} />)}
    </div>
    <div className="bs-trail__content">{children}</div>
  </div>;
}

/** Words brighten one by one as the paragraph scrolls through the viewport. Without support or with reduced motion the text is fully shown. */
export function ScrollTextReveal({ text, as: Tag = 'p', className = '' }: { text: string; as?: ElementType; className?: string }) {
  const words = text.split(/(\s+)/);
  const total = words.filter(word => word.trim()).length;
  let index = 0;
  return <Tag className={`bs-reveal ${className}`}>
    {words.map((word, position) => word.trim()
      ? <span key={position} className="bs-reveal__word" style={{ '--bs-reveal-at': (index++ / Math.max(total, 1)).toFixed(4) } as CSSProperties}>{word}</span>
      : word)}
  </Tag>;
}

export interface StoryCoverChapter { label: ReactNode; href: string; marker?: ReactNode }

/** The framed title card that opens a long page: kicker, title, one line of promise, the chapter list and actions. Made to sit over a picture. */
export function StoryCover({ kicker, title, lead, chapters = [], actions, label = 'Chapters', id, className = '' }: { kicker?: ReactNode; title: ReactNode; lead?: ReactNode; chapters?: StoryCoverChapter[]; actions?: ReactNode; label?: string; id?: string; className?: string }) {
  return <div id={id} className={`bs-cover ${className}`}>
    {kicker && <p className="bs-cover__kicker">{kicker}</p>}
    <h1 className="bs-cover__title">{title}</h1>
    {lead && <p className="bs-cover__lead">{lead}</p>}
    {chapters.length > 0 && <nav aria-label={label}><ol className="bs-cover__index">
      {chapters.map(chapter => <li key={chapter.href}><a href={chapter.href}><span>{chapter.label}</span>{chapter.marker && <span className="bs-cover__marker">{chapter.marker}</span>}</a></li>)}
    </ol></nav>}
    {actions && <div className="bs-cover__actions">{actions}</div>}
  </div>;
}

/**
 * The chapter list that docks at the side of a wide screen once the reader scrolls past the Story Cover, and lights the
 * chapter being read. It docks when the first chapter reaches the middle of the screen or a quarter of the cover has
 * scrolled away. Pass the cover's id as `cover`: where the browser supports view transitions, the cover's list moves into
 * the rail. The rail leaves once the last chapter ends. With `placement="inline"` it stays where you put it,
 * such as a sticky side column, and only lights the current chapter.
 */
export function ChapterRail({ chapters, cover, title, placement = 'fixed', label = 'Chapters', className = '' }: { chapters: StoryCoverChapter[]; cover?: string; title?: ReactNode; placement?: 'fixed' | 'inline'; label?: string; className?: string }) {
  const [show, setShow] = useState(false);
  const [current, setCurrent] = useState('');
  // Callers often build the list inline, so the effects key on the targets rather than the array.
  const ids = chapters.map(chapter => chapter.href.slice(1)).join(' ');
  useEffect(() => {
    const targets = ids.split(' ').map(id => document.getElementById(id)).filter((target): target is HTMLElement => target !== null);
    if (targets.length === 0) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) setCurrent(entry.target.id); }), { rootMargin: '-45% 0px -50% 0px' });
    targets.forEach(target => observer.observe(target));
    return () => observer.disconnect();
  }, [ids]);
  useEffect(() => {
    if (placement === 'inline' || !ids) return;
    const list = ids.split(' ');
    const first = document.getElementById(list[0]);
    const last = document.getElementById(list[list.length - 1]);
    const source = (cover && document.getElementById(cover)) || first;
    if (!source || !first || !last) return;
    const docking = source.classList.contains('bs-cover');
    if (docking) source.dataset.bsDockSource = '';
    let shown: boolean | undefined;
    const update = () => {
      // Dock once the first chapter reaches the middle of the screen, or once a quarter of the cover has scrolled away.
      const past = first.getBoundingClientRect().top < innerHeight / 2 || (docking && source.getBoundingClientRect().top < -source.offsetHeight * 0.25);
      const next = past && last.getBoundingClientRect().bottom > innerHeight / 2;
      if (next === shown) return;
      const initial = shown === undefined;
      shown = next;
      const dock = () => { if (docking) source.toggleAttribute('data-bs-docked', next); };
      const move = !initial && docking && matchMedia('(min-width: 1100px) and (prefers-reduced-motion: no-preference)').matches;
      // A newer transition skips an older one; its update still runs, so the rail and the cover stay in step.
      if (move && document.startViewTransition) document.startViewTransition(() => { flushSync(() => setShow(next)); dock(); }).ready.catch(() => {});
      else { setShow(next); dock(); }
    };
    update();
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    return () => {
      removeEventListener('scroll', update);
      removeEventListener('resize', update);
      if (docking) { delete source.dataset.bsDockSource; source.removeAttribute('data-bs-docked'); }
    };
  }, [ids, cover, placement]);
  return <nav className={`bs-rail ${className}`} aria-label={label} data-placement={placement} data-show={placement === 'inline' || show || undefined}>
    {title && <p className="bs-rail__title">{title}</p>}
    <ol className="bs-rail__list">
      {chapters.map(chapter => <li key={chapter.href}><a href={chapter.href} aria-current={current === chapter.href.slice(1) ? 'true' : undefined}>
        {chapter.marker && <span className="bs-rail__marker">{chapter.marker}</span>}<span className="bs-rail__label">{chapter.label}</span>
      </a></li>)}
    </ol>
  </nav>;
}
