"use client";

import { useEffect, useId, useRef, useState } from 'react';
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
