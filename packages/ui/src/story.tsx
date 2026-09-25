"use client";

import { useEffect, useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { CSSProperties, ElementType, PointerEvent, ReactNode } from 'react';
import { BrandImage } from './core.js';
import { useEntrance } from './entrance.js';
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

export interface Topic { id: string; label: string; detail: ReactNode; weight?: 1 | 2 | 3; links?: string[] }

/** Places topics on a sunflower spiral, heaviest first, so the biggest words sit near the middle. Percent of the map. */
function placeTopics(topics: Topic[]) {
  const order = topics.map((topic, index) => ({ topic, index })).sort((a, b) => (b.topic.weight ?? 1) - (a.topic.weight ?? 1) || a.index - b.index);
  const places = new Map<string, { x: number; y: number }>();
  order.forEach(({ topic }, i) => {
    const radius = Math.sqrt((i + 0.5) / order.length);
    const angle = i * 2.39996;
    places.set(topic.id, { x: Math.round((50 + 42 * radius * Math.cos(angle)) * 10) / 10, y: Math.round((50 + 40 * radius * Math.sin(angle)) * 10) / 10 });
  });
  return places;
}

/**
 * Related topics spread across a section at three sizes, joined by thin lines that draw in when the map scrolls into
 * view. Each word drifts a little. Choosing one opens its detail and brightens the topics it links to. Narrow screens
 * show a plain list.
 */
export function TopicMap({ topics, label = 'Topics', className = '' }: { topics: Topic[]; label?: string; className?: string }) {
  const id = useId();
  const map = useEntrance<HTMLDivElement>();
  const [open, setOpen] = useState<string | null>(null);
  const places = placeTopics(topics);
  const known = new Set(topics.map(topic => topic.id));
  const lines = topics.flatMap(topic => (topic.links ?? []).filter(link => known.has(link) && link !== topic.id).map(link => [topic.id, link] as const));
  const linked = new Set(open ? lines.flatMap(([a, b]) => a === open ? [b] : b === open ? [a] : []) : []);
  useEffect(() => {
    if (open === null) return;
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(null);
      document.getElementById(`${id}-${open}-button`)?.focus();
    };
    addEventListener('keydown', close);
    return () => removeEventListener('keydown', close);
  }, [open, id]);
  return <div ref={map} className={`bs-topics ${className}`} data-open={open ?? undefined}>
    <svg className="bs-topics__lines" aria-hidden="true">
      {lines.map(([a, b], i) => {
        const from = places.get(a)!, to = places.get(b)!;
        return <line key={`${a}-${b}`} x1={`${from.x}%`} y1={`${from.y}%`} x2={`${to.x}%`} y2={`${to.y}%`} pathLength={1}
          data-lit={open !== null && (a === open || b === open) || undefined} style={{ '--i': i } as CSSProperties} />;
      })}
    </svg>
    <ul className="bs-topics__list" aria-label={label}>
      {topics.map((topic, i) => {
        const place = places.get(topic.id)!;
        const side = place.x < 38 ? 'start' : place.x > 62 ? 'end' : 'center';
        const isOpen = open === topic.id;
        return <li key={topic.id} className="bs-topics__topic" data-weight={topic.weight ?? 1} data-side={side} data-open={isOpen || undefined} data-linked={linked.has(topic.id) || undefined}
          style={{ '--x': `${place.x}%`, '--y': `${place.y}%`, '--i': i } as CSSProperties}>
          <button type="button" id={`${id}-${topic.id}-button`} className="bs-topics__word" aria-expanded={isOpen} aria-controls={`${id}-${topic.id}`} onClick={() => setOpen(isOpen ? null : topic.id)}>{topic.label}</button>
          <div id={`${id}-${topic.id}`} className="bs-topics__detail" role="region" aria-labelledby={`${id}-${topic.id}-button`} hidden={!isOpen}>
            <div className="bs-topics__card">{topic.detail}</div>
          </div>
        </li>;
      })}
    </ul>
  </div>;
}

const CANVAS_GAP = 24;
const wrap = (value: number, size: number) => ((value % size) + size) % size;

/**
 * A wall of images you drag in any direction. It wraps, so it never runs out, and glides on after a flick. Arrow keys
 * pan it when focused. Before scripts run it is a plain scrolling grid; with reduced motion it stops when you let go.
 */
export function InfiniteCanvas({ images, label = 'Gallery', className = '' }: { images: ImageAsset[]; label?: string; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [copies, setCopies] = useState<{ x: number; y: number } | null>(null);
  const columns = Math.max(1, Math.ceil(Math.sqrt(images.length)));
  const rows = Math.max(1, Math.ceil(images.length / columns));

  useEffect(() => {
    const view = root.current;
    const tile = view?.querySelector<HTMLElement>('.bs-canvas__tile');
    if (!view || !tile) return;
    const measure = () => {
      const w = tile.offsetWidth + CANVAS_GAP, h = tile.offsetHeight + CANVAS_GAP;
      setCopies({ x: Math.ceil((view.clientWidth + w) / (columns * w)), y: Math.ceil((view.clientHeight + 2 * h) / (rows * h)) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(view);
    return () => observer.disconnect();
  }, [columns, rows]);

  useEffect(() => {
    const view = root.current;
    if (!view || !copies) return;
    const tiles = [...view.querySelectorAll<HTMLElement>('.bs-canvas__tile')];
    const w = tiles[0].offsetWidth + CANVAS_GAP, h = tiles[0].offsetHeight + CANVAS_GAP;
    const width = copies.x * columns * w, height = copies.y * rows * h;
    const still = matchMedia('(prefers-reduced-motion: reduce)');
    let x = -w / 2, y = -h / 2, vx = 0, vy = 0, frame = 0;
    let drag: { x: number; y: number } | null = null;
    const place = () => tiles.forEach(item => {
      const column = Number(item.dataset.column), row = Number(item.dataset.row);
      const left = wrap(column * w + x, width) - w;
      const top = wrap(row * h + (column % 2 ? h / 2 : 0) + y, height) - h;
      item.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    });
    const tick = () => {
      frame = 0;
      if (!drag && Math.hypot(vx, vy) > 0.1) { x += vx; y += vy; vx *= 0.94; vy *= 0.94; frame = requestAnimationFrame(tick); }
      place();
    };
    const glide = () => { if (!frame) frame = requestAnimationFrame(tick); };
    const down = (event: globalThis.PointerEvent) => {
      if (event.button !== 0) return;
      view.setPointerCapture(event.pointerId);
      drag = { x: event.clientX, y: event.clientY };
      vx = vy = 0;
      view.dataset.dragging = '';
    };
    const move = (event: globalThis.PointerEvent) => {
      if (!drag) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      drag = { x: event.clientX, y: event.clientY };
      x += dx; y += dy;
      vx = vx * 0.5 + dx * 0.5; vy = vy * 0.5 + dy * 0.5;
      glide();
    };
    const up = () => {
      if (!drag) return;
      drag = null;
      delete view.dataset.dragging;
      if (still.matches) vx = vy = 0;
      glide();
    };
    const key = (event: KeyboardEvent) => {
      const step = { ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[event.key];
      if (!step) return;
      event.preventDefault();
      if (still.matches) { x += step[0] * w; y += step[1] * h; }
      else { vx = step[0] * w * 0.06; vy = step[1] * h * 0.06; }
      glide();
    };
    place();
    view.addEventListener('pointerdown', down);
    view.addEventListener('pointermove', move);
    view.addEventListener('pointerup', up);
    view.addEventListener('pointercancel', up);
    view.addEventListener('keydown', key);
    return () => {
      cancelAnimationFrame(frame);
      view.removeEventListener('pointerdown', down);
      view.removeEventListener('pointermove', move);
      view.removeEventListener('pointerup', up);
      view.removeEventListener('pointercancel', up);
      view.removeEventListener('keydown', key);
    };
  }, [copies, columns, rows]);

  // Each image is named once; the copies that fill the wrap are hidden from assistive technology.
  const cells = Array.from({ length: (copies?.x ?? 1) * columns * (copies?.y ?? 1) * rows }, (_, index) => {
    const span = (copies?.x ?? 1) * columns;
    const column = index % span, row = Math.floor(index / span);
    const source = (row % rows) * columns + (column % columns);
    return { column, row, image: images[source % images.length], named: column < columns && row < rows && source < images.length };
  });
  if (!images.length) return null;
  return <div ref={root} className={`bs-canvas ${className}`} role="region" aria-label={`${label}, drag or use arrow keys to explore`} tabIndex={0} data-enhanced={copies ? '' : undefined}>
    {cells.map(({ column, row, image, named }) => <div key={`${column}-${row}`} className="bs-canvas__tile" data-column={column} data-row={row} aria-hidden={named ? undefined : true}>
      <img src={image.src} srcSet={image.srcSet} sizes="16rem" alt={named ? image.alt : ''} width={image.width} height={image.height} loading="lazy" decoding="async" draggable={false} style={{ objectPosition: image.focalPoint ?? 'center' }} />
    </div>)}
  </div>;
}

/**
 * A grid of thumbnails, or a masonry of them at their own shapes. Choosing one grows it into a full-screen view you can step through with buttons, arrow keys or a
 * swipe. Escape, the close button or a click outside shrinks it back into its place and returns focus there.
 */
export function Lightbox({ images, label = 'Gallery', layout = 'grid', className = '' }: { images: ImageAsset[]; label?: string; layout?: 'grid' | 'masonry'; className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const grid = useRef<HTMLUListElement>(null);
  const swipe = useRef<number | null>(null);
  const [index, setIndex] = useState(0);
  const thumb = (at: number) => grid.current?.children[at]?.querySelector('button') ?? null;
  const image = () => dialog.current?.querySelector<HTMLImageElement>('.bs-lightbox__image') ?? null;
  const moving = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Grows or shrinks the big image between its own box and the thumbnail's, scaled evenly from the centre.
  const morph = (target: HTMLElement, from: DOMRect, back = false) => {
    const to = target.getBoundingClientRect();
    const frames = [
      { transform: `translate(${from.left + from.width / 2 - (to.left + to.width / 2)}px, ${from.top + from.height / 2 - (to.top + to.height / 2)}px) scale(${from.width / to.width})` },
      { transform: 'none' },
    ];
    return target.animate(back ? frames.reverse() : frames, { duration: 460, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both' });
  };
  const open = (at: number) => {
    const from = thumb(at)?.getBoundingClientRect();
    flushSync(() => setIndex(at));
    dialog.current?.showModal();
    const big = image();
    if (!big || !from || !moving()) return;
    morph(big, from).finished.then(animation => animation.cancel(), () => {});
  };
  const close = () => {
    const box = dialog.current;
    if (!box?.open) return;
    const big = image(), to = thumb(index);
    if (!big || !to || !moving()) { box.close(); to?.focus(); return; }
    box.dataset.closing = '';
    const fade = box.animate({ opacity: [1, 0] }, { duration: 460, pseudoElement: '::backdrop', fill: 'forwards' });
    const shrink = morph(big, to.getBoundingClientRect(), true);
    const done = () => { box.close(); fade.cancel(); shrink.cancel(); delete box.dataset.closing; to.focus(); };
    shrink.finished.then(done, done);
  };
  const step = (by: number) => setIndex(current => (current + by + images.length) % images.length);
  const current = images[index];
  if (!current) return null;
  return <div className={`bs-lightbox${layout === 'masonry' ? ' bs-lightbox--masonry' : ''} ${className}`}>
    <ul ref={grid} className="bs-lightbox__grid" aria-label={label}>
      {images.map((item, at) => <li key={item.src + at}>
        <button type="button" className="bs-lightbox__thumb" aria-haspopup="dialog" onClick={() => open(at)}>
          <img src={item.src} srcSet={item.srcSet} sizes="(min-width: 768px) 25vw, 50vw" alt={item.alt} width={item.width} height={item.height} loading="lazy" decoding="async" style={{ objectPosition: item.focalPoint ?? 'center' }} />
        </button>
      </li>)}
    </ul>
    <dialog ref={dialog} className="bs-lightbox__dialog" aria-label={label}
      onCancel={event => { event.preventDefault(); close(); }}
      onClick={event => { if (event.target === event.currentTarget) close(); }}
      onKeyDown={event => { if (event.key === 'ArrowRight') step(1); if (event.key === 'ArrowLeft') step(-1); }}
      onPointerDown={event => { swipe.current = event.clientX; }}
      onPointerUp={event => {
        const dx = swipe.current === null ? 0 : event.clientX - swipe.current;
        swipe.current = null;
        if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
      }}>
      <img key={index} className="bs-lightbox__image" src={current.src} srcSet={current.srcSet} sizes="92vw" alt={current.alt} width={current.width} height={current.height} loading="lazy" draggable={false} />
      <button type="button" className="bs-lightbox__button bs-lightbox__close" aria-label="Close" onClick={close}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" /></svg></button>
      {images.length > 1 && <div className="bs-lightbox__bar">
        <button type="button" className="bs-lightbox__button" aria-label="Previous image" onClick={() => step(-1)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m10 3-5 5 5 5" /></svg></button>
        <p className="bs-lightbox__count" aria-live="polite">{index + 1} / {images.length}</p>
        <button type="button" className="bs-lightbox__button" aria-label="Next image" onClick={() => step(1)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg></button>
      </div>}
    </dialog>
  </div>;
}

/**
 * Images stand on a 3D ring. Drag sideways to spin it; it glides and settles with one image facing you. The buttons and
 * arrow keys turn it one image at a time. With reduced motion it turns without gliding.
 */
export function RingGallery({ images, label = 'Gallery', className = '' }: { images: ImageAsset[]; label?: string; className?: string }) {
  const stage = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLUListElement>(null);
  const turn = useRef<(by: number) => void>(() => {});
  const [front, setFront] = useState(0);
  const count = images.length;

  useEffect(() => {
    const area = stage.current, list = ring.current;
    if (!area || !list || count < 2) return;
    const slot = 360 / count;
    const still = matchMedia('(prefers-reduced-motion: reduce)');
    let angle = 0, target = 0, velocity = 0, frame = 0;
    let drag: number | null = null;
    const paint = () => {
      list.style.setProperty('--bs-ring-angle', `${angle}deg`);
      setFront(wrap(Math.round(-angle / slot), count));
    };
    const tick = () => {
      frame = 0;
      if (drag !== null) return;
      if (Math.abs(velocity) > 0.08) { angle += velocity; velocity *= 0.93; target = Math.round(angle / slot) * slot; }
      else { velocity = 0; angle += (target - angle) * 0.14; }
      if (Math.abs(target - angle) < 0.02 && !velocity) angle = target;
      else frame = requestAnimationFrame(tick);
      paint();
    };
    const settle = () => {
      if (still.matches) { velocity = 0; angle = target; paint(); return; }
      if (!frame) frame = requestAnimationFrame(tick);
    };
    turn.current = by => { velocity = 0; target = Math.round(angle / slot) * slot - by * slot; settle(); };
    const down = (event: globalThis.PointerEvent) => {
      if (event.button !== 0) return;
      area.setPointerCapture(event.pointerId);
      drag = event.clientX;
      velocity = 0;
    };
    const move = (event: globalThis.PointerEvent) => {
      if (drag === null) return;
      const delta = (event.clientX - drag) * 0.3;
      drag = event.clientX;
      angle += delta;
      velocity = velocity * 0.5 + delta * 0.5;
      paint();
    };
    const up = () => {
      if (drag === null) return;
      drag = null;
      target = Math.round(angle / slot) * slot;
      settle();
    };
    area.addEventListener('pointerdown', down);
    area.addEventListener('pointermove', move);
    area.addEventListener('pointerup', up);
    area.addEventListener('pointercancel', up);
    return () => {
      cancelAnimationFrame(frame);
      area.removeEventListener('pointerdown', down);
      area.removeEventListener('pointermove', move);
      area.removeEventListener('pointerup', up);
      area.removeEventListener('pointercancel', up);
    };
  }, [count]);

  return <section className={`bs-ring ${className}`} aria-roledescription="carousel" aria-label={label}
    onKeyDown={event => { if (event.key === 'ArrowRight') turn.current(1); if (event.key === 'ArrowLeft') turn.current(-1); }}>
    <div ref={stage} className="bs-ring__stage">
      <ul ref={ring} className="bs-ring__ring" style={{ '--n': count } as CSSProperties}>
        {images.map((image, at) => <li key={image.src + at} className="bs-ring__item" style={{ '--i': at } as CSSProperties}
          aria-roledescription="slide" aria-label={`${at + 1} of ${count}`} aria-hidden={at === front ? undefined : true} data-front={at === front || undefined}>
          <img src={image.src} srcSet={image.srcSet} sizes="16rem" alt={image.alt} width={image.width} height={image.height} loading="lazy" decoding="async" draggable={false} style={{ objectPosition: image.focalPoint ?? 'center' }} />
        </li>)}
      </ul>
    </div>
    {count > 1 && <div className="bs-ring__nav">
      <button type="button" aria-label="Previous image" onClick={() => turn.current(-1)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m10 3-5 5 5 5" /></svg></button>
      <p className="bs-ring__count" aria-live="polite">{front + 1} / {count}</p>
      <button type="button" aria-label="Next image" onClick={() => turn.current(1)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg></button>
    </div>}
  </section>;
}

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

/** Tracks scroll on the window with one frame per change, and on resize. */
function useScrollFrame(update: () => void, enabled: () => boolean, deps: unknown[]) {
  useEffect(() => {
    if (!enabled()) return;
    let frame = 0;
    const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; update(); }); };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); };
  }, deps);
}

/**
 * A grid of images that rise out of depth, tilting up to face you column by column as each row scrolls in.
 * Before scripts run, and under reduced motion, it is a flat grid.
 */
export function StaggerGrid({ images, label = 'Gallery', className = '' }: { images: ImageAsset[]; label?: string; className?: string }) {
  const root = useRef<HTMLUListElement>(null);
  const moving = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;
  useScrollFrame(() => {
    const list = root.current;
    if (!list) return;
    list.dataset.enhanced = '';
    const items = [...list.children] as HTMLElement[];
    const columns = [...new Set(items.map(item => item.offsetLeft))].sort((a, b) => a - b);
    for (const item of items) {
      const column = columns.indexOf(item.offsetLeft);
      const top = item.getBoundingClientRect().top;
      item.style.setProperty('--p', clamp01((innerHeight - top) / (innerHeight * .3) - column * .12).toFixed(3));
    }
  }, moving, [images]);
  return <ul ref={root} className={`bs-stagger ${className}`} aria-label={label}>
    {images.map((image, at) => <li key={image.src + at} className="bs-stagger__item"><BrandImage asset={image} sizes="(min-width: 768px) 25vw, 50vw" /></li>)}
  </ul>;
}

/**
 * A pinned stage where scattered, tilted images drift into a tidy grid as you scroll, while the title fades back.
 * Before scripts run, and under reduced motion, the title sits over an ordinary grid.
 */
export function ScrollFormation({ images, title, label = 'Gallery', className = '' }: { images: ImageAsset[]; title?: ReactNode; label?: string; className?: string }) {
  const root = useRef<HTMLElement>(null);
  const moving = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;
  useScrollFrame(() => {
    const section = root.current;
    if (!section) return;
    section.dataset.enhanced = '';
    const box = section.getBoundingClientRect();
    const progress = clamp01(-box.top / Math.max(box.height - innerHeight, 1));
    section.style.setProperty('--e', (1 - (1 - progress) ** 3).toFixed(3));
  }, moving, [images]);
  const columns = Math.ceil(Math.sqrt(images.length * 1.5));
  const rows = Math.ceil(images.length / columns);
  return <section ref={root} className={`bs-formation ${className}`} aria-label={label} style={{ '--cols': columns, '--rows': rows } as CSSProperties}>
    <div className="bs-formation__stage">
      {title && <h2 className="bs-formation__title">{title}</h2>}
      <ul className="bs-formation__grid">
        {images.map((image, at) => {
          // Golden-angle scatter: deterministic, so server and client agree, and no two images start in the same place.
          const angle = at * 2.39996, reach = 30 + ((at * 37) % 25);
          return <li key={image.src + at} style={{ '--sx': `${(Math.cos(angle) * reach).toFixed(1)}vw`, '--sy': `${(Math.sin(angle) * reach * .7).toFixed(1)}vh`, '--sr': `${((at * 53) % 40) - 20}deg` } as CSSProperties}>
            <BrandImage asset={image} sizes="(min-width: 768px) 20vw, 33vw" />
          </li>;
        })}
      </ul>
    </div>
  </section>;
}
