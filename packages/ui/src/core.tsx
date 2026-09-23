"use client";

import { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, CSSProperties, HTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

export interface BrandTokens {
  surface: string; elevated: string; ink: string; muted: string; accent: string; onAccent: string; line: string;
  font: string; radius: string;
  /** Optional second family for the voice role (a promise line under display type). */
  voiceFont?: string;
}
export interface BrandPalette { light: BrandTokens; dark: BrandTokens }
export interface ImageAsset {
  src: string; alt: string; width: number; height: number;
  srcSet?: string; mobileSrc?: string; focalPoint?: string;
}

const ThemeRoot = createContext<RefObject<HTMLDivElement | null> | null>(null);

/** Popups portal into the nearest BrandTheme so they keep its tokens; outside one they portal to the body. */
export function useThemeRoot() {
  return useContext(ThemeRoot) ?? undefined;
}

/** Keep brand changes local to this tree; never mutate the document theme. */
export function BrandTheme({ palette, mode = 'system', children, className = '', style, ...props }: HTMLAttributes<HTMLDivElement> & { palette: BrandPalette; mode?: 'light' | 'dark' | 'system' }) {
  const root = useRef<HTMLDivElement>(null);
  const variables: Record<string, string> = {};
  for (const theme of ['light', 'dark'] as const) {
    for (const [key, value] of Object.entries(palette[theme])) variables[`--bs-${theme}-${key}`] = value;
  }
  return <div {...props} ref={root} data-bs-theme={mode} className={`bs-theme ${className}`} style={{ ...variables, ...style } as CSSProperties}><ThemeRoot.Provider value={root}>{children}</ThemeRoot.Provider></div>;
}

type ButtonTone = 'primary' | 'secondary' | 'inverse';
type ButtonShape = 'default' | 'pill';
const buttonClass = (tone: ButtonTone, shape: ButtonShape, className: string) => `bs-button bs-button--${tone}${shape === 'pill' ? ' bs-button--pill' : ''} ${className}`;

/** `inverse` sits on photography or an accent field; `pill` overrides the contract radius. */
export function Button({ tone = 'primary', shape = 'default', loading = false, disabled, className = '', children, type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ButtonTone; shape?: ButtonShape; loading?: boolean }) {
  return <button {...props} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={buttonClass(tone, shape, className)}>{children}{loading && <span className="bs-button__loading" aria-hidden="true">…</span>}</button>;
}

/** Navigation is an anchor, never a button with a location side effect. */
export function ActionLink({ tone = 'primary', shape = 'default', className = '', ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; tone?: ButtonTone; shape?: ButtonShape }) {
  return <a {...props} className={buttonClass(tone, shape, className)} />;
}

export function TextField({ label, hint, error, id: providedId, className = '', 'aria-describedby': describedBy, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const descriptions = [describedBy, hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return <div className={`bs-field ${className}`}><label htmlFor={id}>{label}</label><input {...props} id={id} aria-invalid={error ? true : props['aria-invalid']} aria-describedby={descriptions} />{hint && <small id={`${id}-hint`}>{hint}</small>}{error && <p className="bs-field__error" id={`${id}-error`}>{error}</p>}</div>;
}

export function BrandImage({ asset, priority = false, className = '', sizes = '100vw' }: { asset: ImageAsset; priority?: boolean; className?: string; sizes?: string }) {
  return <picture className={`bs-picture ${className}`}>
    {asset.mobileSrc && <source media="(max-width: 767px)" srcSet={asset.mobileSrc} />}
    <img src={asset.src} srcSet={asset.srcSet} sizes={asset.srcSet ? sizes : undefined} alt={asset.alt} width={asset.width} height={asset.height} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" style={{ objectPosition: asset.focalPoint ?? 'center' }} />
  </picture>;
}

/** `split` puts copy beside the image; `overlay` runs the image full-bleed with copy on a scrim that stays readable before the image loads. */
export function StoryHero({ title, description, asset, action, eyebrow, id, variant = 'split' }: { title: ReactNode; description: string; asset: ImageAsset; action: ReactNode; eyebrow?: string; id?: string; variant?: 'split' | 'overlay' }) {
  return <section className={`bs-hero bs-hero--${variant}`} id={id}>
    <div className="bs-hero__copy">{eyebrow && <p className="bs-eyebrow">{eyebrow}</p>}<h1>{title}</h1><p className="bs-lead">{description}</p><div className="bs-actions">{action}</div></div>
    <BrandImage asset={asset} priority className="bs-hero__image" sizes={variant === 'overlay' ? '100vw' : '(min-width: 768px) 65vw, 100vw'} />
  </section>;
}

export function EditorialSection({ title, children, asset, id }: { title: string; children: ReactNode; asset?: ImageAsset; id?: string }) {
  return <section className="bs-editorial bs-container" id={id}><div className="bs-editorial__copy"><h2>{title}</h2><div className="bs-prose">{children}</div></div>{asset && <BrandImage asset={asset} sizes="(min-width: 768px) 50vw, 100vw" />}</section>;
}

export interface StoryChapter { id: string; title: string; body: string; asset: ImageAsset; label?: string }

/** Desktop shared stage; mobile, no-JS and reduced-motion readers keep every image in document flow. */
export function StorySequence({ title, chapters, id, motion = 'auto' }: { title: string; chapters: StoryChapter[]; id?: string; motion?: 'auto' | 'off' }) {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [enhanced, setEnhanced] = useState(false);
  const headingId = useId();

  useEffect(() => {
    if (!root.current || typeof IntersectionObserver === 'undefined') return;
    const media = window.matchMedia('(min-width: 900px) and (prefers-reduced-motion: no-preference)');
    let observer: IntersectionObserver | undefined;
    const configure = () => {
      observer?.disconnect();
      setEnhanced(media.matches && motion !== 'off');
      if (!media.matches || motion === 'off') return;
      const visibility = new Map<Element, IntersectionObserverEntry>();
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => visibility.set(entry.target, entry));
        const visible = [...visibility.values()].filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(Number((visible.target as HTMLElement).dataset.chapter));
      }, { rootMargin: '-30% 0px -30% 0px', threshold: [0, 0.3, 0.6] });
      root.current?.querySelectorAll('[data-chapter]').forEach(element => observer!.observe(element));
    };
    configure();
    media.addEventListener('change', configure);
    return () => { observer?.disconnect(); media.removeEventListener('change', configure); };
  }, [chapters, motion]);

  if (!chapters.length) return null;
  return <section id={id} ref={root} className="bs-story bs-container" data-enhanced={enhanced} aria-labelledby={headingId}>
    <h2 id={headingId} className="bs-story__title">{title}</h2>
    <div className="bs-story__layout">
      <div className="bs-story__stage" aria-hidden="true">
        {chapters.map((chapter, index) => <div key={chapter.id} className="bs-story__frame" data-active={index === Math.min(active, chapters.length - 1)}><BrandImage asset={{ ...chapter.asset, alt: '' }} /></div>)}
      </div>
      <div className="bs-story__chapters">
        {chapters.map((chapter, index) => <article key={chapter.id} id={chapter.id} data-chapter={index} className="bs-story__chapter">
          <div>{chapter.label && <p className="bs-story__label">{chapter.label}</p>}<h3>{chapter.title}</h3><p>{chapter.body}</p></div>
          <BrandImage asset={chapter.asset} className="bs-story__inline" />
          {enhanced && <p className="bs-sr-only">{chapter.asset.alt}</p>}
        </article>)}
      </div>
    </div>
  </section>;
}
