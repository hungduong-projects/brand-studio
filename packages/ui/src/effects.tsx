"use client";

import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { useEffect, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, MouseEvent, PointerEvent, ReactNode } from 'react';
import { BrandImage } from './core.js';
import type { ImageAsset } from './core.js';

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A light that travels around the edge of its child. Decorative; it stops under reduced motion. */
export function BorderBeam({ children, duration = 6, className = '', style, ...props }: HTMLAttributes<HTMLDivElement> & { duration?: number }) {
  return <div {...props} className={`bs-beam ${className}`} style={{ '--bs-beam-duration': `${duration}s`, ...style } as CSSProperties}>{children}</div>;
}

/** A brushed-metal button whose sheen follows the pointer. */
export function MetalButton({ className = '', children, type = 'button', onPointerMove, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--bs-metal-x', `${((event.clientX - box.left) / box.width) * 100}%`);
    event.currentTarget.style.setProperty('--bs-metal-y', `${((event.clientY - box.top) / box.height) * 100}%`);
    onPointerMove?.(event);
  };
  return <button {...props} type={type} className={`bs-metal ${className}`} onPointerMove={move}><span className="bs-metal__face">{children}</span></button>;
}

export interface MagnetTab { value: string; label: ReactNode; content?: ReactNode }

/** Tabs whose highlight slides toward the tab under the pointer, then settles on the selected one. Arrow keys move between tabs. */
export function MagnetTabs({ items, defaultValue, value, onValueChange, className = '', 'aria-label': ariaLabel }: {
  items: MagnetTab[]; defaultValue?: string; value?: string; onValueChange?: (value: string) => void; className?: string; 'aria-label'?: string;
}) {
  const list = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ left: number; width: number } | null>(null);
  const track = (event: MouseEvent<HTMLElement>) => {
    const tab = (event.target as HTMLElement).closest<HTMLElement>('[role="tab"]');
    if (!tab || !list.current) return;
    setHover({ left: tab.offsetLeft, width: tab.offsetWidth });
  };
  const hasPanels = items.some(item => item.content);
  return <BaseTabs.Root className={`bs-magnet ${className}`} defaultValue={defaultValue ?? items[0]?.value} value={value} onValueChange={next => onValueChange?.(next as string)}>
    <BaseTabs.List ref={list} className="bs-magnet__list" aria-label={ariaLabel} onMouseOver={track} onMouseLeave={() => setHover(null)}
      style={hover ? { '--bs-hover-left': `${hover.left}px`, '--bs-hover-width': `${hover.width}px` } as CSSProperties : undefined} data-hovering={hover ? '' : undefined}>
      <span className="bs-magnet__hover" aria-hidden="true" />
      {items.map(item => <BaseTabs.Tab key={item.value} value={item.value} className="bs-magnet__tab">{item.label}</BaseTabs.Tab>)}
      <BaseTabs.Indicator className="bs-magnet__indicator" />
    </BaseTabs.List>
    {hasPanels && items.map(item => <BaseTabs.Panel key={item.value} value={item.value} className="bs-magnet__panel">{item.content}</BaseTabs.Panel>)}
  </BaseTabs.Root>;
}

/** Cycles through words with a letter-by-letter flip. Screen readers hear every word once. */
export function FlipText({ words, interval = 2400, className = '' }: { words: string[]; interval?: number; className?: string }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (words.length < 2) return;
    const timer = window.setInterval(() => setIndex(current => (current + 1) % words.length), interval);
    return () => window.clearInterval(timer);
  }, [words.length, interval]);
  const word = words[index % Math.max(words.length, 1)] ?? '';
  return <span className={`bs-flip ${className}`}>
    <span className="bs-sr-only">{words.join(', ')}</span>
    <span key={index} className="bs-flip__word" aria-hidden="true">{[...word].map((letter, position) => <span key={position} className="bs-flip__letter" style={{ animationDelay: `${position * 35}ms` }}>{letter === ' ' ? ' ' : letter}</span>)}</span>
  </span>;
}

export interface StackCard { id: string; title: string; body: string; asset?: ImageAsset }

/** Cards pin as you scroll and pile onto each other; covered cards shrink back. Without motion they read as a plain list. */
export function ScrollStack({ cards, className = '' }: { cards: StackCard[]; className?: string }) {
  const root = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const list = root.current;
    if (!list || reducedMotion()) return;
    const items = [...list.querySelectorAll<HTMLElement>('.bs-stack__card')];
    let frame = 0;
    const update = () => {
      frame = 0;
      items.forEach((item, index) => {
        const next = items[index + 1];
        if (!next) return;
        const top = item.getBoundingClientRect().top;
        const covered = Math.min(Math.max((item.offsetHeight - (next.getBoundingClientRect().top - top)) / item.offsetHeight, 0), 1);
        item.style.setProperty('--bs-stack-cover', covered.toFixed(3));
      });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); };
  }, [cards]);
  return <ol ref={root} className={`bs-stack ${className}`}>
    {cards.map((card, index) => <li key={card.id} className="bs-stack__card" style={{ '--bs-stack-index': index } as CSSProperties}>
      <div className="bs-stack__copy"><span className="bs-stack__number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><h3>{card.title}</h3><p>{card.body}</p></div>
      {card.asset && <BrandImage asset={card.asset} sizes="(min-width: 768px) 40vw, 100vw" />}
    </li>)}
  </ol>;
}

interface Burst { id: number; x: number; y: number }

/** Sparks fly from the point of each click inside the wrapper. Decorative; skipped under reduced motion. */
export function ClickSpark({ children, sparks = 8, className = '', onClick, ...props }: HTMLAttributes<HTMLDivElement> & { sparks?: number }) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const next = useRef(0);
  const click = (event: MouseEvent<HTMLDivElement>) => {
    onClick?.(event);
    if (reducedMotion()) return;
    const box = event.currentTarget.getBoundingClientRect();
    const burst = { id: next.current++, x: event.clientX - box.left, y: event.clientY - box.top };
    setBursts(current => [...current, burst]);
    window.setTimeout(() => setBursts(current => current.filter(item => item.id !== burst.id)), 600);
  };
  return <div {...props} className={`bs-spark ${className}`} onClick={click}>
    {children}
    {bursts.map(burst => <span key={burst.id} className="bs-spark__burst" style={{ left: burst.x, top: burst.y }} aria-hidden="true">
      {Array.from({ length: sparks }, (_, index) => <i key={index} style={{ '--bs-spark-angle': `${(360 / sparks) * index}deg` } as CSSProperties} />)}
    </span>)}
  </div>;
}
