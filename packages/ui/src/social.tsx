"use client";

import { Children, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { BrandImage } from './core.js';
import type { ImageAsset } from './core.js';

/** Line icons on a 16px grid, drawn with the current text colour. */
function Icon({ d }: { d: string }) {
  return <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}
const icons = {
  reply: 'M3 3.5h10v7H7.5l-3 2.5v-2.5H3z',
  repost: 'M3.5 7V5h8.5M10 3l2 2-2 2M12.5 9v2H4M6 13l-2-2 2-2',
  like: 'M8 13.5S2.5 10.4 2.5 6.4A2.9 2.9 0 0 1 8 5a2.9 2.9 0 0 1 5.5 1.4c0 4-5.5 7.1-5.5 7.1z',
  views: 'M3.5 13V9M8 13V3M12.5 13V6.5',
  pause: 'M5.5 3.5v9M10.5 3.5v9',
  play: 'M5 3.2v9.6L12.5 8z',
};

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
/** Links, @mentions and #tags in a plain-text post. Splitting on a capture group puts every match at an odd index. */
const tokens = /(https?:\/\/[^\s]*[^\s.,!?;:)]|[@#][\p{L}\p{N}_]+)/gu;

function richText(text: string) {
  return text.split(tokens).map((part, i) => {
    if (i % 2 === 0) return part;
    if (part.startsWith('http')) return <a key={i} className="bs-post__link" href={part} rel="noopener noreferrer">{part.replace(/^https?:\/\//, '')}</a>;
    return <span key={i} className="bs-post__link">{part}</span>;
  });
}

function PostAction({ d, label, count, kind, pressed, onClick }: { d: string; label: string; count: number; kind: string; pressed?: boolean; onClick?: () => void }) {
  return <button type="button" className="bs-post__action" data-kind={kind} aria-pressed={pressed} onClick={onClick}>
    <Icon d={d} /><span className="bs-sr-only">{label}</span>{count > 0 && <span>{compact.format(count)}</span>}
  </button>;
}

export interface PostAuthor { name: string; handle: string; avatar?: ReactNode; verified?: boolean }

/**
 * One post in a social feed: who wrote it, when, the text, an optional image and the reply, repost and like counts.
 * In a plain-text body, links, @mentions and #tags take the accent colour. Like and repost are toggles that count you in.
 */
export function SocialPost({ author, time, dateTime, children, media, replies = 0, reposts = 0, likes = 0, views, defaultLiked = false, defaultReposted = false, onReply, onLikeChange, onRepostChange, className = '' }: {
  author: PostAuthor; time: string; dateTime?: string; children: ReactNode; media?: ImageAsset;
  replies?: number; reposts?: number; likes?: number; views?: number; defaultLiked?: boolean; defaultReposted?: boolean;
  onReply?: () => void; onLikeChange?: (liked: boolean) => void; onRepostChange?: (reposted: boolean) => void; className?: string;
}) {
  const [liked, setLiked] = useState(defaultLiked);
  const [reposted, setReposted] = useState(defaultReposted);
  return <article className={`bs-post ${className}`} aria-label={`${author.name}, ${time}`}>
    <span className="bs-post__avatar" aria-hidden="true">{author.avatar ?? author.name.slice(0, 1)}</span>
    <div className="bs-post__main">
      <header className="bs-post__head">
        <span className="bs-post__name">{author.name}</span>
        {author.verified && <svg className="bs-post__verified" viewBox="0 0 16 16" width="16" height="16" role="img" aria-label="Verified"><circle cx="8" cy="8" r="7" fill="currentColor" /><path d="M5 8.2l2 2 4-4.2" fill="none" stroke="var(--bs-on-accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        <span className="bs-post__handle">@{author.handle}</span>
        <span aria-hidden="true">·</span>
        <time dateTime={dateTime}>{time}</time>
      </header>
      <div className="bs-post__body">{typeof children === 'string' ? richText(children) : children}</div>
      {media && <BrandImage asset={media} className="bs-post__media" sizes="(min-width: 640px) 34rem, 100vw" />}
      <div className="bs-post__actions">
        <PostAction d={icons.reply} label="Reply" kind="reply" count={replies} onClick={onReply} />
        <PostAction d={icons.repost} label="Repost" kind="repost" count={reposts + Number(reposted) - Number(defaultReposted)} pressed={reposted}
          onClick={() => { setReposted(!reposted); onRepostChange?.(!reposted); }} />
        <PostAction d={icons.like} label="Like" kind="like" count={likes + Number(liked) - Number(defaultLiked)} pressed={liked}
          onClick={() => { setLiked(!liked); onLikeChange?.(!liked); }} />
        {views !== undefined && <span className="bs-post__stat"><Icon d={icons.views} /><span className="bs-sr-only">Views</span>{compact.format(views)}</span>}
      </div>
    </div>
  </article>;
}

/** Posts that answer one another, in order, joined by a line between their avatars. */
export function PostThread({ children, label = 'Thread', className = '' }: { children: ReactNode; label?: string; className?: string }) {
  return <ol className={`bs-post-thread ${className}`} aria-label={label}>
    {Children.toArray(children).map((child, i) => <li key={i}>{child}</li>)}
  </ol>;
}

export interface StorySlide { id: string; asset: ImageAsset; title?: string; text?: string; /** Milliseconds on screen. */ duration?: number }

/**
 * Full-height stories that play one slide after another, with a progress bar for each. Tap the right side for the next
 * slide and the left for the previous one; hold to pause. Arrow keys step, Space pauses. With reduced motion it starts paused.
 */
export function StoryViewer({ slides, author, time, duration = 5000, label = 'Stories', onEnd, className = '' }: {
  slides: StorySlide[]; author: { name: string; avatar?: ReactNode }; time?: string; duration?: number; label?: string; onEnd?: () => void; className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [run, setRun] = useState(0);
  const [paused, setPaused] = useState(false);
  const [ended, setEnded] = useState(false);
  const [holding, setHolding] = useState(false);
  const hold = useRef<ReturnType<typeof setTimeout>>(undefined);
  const held = useRef(false);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) setPaused(true);
    return () => clearTimeout(hold.current);
  }, []);
  if (!slides.length) return null;
  const go = (next: number) => {
    if (next >= slides.length) { setPaused(true); setEnded(true); onEnd?.(); return; }
    setIndex(Math.max(0, next));
    setRun(count => count + 1);
    setEnded(false);
  };
  const toggle = () => {
    if (ended) go(0);
    setPaused(ended ? false : !paused);
  };
  const press = () => { held.current = false; hold.current = setTimeout(() => { held.current = true; setHolding(true); }, 250); };
  const release = () => { clearTimeout(hold.current); setHolding(false); };
  const tap = (step: number) => () => { if (held.current) held.current = false; else go(index + step); };
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowRight') go(index + 1);
    else if (event.key === 'ArrowLeft') go(index - 1);
    else if (event.key === ' ' && event.target === event.currentTarget) toggle();
    else return;
    event.preventDefault();
  };
  const zone = { onPointerDown: press, onPointerUp: release, onPointerLeave: release, onPointerCancel: release };
  return <section className={`bs-stories ${className}`} aria-label={label} aria-roledescription="carousel" tabIndex={0} onKeyDown={onKeyDown}
    data-paused={paused || holding || undefined} data-holding={holding || undefined}
    style={{ '--bs-story-duration': `${slides[index].duration ?? duration}ms` } as CSSProperties}>
    <div className="bs-stories__slides" aria-live={paused ? 'polite' : 'off'}>
      {slides.map((slide, i) => <div key={slide.id} className="bs-stories__slide" role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${slides.length}`} hidden={i !== index}>
        <BrandImage asset={slide.asset} priority={i <= index + 1} sizes="24rem" />
        {(slide.title || slide.text) && <div className="bs-stories__caption">
          {slide.title && <p className="bs-stories__title">{slide.title}</p>}
          {slide.text && <p>{slide.text}</p>}
        </div>}
      </div>)}
    </div>
    <button type="button" className="bs-stories__tap" data-side="previous" aria-label="Previous story" onClick={tap(-1)} {...zone} />
    <button type="button" className="bs-stories__tap" data-side="next" aria-label="Next story" onClick={tap(1)} {...zone} />
    <div className="bs-stories__top">
      <div className="bs-stories__bars" aria-hidden="true">
        {slides.map((slide, i) => <span key={slide.id} className="bs-stories__bar">
          {i < index && <span className="bs-stories__fill" />}
          {i === index && <span key={run} className="bs-stories__fill" data-current="" onAnimationEnd={() => go(index + 1)} />}
        </span>)}
      </div>
      <div className="bs-stories__head">
        <span className="bs-stories__avatar" aria-hidden="true">{author.avatar ?? author.name.slice(0, 1)}</span>
        <span className="bs-stories__name">{author.name}</span>
        {time && <span className="bs-stories__time">{time}</span>}
        <button type="button" className="bs-stories__toggle" aria-label={ended ? 'Replay stories' : paused ? 'Play stories' : 'Pause stories'} onClick={toggle}>
          {paused ? <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d={icons.play} fill="currentColor" /></svg> : <Icon d={icons.pause} />}
        </button>
      </div>
    </div>
  </section>;
}
