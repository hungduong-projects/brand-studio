import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ActionLink, BrandTheme } from '@brand-studio/ui';
import '@fontsource-variable/geist';
import { chargeClip, dialClip, foldClip, micsClip, noiseClip, spatialClip } from './hollis-clips';
import type { Clip } from './hollis-clips';
import type { Part } from './hollis-model';
import hollis from './hollis.brand.json';
import './hollis.css';

/* Hollis One is a fictional product. Structure studied from hardware product pages; every visual renders in code. */

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const accentOf = (el: Element) => getComputedStyle(el).getPropertyValue('--bs-accent').trim();

/**
 * Optional local-only media: when public/local-ref/apple/manifest.json exists (git-ignored, never deployed),
 * its videos and images replace the code-rendered visuals slot by slot. `?media=code` forces the code visuals.
 */
interface Media { src: string; poster?: string; alt: string }
const LocalMedia = createContext<Record<string, Media>>({});
const isVideo = (m: Media) => /\.(mp4|webm|mov)$/i.test(m.src);

function useLocalManifest() {
  const [media, setMedia] = useState<Record<string, Media>>({});
  useEffect(() => {
    if (new URLSearchParams(location.search).get('media') === 'code') return;
    fetch('/local-ref/apple/manifest.json').then(r => r.ok && r.headers.get('content-type')?.includes('json') ? r.json() : {}).then(setMedia).catch(() => {});
  }, []);
  return media;
}

/** Play/pause state shared by canvas clips and local videos: plays while half visible, active and not paused. */
function usePlayback<T extends Element>(active: boolean) {
  const ref = useRef<T>(null);
  const [paused, setPaused] = useState(reduced);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([entry]) => setVisible(entry.intersectionRatio >= .5), { threshold: [0, .5] });
    io.observe(ref.current!);
    return () => io.disconnect();
  }, []);
  return { ref, paused, setPaused, playing: active && visible && !paused };
}

function Toggle({ paused, onToggle, label }: { paused: boolean; onToggle: () => void; label: string }) {
  return <button type="button" className="ho-clip__toggle" aria-pressed={paused} onClick={onToggle} aria-label={`${paused ? 'Play' : 'Pause'}: ${label}`}>
    <svg viewBox="0 0 16 16" aria-hidden="true">{paused ? <path d="M4 2.5v11l9.5-5.5z" /> : <path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z" />}</svg>
  </button>;
}

function MediaClip({ media, active = true }: { media: Media; active?: boolean }) {
  return isVideo(media) ? <VideoClip media={media} active={active} /> : <div className="ho-clip"><img src={media.src} alt={media.alt} /></div>;
}

function VideoClip({ media, active }: { media: Media; active: boolean }) {
  const { ref, paused, setPaused, playing } = usePlayback<HTMLVideoElement>(active);
  useEffect(() => { if (playing) ref.current?.play().catch(() => {}); else ref.current?.pause(); }, [playing, ref]);
  return <div className="ho-clip">
    <video ref={ref} src={media.src} poster={media.poster} muted loop playsInline preload="metadata" aria-label={media.alt} />
    <Toggle paused={paused} onToggle={() => setPaused(!paused)} label={media.alt} />
  </div>;
}

/** A local media file for `slot` when the manifest has one, otherwise the code-rendered clip. */
function Visual({ slot, active, ...clip }: { slot: string; active?: boolean; create: (canvas: HTMLCanvasElement) => Clip | Promise<Clip>; label: string }) {
  const media = useContext(LocalMedia)[slot];
  return media ? <MediaClip media={media} active={active} /> : <ClipCanvas {...clip} active={active} />;
}

const parts: { part: Part; name: string }[] = [
  { part: 'band', name: 'Steel headband' },
  { part: 'shell', name: 'Aluminium shell' },
  { part: 'driver', name: '40 mm driver' },
  { part: 'cushion', name: 'Memory-foam cushion' },
];

function Hero() {
  const video = useContext(LocalMedia).hero;
  return video ? <VideoHero media={video} /> : <BrandTheme palette={hollis.tokens} mode="dark"><ModelHero /></BrandTheme>;
}

function VideoHero({ media }: { media: Media }) {
  return <section className="ho-hero ho-hero--video" aria-labelledby="ho-title">
    <HeroCopy />
    <video src={media.src} poster={media.poster} muted loop playsInline autoPlay={!reduced()} aria-label={media.alt} />
  </section>;
}

function HeroCopy() {
  return <div className="ho-hero__copy bs-container">
    <h1 id="ho-title">Hollis One</h1>
    <p>Over-ear wireless headphones. 40 hours per charge.</p>
    <div className="ho-actions"><ActionLink href="#specs" shape="pill">See the specs</ActionLink><ActionLink href="#clips" tone="secondary" shape="pill">Watch the clips</ActionLink></div>
  </div>;
}

function ModelHero() {
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const labels = useRef<(HTMLLIElement | null)[]>([]);
  useEffect(() => {
    let stop: (() => void) | undefined, gone = false;
    import('./hollis-model').then(({ startHeroStage }) => {
      if (gone || !canvas.current || !section.current) return;
      try {
        stop = startHeroStage(canvas.current, section.current, parts.map((p, i) => ({ el: labels.current[i]!, part: p.part })), accentOf(section.current), reduced());
        section.current.dataset.ready = '';
      } catch { /* No WebGL: the copy and the part list still read in normal flow. */ }
    });
    return () => { gone = true; stop?.(); };
  }, []);
  return <section className="ho-hero" ref={section} aria-labelledby="ho-title">
    <div className="ho-hero__pin">
      <canvas className="ho-hero__canvas" ref={canvas} aria-hidden="true" />
      <HeroCopy />
      <p className="ho-hero__caption">Four parts per side. Scroll to take one apart.</p>
      <ul className="ho-parts" aria-label="Parts">
        {parts.map((p, i) => <li key={p.part} ref={el => { labels.current[i] = el; }}><span>{p.name}</span></li>)}
      </ul>
    </div>
  </section>;
}

function CountUp({ to, decimals = 0 }: { to: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(to);
  useEffect(() => {
    const el = ref.current!;
    if (reduced() || el.getBoundingClientRect().top < innerHeight) return;
    setValue(0);
    let frame = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - start) / 1400);
        setValue(to * (1 - (1 - k) ** 3));
        if (k < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: .6 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(frame); };
  }, [to]);
  return <span ref={ref}>{value.toFixed(decimals)}</span>;
}

const specs = [
  { to: 40, unit: 'h', label: 'playback per charge, noise cancelling on' },
  { to: 5, unit: 'min', label: 'on USB-C for 3 hours of playback' },
  { to: 312, unit: 'g', label: 'with the cushions on' },
  { to: 6, unit: '', label: 'microphones: four for calls, two for noise' },
];

function Specs() {
  return <section className="ho-specs bs-container" id="specs" aria-labelledby="ho-specs-title">
    <h2 id="ho-specs-title">Hollis One in numbers.</h2>
    <dl>{specs.map(s => <div key={s.label}><dt><CountUp to={s.to} /><small>{s.unit}</small></dt><dd>{s.label}</dd></div>)}</dl>
  </section>;
}

/**
 * A looping clip on a canvas. Plays while at least half visible, keeps its own pause button,
 * and shows one still frame under reduced motion.
 */
function ClipCanvas({ create, label, active = true, still = 2.4 }: { create: (canvas: HTMLCanvasElement) => Clip | Promise<Clip>; label: string; active?: boolean; still?: number }) {
  const { ref: canvas, paused, setPaused, playing } = usePlayback<HTMLCanvasElement>(active);
  const clip = useRef<Clip>(null);
  const time = useRef(still);

  useEffect(() => {
    const el = canvas.current!;
    let gone = false;
    const ro = new ResizeObserver(() => { clip.current?.resize(); clip.current?.draw(time.current); });
    Promise.resolve(create(el)).then(c => {
      if (gone) return c.dispose();
      clip.current = c; c.resize(); c.draw(time.current); ro.observe(el);
    }).catch(() => { /* No WebGL: the caption carries the clip. */ });
    return () => { gone = true; ro.disconnect(); clip.current?.dispose(); clip.current = null; };
  }, [create, canvas]);

  useEffect(() => {
    if (!playing) return;
    let frame = 0, last = performance.now();
    const tick = (now: number) => {
      time.current += Math.min(.1, (now - last) / 1000); last = now;
      clip.current?.draw(time.current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  return <div className="ho-clip">
    <canvas ref={canvas} role="img" aria-label={label} />
    <Toggle paused={paused} onToggle={() => setPaused(!paused)} label={label} />
  </div>;
}

const features = [
  { id: 'anc', title: 'Noise cancelling', body: 'Two outer microphones hear the room. The driver plays the inverse wave, so the two cancel.', clip: noiseClip, label: 'Clip: a noise wave, its inverse, and their sum going flat.' },
  { id: 'spatial', title: 'Head tracking', body: 'Turn your head and the sound stays where it was in the room.', clip: spatialClip, label: 'Clip: a head seen from above turns while three sound sources stay still.' },
  { id: 'charge', title: 'Fast charge', body: 'Five minutes on USB-C gives three hours of playback.', clip: chargeClip, label: 'Clip: a ring fills from 0 to 3 hours as 5 minutes pass.' },
];

function Features() {
  const section = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    const media = matchMedia('(min-width: 900px) and (prefers-reduced-motion: no-preference)');
    const sync = () => setPinned(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  useEffect(() => {
    if (!pinned) return;
    const onScroll = () => {
      const rect = section.current!.getBoundingClientRect();
      const p = Math.min(.999, Math.max(0, -rect.top / (rect.height - innerHeight)));
      setActive(Math.floor(p * features.length));
    };
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, [pinned]);
  return <section className="ho-features" ref={section} data-pinned={pinned || undefined} aria-labelledby="ho-features-title" style={{ '--count': features.length } as CSSProperties}>
    <div className="ho-features__pin bs-container">
      <h2 id="ho-features-title">Noise cancelling, head tracking, fast charge.</h2>
      <ol>{features.map((f, i) => <li key={f.id} aria-current={pinned && i === active ? 'step' : undefined}>
        <h3>{f.title}</h3><p>{f.body}</p>
        <figure className="ho-features__visual"><Visual slot={f.id} create={f.clip} label={f.label} active={!pinned || i === active} /></figure>
      </li>)}</ol>
    </div>
  </section>;
}

const turntable = (canvas: HTMLCanvasElement) => import('./hollis-model').then(m => m.createTurntable(canvas, accentOf(canvas)));

const tiles = [
  { id: 'turn', create: turntable, caption: 'One full turn every 12 seconds.', label: 'Clip: Hollis One turning on a turntable.', wide: true },
  { id: 'dial', create: dialClip, caption: 'Turn the dial for volume.', label: 'Clip: a dial turns and volume bars rise and fall.' },
  { id: 'fold', create: foldClip, caption: 'The cups turn flat for the case.', label: 'Clip: both cups rotate flat, then back.' },
  { id: 'mics', create: micsClip, caption: 'Four microphones aim at your voice on calls.', label: 'Clip: four microphones send a beam toward the mouth.', wide: true },
];

function Clips() {
  return <section className="ho-clips bs-container" id="clips" aria-labelledby="ho-clips-title">
    <h2 id="ho-clips-title">Four clips, drawn in code.</h2>
    <p className="ho-lead">Each one plays when it scrolls into view. Use the button in the corner to pause it.</p>
    <div className="ho-bento">{tiles.map(t => <figure key={t.id} className={t.wide ? 'ho-tile ho-tile--wide' : 'ho-tile'}>
      <Visual slot={t.id} create={t.create} label={t.label} />
      <figcaption>{t.caption}</figcaption>
    </figure>)}</div>
  </section>;
}

export function Hollis() {
  const media = useLocalManifest();
  return <LocalMedia value={media}><BrandTheme palette={hollis.tokens} mode="light" className="ho">
    <a className="skip-link" href="#main">Skip to content</a>
    <BrandTheme palette={hollis.tokens} mode="dark" className="ho-header"><header><a href="/hollis" className="ho-wordmark">Hollis</a><nav aria-label="Hollis"><a href="#specs">Specs</a><a href="#features">Features</a><a href="#clips">Clips</a><a href="/">Studio</a></nav></header></BrandTheme>
    <main id="main" tabIndex={-1}>
      <Hero />
      <Specs />
      <div id="features"><Features /></div>
      <BrandTheme palette={hollis.tokens} mode="dark"><Clips /></BrandTheme>
    </main>
    <footer className="ho-footer bs-container"><p>Hollis One is a fictional product for a layout study. The specs are made up. The model and clips render in code; no third-party media, copy or fonts.</p><a href="/">Brand Studio</a></footer>
  </BrandTheme></LocalMedia>;
}
