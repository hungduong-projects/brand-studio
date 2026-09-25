"use client";

import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { useEffect, useId, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, ElementType, HTMLAttributes, MouseEvent, PointerEvent, ReactNode } from 'react';
import { BrandImage, Button } from './core.js';
import type { ImageAsset } from './core.js';
import { useEntrance } from './entrance.js';
import { createStage, fit, toRgb } from './gl.js';

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

/** Runs `frame` on every animation frame while the element is on screen; `frame` returns false to stop until the next `wake`. */
function useVisibleLoop(element: { current: Element | null }, frame: (time: number) => boolean | void) {
  const step = useRef(frame);
  step.current = frame;
  const wake = useRef(() => {});
  useEffect(() => {
    const target = element.current;
    if (!target) return;
    let id = 0, visible = false;
    const tick = (time: number) => { id = step.current(time) === false || !visible ? 0 : requestAnimationFrame(tick); };
    wake.current = () => { if (visible && !id) id = requestAnimationFrame(tick); };
    const observer = new IntersectionObserver(([entry]) => { visible = !!entry?.isIntersecting; if (visible) wake.current(); else { cancelAnimationFrame(id); id = 0; } });
    observer.observe(target);
    return () => { observer.disconnect(); cancelAnimationFrame(id); };
  }, [element]);
  return wake;
}

const flowShader = `uniform float t; uniform vec2 res; uniform vec3 c0; uniform vec3 c1; uniform vec3 c2;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }
float fbm(vec2 p) { float v = 0., a = .5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.02; a *= .5; } return v; }
void main() {
  vec2 p = uv * vec2(res.x / res.y, 1.) * 1.1;
  vec2 q = vec2(fbm(p + t * .04), fbm(p + vec2(5.2, 1.3) - t * .03));
  float f = fbm(p + 1.6 * q + t * .02);
  vec3 color = mix(c0, c1, smoothstep(.3, .75, f));
  color = mix(color, c2, smoothstep(.7, 1.2, length(q)) * .25);
  color += (hash(uv * res + fract(t)) - .5) * .03;
  gl_FragColor = vec4(color, 1.);
}`;

/** A slow, living gradient drawn by a shader in the brand's surface, accent and ink. Content sits on top. It holds still under reduced motion and pauses off screen; without WebGL a static gradient stands in. */
export function ShaderBackground({ colors, speed = 1, className = '', children, ...props }: HTMLAttributes<HTMLDivElement> & { colors?: [string, string, string]; speed?: number }) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<ReturnType<typeof createStage>>(null);
  const read = useRef(0);
  const still = useRef(false);
  const paint = (time: number) => {
    const current = stage.current, element = root.current;
    if (!current || !element || !canvas.current) return false;
    const { gl, uniform } = current;
    // Colours are read once a second so a light/dark switch reaches the shader without an observer.
    if (time - read.current > 1000 || !read.current) {
      read.current = time || 1;
      const style = getComputedStyle(element);
      const [c0, c1, c2] = colors ?? [style.getPropertyValue('--bs-surface'), style.getPropertyValue('--bs-accent'), style.getPropertyValue('--bs-ink')];
      gl.uniform3fv(uniform('c0'), toRgb(c0)); gl.uniform3fv(uniform('c1'), toRgb(c1)); gl.uniform3fv(uniform('c2'), toRgb(c2));
    }
    fit(canvas.current, gl);
    gl.uniform2f(uniform('res'), canvas.current.width, canvas.current.height);
    gl.uniform1f(uniform('t'), still.current ? 12 : (time / 1000) * speed);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!element.dataset.ready) element.dataset.ready = '';
    return !still.current;
  };
  useVisibleLoop(root, paint);
  useEffect(() => {
    if (!canvas.current) return;
    still.current = reducedMotion();
    stage.current = createStage(canvas.current, flowShader);
  }, []);
  return <div {...props} ref={root} className={`bs-shader ${className}`}>
    <canvas ref={canvas} className="bs-shader__canvas" aria-hidden="true" />
    {children && <div className="bs-shader__content">{children}</div>}
  </div>;
}

/** A headline whose words, or letters, rise out of a mask one after another as it scrolls into view. Screen readers hear the plain text. */
export function KineticText({ text, as: Tag = 'h2', by = 'word', stagger = 45, className = '' }: { text: string; as?: ElementType; by?: 'word' | 'letter'; stagger?: number; className?: string }) {
  const root = useEntrance<HTMLElement>();
  let index = 0;
  const piece = (content: string, key: number) => <span key={key} className="bs-kinetic__mask"><span className="bs-kinetic__piece" style={{ '--i': index++ } as CSSProperties}>{content}</span></span>;
  const words = text.split(/\s+/).filter(Boolean);
  return <Tag ref={root} className={`bs-kinetic ${className}`} style={{ '--bs-kinetic-stagger': `${stagger}ms` } as CSSProperties}>
    <span className="bs-sr-only">{text}</span>
    <span aria-hidden="true">{words.map((word, at) => <span key={at} className="bs-kinetic__word">
      {by === 'word' ? piece(word, 0) : [...word].map((letter, position) => piece(letter, position))}
      {at < words.length - 1 && ' '}
    </span>)}</span>
  </Tag>;
}

const rippleShader = `uniform sampler2D image; uniform vec2 mouse; uniform float strength; uniform float t; uniform vec2 cover; uniform vec2 focus;
void main() {
  vec2 p = vec2(uv.x, 1. - uv.y);
  vec2 d = p - mouse;
  float wave = sin(length(d) * 38. - t * 5.) * exp(-length(d) * 7.) * strength * .018;
  vec2 shift = normalize(d + 1e-4) * wave;
  vec2 at = (p + shift) * cover + (1. - cover) * focus;
  vec2 split = shift * cover * 1.6;
  gl_FragColor = vec4(texture2D(image, at + split).r, texture2D(image, at).g, texture2D(image, at - split).b, 1.);
}`;

/** An image that ripples and splits its colour around the pointer, then settles. The picture underneath stays a normal, described image; the effect answers a mouse only, needs same-origin images and is off under reduced motion. */
export function DistortionImage({ asset, strength = 1, sizes, className = '' }: { asset: ImageAsset; strength?: number; sizes?: string; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<ReturnType<typeof createStage>>(null);
  const state = useRef({ x: .5, y: .5, target: 0, amount: 0, start: 0 });
  const wake = useVisibleLoop(root, time => {
    const current = stage.current, element = canvas.current;
    if (!current || !element) return false;
    const { gl, uniform } = current, s = state.current;
    s.amount += (s.target - s.amount) * .08;
    fit(element, gl);
    const box = root.current!.getBoundingClientRect();
    const boxRatio = box.width / Math.max(box.height, 1), imageRatio = asset.width / asset.height;
    gl.uniform2f(uniform('cover'), boxRatio > imageRatio ? 1 : boxRatio / imageRatio, boxRatio > imageRatio ? imageRatio / boxRatio : 1);
    gl.uniform2f(uniform('mouse'), s.x, s.y);
    gl.uniform1f(uniform('strength'), s.amount * strength);
    gl.uniform1f(uniform('t'), (time - s.start) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return s.target > 0 || s.amount > .002;
  });
  useEffect(() => {
    const element = canvas.current, image = root.current?.querySelector('img');
    if (!element || !image || reducedMotion()) return;
    const load = () => {
      const current = createStage(element, rippleShader);
      if (!current) return;
      const { gl, uniform } = current;
      gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
      for (const [key, value] of [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_MIN_FILTER, gl.LINEAR]] as const) gl.texParameteri(gl.TEXTURE_2D, key, value);
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image); } catch { return; } // cross-origin image: keep the plain picture
      const [fx = 50, fy = 50] = (asset.focalPoint ?? '50% 50%').split(/\s+/).map(parseFloat);
      gl.uniform2f(uniform('focus'), fx / 100, fy / 100);
      stage.current = current;
      root.current!.dataset.ready = '';
    };
    if (image.complete && image.naturalWidth) load(); else image.addEventListener('load', load, { once: true });
    return () => image.removeEventListener('load', load);
  }, [asset]);
  const track = (event: PointerEvent<HTMLDivElement>, target: number) => {
    if (event.pointerType !== 'mouse') return; // touch and pen keep the still image
    const box = event.currentTarget.getBoundingClientRect(), s = state.current;
    s.x = (event.clientX - box.left) / box.width; s.y = (event.clientY - box.top) / box.height;
    if (target && !s.target) s.start = performance.now();
    s.target = target;
    wake.current();
  };
  return <div ref={root} className={`bs-distort ${className}`} onPointerEnter={event => track(event, 1)} onPointerMove={event => track(event, 1)} onPointerLeave={event => track(event, 0)}>
    <BrandImage asset={asset} sizes={sizes} />
    <canvas ref={canvas} className="bs-distort__canvas" aria-hidden="true" />
  </div>;
}

/** Big lines of type that slide sideways without end, speeding up and leaning with the speed you scroll. Screen readers hear each line once; under reduced motion the lines stand still. */
export function VelocityMarquee({ lines, speed = 40, className = '' }: { lines: string[]; speed?: number; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const motion = useRef({ offset: 0, boost: 0, last: 0, scroll: 0 });
  useVisibleLoop(root, time => {
    const element = root.current, m = motion.current;
    if (!element || reducedMotion()) return false;
    const delta = m.last ? Math.min(time - m.last, 64) / 1000 : 0;
    m.last = time;
    const scrolled = window.scrollY - m.scroll;
    m.scroll = window.scrollY;
    m.boost += ((delta ? scrolled / delta / 40 : 0) - m.boost) * .1;
    m.offset += (speed + Math.abs(m.boost) * 8) * delta;
    element.querySelectorAll<HTMLElement>('.bs-marquee__track').forEach((track, row) => {
      const width = track.scrollWidth / 2 || 1;
      const x = (m.offset * (1 + row * .15)) % width;
      track.style.transform = `translateX(${row % 2 ? x - width : -x}px) skewX(${Math.max(-12, Math.min(12, -m.boost * .6))}deg)`;
    });
  });
  return <div ref={root} className={`bs-marquee ${className}`}>
    <ul className="bs-sr-only">{lines.map((line, at) => <li key={at}>{line}</li>)}</ul>
    {lines.map((line, at) => <div key={at} className="bs-marquee__row" aria-hidden="true">
      <div className="bs-marquee__track">{Array.from({ length: 8 }, (_, copy) => <span key={copy}>{line}</span>)}</div>
    </div>)}
  </div>;
}

/** Follows a mouse over the element as -1..1 offsets from its centre in `--mx` and `--my`, and marks it `data-active`. Touch, pen and reduced motion leave it still. */
function usePointerOffset<T extends HTMLElement>(onMove?: (element: T, x: number, y: number) => void) {
  const move = (event: PointerEvent<T>) => {
    if (event.pointerType !== 'mouse' || reducedMotion()) return;
    const element = event.currentTarget, box = element.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * 2 - 1, y = ((event.clientY - box.top) / box.height) * 2 - 1;
    element.style.setProperty('--mx', x.toFixed(3));
    element.style.setProperty('--my', y.toFixed(3));
    element.dataset.active = '';
    onMove?.(element, x, y);
  };
  const leave = (event: PointerEvent<T>) => {
    const element = event.currentTarget;
    element.style.setProperty('--mx', '0');
    element.style.setProperty('--my', '0');
    delete element.dataset.active;
  };
  return { onPointerMove: move, onPointerLeave: leave };
}

/** A button that leans toward the mouse and springs back when it leaves. Its label leans further, so it feels held by a magnet. Touch and keyboard get an ordinary button. */
export function MagneticButton({ strength = 1, className = '', children, style, onPointerMove, onPointerLeave, ...props }: Parameters<typeof Button>[0] & { strength?: number }) {
  const pointer = usePointerOffset<HTMLButtonElement>();
  return <Button {...props} className={`bs-magnetic ${className}`} style={{ '--bs-magnetic-strength': strength, ...style } as CSSProperties}
    onPointerMove={event => { pointer.onPointerMove(event); onPointerMove?.(event); }}
    onPointerLeave={event => { pointer.onPointerLeave(event); onPointerLeave?.(event); }}>
    <span className="bs-magnetic__label">{children}</span>
  </Button>;
}

/**
 * A soft dot that trails the mouse inside the wrapper and grows into a ring over links and buttons.
 * An element with `data-cursor="View"` shows that word in the ring. The system cursor stays; touch screens and reduced motion get no dot.
 */
export function CustomCursor({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  const root = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLSpanElement>(null);
  const [label, setLabel] = useState('');
  const target = useRef({ x: 0, y: 0, shown: false });
  const at = useRef({ x: 0, y: 0 });
  const wake = useVisibleLoop(root, () => {
    const element = dot.current;
    if (!element) return false;
    const t = target.current, p = at.current;
    p.x += (t.x - p.x) * .22; p.y += (t.y - p.y) * .22;
    element.style.translate = `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`;
    return Math.abs(t.x - p.x) + Math.abs(t.y - p.y) > .2;
  });
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || reducedMotion() || !root.current) return;
    const box = root.current.getBoundingClientRect(), t = target.current;
    t.x = event.clientX - box.left; t.y = event.clientY - box.top;
    if (!t.shown) { at.current = { x: t.x, y: t.y }; t.shown = true; }
    const over = (event.target as HTMLElement).closest<HTMLElement>('a, button, [data-cursor]');
    root.current.dataset.cursor = over ? 'grow' : 'dot';
    setLabel(over?.dataset.cursor ?? '');
    wake.current();
  };
  const leave = () => { target.current.shown = false; if (root.current) delete root.current.dataset.cursor; };
  return <div {...props} ref={root} className={`bs-cursor ${className}`} onPointerMove={move} onPointerLeave={leave}>
    {children}
    <span ref={dot} className="bs-cursor__dot" aria-hidden="true">{label && <span className="bs-cursor__label">{label}</span>}</span>
  </div>;
}

/** A card that tilts toward the mouse in 3D, with a soft glare where the pointer is. Touch, keyboard and reduced motion see a flat card. */
export function TiltCard({ max = 8, children, className = '', style, ...props }: HTMLAttributes<HTMLDivElement> & { max?: number }) {
  const pointer = usePointerOffset<HTMLDivElement>();
  return <div {...props} {...pointer} className={`bs-tilt ${className}`} style={{ '--bs-tilt-max': `${max}deg`, ...style } as CSSProperties}>
    <div className="bs-tilt__face">{children}<span className="bs-tilt__glare" aria-hidden="true" /></div>
  </div>;
}

/** A card whose border and surface light up around the mouse, like a torch passing over it. Keyboard focus inside lights the whole edge. */
export function SpotlightCard({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  const pointer = usePointerOffset<HTMLDivElement>();
  return <div {...props} {...pointer} className={`bs-spotlight ${className}`}>{children}</div>;
}

const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=';

/** Text whose letters and digits flicker through random characters, then settle left to right; spaces and punctuation hold still. It plays when it scrolls into view and again on hover. Screen readers, and reduced motion, get the plain text. */
export function ScrambleText({ text, as: Tag = 'span', duration = 900, className = '' }: { text: string; as?: ElementType; duration?: number; className?: string }) {
  const root = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(text);
  const run = useRef(0);
  const play = () => {
    if (reducedMotion()) return;
    cancelAnimationFrame(run.current);
    const start = performance.now();
    const step = (now: number) => {
      const settled = Math.floor(((now - start) / duration) * text.length);
      setShown([...text].map((letter, index) => index < settled || !/[a-z0-9]/i.test(letter) ? letter : glyphs[Math.floor(Math.random() * glyphs.length)]).join(''));
      if (settled < text.length) run.current = requestAnimationFrame(step);
    };
    run.current = requestAnimationFrame(step);
  };
  useEffect(() => {
    setShown(text);
    const element = root.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) { observer.disconnect(); play(); } }, { threshold: .5 });
    observer.observe(element);
    return () => { observer.disconnect(); cancelAnimationFrame(run.current); };
  }, [text]);
  return <Tag ref={root} className={`bs-scramble ${className}`} onPointerEnter={(event: PointerEvent) => { if (event.pointerType === 'mouse') play(); }}>
    <span className="bs-sr-only">{text}</span>
    <span aria-hidden="true">{shown}</span>
  </Tag>;
}

/** Letters that grow bolder, and lean toward the accent, the closer the mouse comes. Best with a variable font. Screen readers hear the plain text; touch and reduced motion see it at rest. */
export function ProximityText({ text, as: Tag = 'p', radius = 140, className = '' }: { text: string; as?: ElementType; radius?: number; className?: string }) {
  const root = useRef<HTMLElement>(null);
  const mouse = useRef<{ x: number; y: number } | null>(null);
  const wake = useVisibleLoop(root, () => {
    const element = root.current;
    if (!element) return false;
    let moving = false;
    element.querySelectorAll<HTMLElement>('.bs-proximity__letter').forEach(letter => {
      const box = letter.getBoundingClientRect(), m = mouse.current;
      const target = m ? Math.max(0, 1 - Math.hypot(box.left + box.width / 2 - m.x, box.top + box.height / 2 - m.y) / radius) : 0;
      const current = Number(letter.style.getPropertyValue('--p') || 0), next = current + (target - current) * .25;
      if (Math.abs(target - next) > .002) moving = true;
      letter.style.setProperty('--p', (Math.abs(target - next) > .002 ? next : target).toFixed(3));
    });
    return moving;
  });
  const track = (event: PointerEvent, inside: boolean) => {
    if (event.pointerType !== 'mouse' || reducedMotion()) return;
    mouse.current = inside ? { x: event.clientX, y: event.clientY } : null;
    wake.current();
  };
  const words = text.split(/(\s+)/);
  return <Tag ref={root} className={`bs-proximity ${className}`} onPointerMove={(event: PointerEvent) => track(event, true)} onPointerLeave={(event: PointerEvent) => track(event, false)}>
    <span className="bs-sr-only">{text}</span>
    <span aria-hidden="true">{words.map((word, at) => /\s/.test(word) ? word : <span key={at} className="bs-proximity__word">{[...word].map((letter, position) => <span key={position} className="bs-proximity__letter">{letter}</span>)}</span>)}</span>
  </Tag>;
}

/**
 * A big headline with a video playing inside its letters. The text stays real: selectable, and read by screen readers.
 * Until the video can draw, without JavaScript, and under reduced motion (which shows the first frame), it is ordinary type.
 */
export function VideoText({ text, src, as: Tag = 'h2', className = '' }: { text: string; src: string; as?: ElementType; className?: string }) {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const draw = () => {
    const element = root.current, surface = canvas.current, clip = video.current;
    const context = surface?.getContext('2d');
    if (!element || !surface || !clip || !context || clip.readyState < 2) return false;
    const box = element.getBoundingClientRect(), scale = Math.min(devicePixelRatio || 1, 2);
    const width = Math.round(box.width * scale), height = Math.round(box.height * scale);
    if (surface.width !== width || surface.height !== height) { surface.width = width; surface.height = height; }
    const style = getComputedStyle(element);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, box.width, box.height);
    context.globalCompositeOperation = 'source-over';
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    context.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing;
    context.textBaseline = 'alphabetic';
    context.fillStyle = '#000';
    // Paint each word where the browser laid it out, so wrapping, alignment and spacing match the real text.
    const words = element.querySelector('.bs-videotext__text')!;
    const range = document.createRange();
    for (const node of words.childNodes) {
      const content = node.textContent ?? '';
      for (const match of content.matchAll(/\S+/g)) {
        range.setStart(node, match.index!); range.setEnd(node, match.index! + match[0].length);
        const rect = range.getClientRects()[0];
        if (!rect) continue;
        const metrics = context.measureText(match[0]);
        context.fillText(match[0], rect.left - box.left, rect.top - box.top + (rect.height - metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) / 2 + metrics.fontBoundingBoxAscent);
      }
    }
    context.globalCompositeOperation = 'source-in';
    const ratio = Math.max(box.width / clip.videoWidth, box.height / clip.videoHeight);
    context.drawImage(clip, (box.width - clip.videoWidth * ratio) / 2, (box.height - clip.videoHeight * ratio) / 2, clip.videoWidth * ratio, clip.videoHeight * ratio);
    element.dataset.ready = '';
    return !clip.paused;
  };
  const wake = useVisibleLoop(root, draw);
  useEffect(() => {
    const clip = video.current, element = root.current;
    if (!clip || !element) return;
    const still = reducedMotion();
    const start = () => { if (still) draw(); else clip.play().then(() => wake.current(), () => draw()); };
    const observer = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) start(); else clip.pause(); });
    clip.addEventListener('loadeddata', () => { if (still) draw(); }, { once: true });
    const redraw = () => { if (clip.paused) draw(); };
    window.addEventListener('resize', redraw);
    document.fonts?.ready.then(redraw);
    observer.observe(element);
    return () => { observer.disconnect(); clip.pause(); window.removeEventListener('resize', redraw); };
  }, [src]);
  return <Tag ref={root} className={`bs-videotext ${className}`}>
    <span className="bs-videotext__text">{text}</span>
    <canvas ref={canvas} className="bs-videotext__canvas" aria-hidden="true" />
    <video ref={video} src={src} muted loop playsInline preload="auto" aria-hidden="true" tabIndex={-1} className="bs-videotext__video" />
  </Tag>;
}

/** A line of text set around a circle that slowly turns, with anything you like in the middle. It stands still under reduced motion. */
export function CircularText({ text, size = 128, duration = 18, children, className = '' }: { text: string; size?: number; duration?: number; children?: ReactNode; className?: string }) {
  const id = `bs-circle${useId().replace(/[^a-z0-9]/gi, '')}`;
  return <span className={`bs-circle ${className}`} style={{ '--bs-circle-size': `${size}px`, '--bs-circle-duration': `${duration}s` } as CSSProperties}>
    <span className="bs-sr-only">{text}</span>
    <svg className="bs-circle__ring" viewBox="0 0 100 100" aria-hidden="true">
      <path id={id} d="M50 50m-38 0a38 38 0 1 1 76 0a38 38 0 1 1-76 0" fill="none" />
      <text><textPath href={`#${id}`} textLength={2 * Math.PI * 38 - 2} lengthAdjust="spacing">{text}</textPath></text>
    </svg>
    {children && <span className="bs-circle__center">{children}</span>}
  </span>;
}

/** Sizes a 2D canvas to its CSS box at up to 2x density and returns the context scaled to CSS pixels. */
function fit2d(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d');
  if (!context) return null;
  const scale = Math.min(devicePixelRatio || 1, 2), width = canvas.clientWidth, height = canvas.clientHeight;
  if (canvas.width !== Math.round(width * scale) || canvas.height !== Math.round(height * scale)) { canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale); }
  context.setTransform(scale, 0, 0, scale, 0, 0);
  return { context, width, height };
}

/** A field of dots behind your content. Near the mouse they swell, take the accent colour and lean away, then settle. Touch and reduced motion see a still pattern. */
export function DotGrid({ gap = 22, radius = 130, className = '', children, ...props }: HTMLAttributes<HTMLDivElement> & { gap?: number; radius?: number }) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -1e4, y: -1e4, strength: 0, target: 0 });
  const paint = () => {
    const element = root.current, surface = canvas.current;
    const fitted = surface && fit2d(surface);
    if (!element || !fitted) return false;
    const { context, width, height } = fitted, m = mouse.current, style = getComputedStyle(element);
    m.strength += (m.target - m.strength) * .12;
    context.clearRect(0, 0, width, height);
    const ink = style.getPropertyValue('--bs-line').trim() || '#999', accent = style.getPropertyValue('--bs-accent').trim() || '#06f';
    for (let y = gap / 2; y < height; y += gap) for (let x = gap / 2; x < width; x += gap) {
      const dx = x - m.x, dy = y - m.y, distance = Math.hypot(dx, dy);
      const near = Math.max(0, 1 - distance / radius) * m.strength;
      const push = near * near * gap * .6 / (distance || 1);
      context.fillStyle = near > .15 ? accent : ink;
      context.globalAlpha = .55 + near * .45;
      context.beginPath();
      context.arc(x + dx * push, y + dy * push, 1.2 + near * 2.4, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    return Math.abs(m.target - m.strength) > .01;
  };
  const wake = useVisibleLoop(root, paint);
  useEffect(() => {
    const redraw = () => wake.current();
    window.addEventListener('resize', redraw);
    return () => window.removeEventListener('resize', redraw);
  }, []);
  const track = (event: PointerEvent<HTMLDivElement>, inside: boolean) => {
    if (event.pointerType !== 'mouse' || reducedMotion()) return;
    const box = event.currentTarget.getBoundingClientRect(), m = mouse.current;
    if (inside) { m.x = event.clientX - box.left; m.y = event.clientY - box.top; }
    m.target = inside ? 1 : 0;
    wake.current();
  };
  return <div {...props} ref={root} className={`bs-dotgrid ${className}`} onPointerMove={event => track(event, true)} onPointerLeave={event => track(event, false)}>
    <canvas ref={canvas} className="bs-dotgrid__canvas" aria-hidden="true" />
    {children && <div className="bs-dotgrid__content">{children}</div>}
  </div>;
}

interface Particle { x: number; y: number; vx: number; vy: number; size: number; accent: boolean }

/** Specks that drift slowly behind your content and scatter from the mouse. Some take the accent colour. It pauses off screen, and reduced motion holds one still frame. */
export function ParticleField({ count = 80, className = '', children, ...props }: HTMLAttributes<HTMLDivElement> & { count?: number }) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const mouse = useRef<{ x: number; y: number } | null>(null);
  const last = useRef(0);
  const colours = useRef({ ink: '', accent: '', read: 0 });
  useVisibleLoop(root, time => {
    const element = root.current, surface = canvas.current;
    const fitted = surface && fit2d(surface);
    if (!element || !fitted) return false;
    const { context, width, height } = fitted, still = reducedMotion();
    if (particles.current.length !== count) {
      // A fixed stride instead of Math.random keeps the layout the same on every visit.
      particles.current = Array.from({ length: count }, (_, i) => ({ x: ((i * 0.618034) % 1) * width, y: ((i * 0.381966 * 3.7) % 1) * height, vx: Math.cos(i * 2.4) * 8, vy: Math.sin(i * 2.4) * 8, size: 1 + ((i * 7) % 5) / 2.5, accent: i % 5 === 0 }));
    }
    if (time - colours.current.read > 1000) {
      const style = getComputedStyle(element);
      colours.current = { ink: style.getPropertyValue('--bs-ink').trim() || '#222', accent: style.getPropertyValue('--bs-accent').trim() || '#06f', read: time };
    }
    const delta = last.current ? Math.min(time - last.current, 50) / 1000 : 0;
    last.current = time;
    context.clearRect(0, 0, width, height);
    for (const p of particles.current) {
      const m = mouse.current;
      if (m) {
        const dx = p.x - m.x, dy = p.y - m.y, distance = Math.hypot(dx, dy) || 1;
        if (distance < 120) { const push = (1 - distance / 120) * 900 * delta; p.vx += (dx / distance) * push; p.vy += (dy / distance) * push; }
      }
      p.vx += (Math.sign(p.vx || 1) * 8 - p.vx) * .02; p.vy += (Math.sign(p.vy || 1) * 8 - p.vy) * .02;
      p.x = (p.x + p.vx * delta + width) % width; p.y = (p.y + p.vy * delta + height) % height;
      context.globalAlpha = p.accent ? .9 : .35;
      context.fillStyle = p.accent ? colours.current.accent : colours.current.ink;
      context.beginPath();
      context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    return !still;
  });
  const track = (event: PointerEvent<HTMLDivElement>, inside: boolean) => {
    if (event.pointerType !== 'mouse') return;
    const box = event.currentTarget.getBoundingClientRect();
    mouse.current = inside ? { x: event.clientX - box.left, y: event.clientY - box.top } : null;
  };
  return <div {...props} ref={root} className={`bs-particles ${className}`} onPointerMove={event => track(event, true)} onPointerLeave={event => track(event, false)}>
    <canvas ref={canvas} className="bs-particles__canvas" aria-hidden="true" />
    {children && <div className="bs-particles__content">{children}</div>}
  </div>;
}
