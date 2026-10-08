// Tutorial film: a how-to video drawn from screens that scripts/tutorial-capture.mjs captured in the real product.
// The capture writes manifest.json; a project film is three lines that import it and call mountTutorial. Every value is a
// function of the time `t`, so film-render.mjs can seek any frame. Run film-render with `--assets <capture dir>` so the
// screen files sit next to the bundled film.
import type { CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { BrowserWindow, Cursor, cameraAt, curves, ease, keys, rise } from './kit';
import type { CursorPoint, Shot } from './kit';
import './tutorial.css';

export interface Box { x: number; y: number; width: number; height: number }
export type TutorialAction = 'goto' | 'view' | 'click' | 'fill' | 'select' | 'upload' | 'press';
/** One step as tutorial-capture.mjs records it: the screen before the action, the target box in page pixels and, for a fill, the screens while it types. */
export interface TutorialStep { caption: string; note?: string; action: TutorialAction; shot: string; box?: Box; typing?: string[]; key?: string }
export interface TutorialManifest { app: string; title: string; url: string; viewport: [number, number]; steps: TutorialStep[]; end: string }
export interface TutorialOptions {
  /** Semantic colours from the brand contract. */
  colors: { ink: string; surface: string; accent: string; muted: string; stage: string; onInk: string };
  font?: string;
  logo?: string;
  /** The line on the closing card, such as where to find this guide again. */
  outro?: string;
}

// The browser window is 840 world pixels wide; the rail of steps takes the left of the 1152x648 frame.
const WINDOW = { left: 288, width: 840, bar: 34 };
const INTRO = 2.6, OUTRO = 2.8, ZOOM = 1.35, FRAME = .15;
// The rail shows up to ROWS steps of ROW pixels and scrolls so the current step stays third from the top.
const ROWS = 7, ROW = 50;

const stepLength = (step: TutorialStep) =>
  step.action === 'fill' ? 2.4 + (step.typing?.length ?? 0) * FRAME
    : step.action === 'goto' || step.action === 'view' ? 2.6
      : 2.9;
/** When the action lands, in seconds from the step's start: the click, the first typed frame or the key press. */
const actAt = (step: TutorialStep) => step.action === 'fill' ? 1.25 : step.action === 'press' ? 1.1 : 1.5;

/** The timeline of a tutorial: step windows, which screen shows when, where the camera and cursor go, and the length. */
export function tutorialPlan(manifest: TutorialManifest) {
  const scale = WINDOW.width / manifest.viewport[0];
  const height = WINDOW.bar + manifest.viewport[1] * scale;
  const toWorld = (box: Box) => ({ x: (box.x + box.width / 2) * scale, y: WINDOW.bar + (box.y + box.height / 2) * scale, width: box.width * scale, height: box.height * scale });
  const centre = { x: WINDOW.width / 2, y: height / 2 };
  const clamp = (v: number, size: number, zoom: number) => Math.min(size - size / (2 * zoom), Math.max(size / (2 * zoom), v));

  const steps: { start: number; end: number; act: number }[] = [];
  const screens: { at: number; src: string; fade: number }[] = [];
  const shots: Shot[] = [{ at: 0, ...centre, zoom: 1 }];
  const cursor: CursorPoint[] = [];
  const rings: { start: number; end: number; x: number; y: number; width: number; height: number }[] = [];
  let at = INTRO, last = { ...centre, zoom: 1 };

  manifest.steps.forEach((step, i) => {
    const length = stepLength(step), act = at + actAt(step), next = manifest.steps[i + 1]?.shot ?? manifest.end;
    steps.push({ start: at, end: at + length, act });
    // Each step opens on its own screen; after an action it already shows, so the repeat is invisible.
    screens.push({ at, src: step.shot, fade: i === 0 ? 0 : .22 });
    const moves = step.action !== 'goto' && step.action !== 'press';
    if (step.box && moves) {
      const target = toWorld(step.box);
      // Zoom in less on a wide or tall target, so the whole target stays in view.
      const zoom = Math.max(1, Math.min(ZOOM, .92 * WINDOW.width / target.width, .92 * height / target.height));
      const aimAt = { x: clamp(target.x, WINDOW.width, zoom), y: clamp(target.y, height, zoom), zoom };
      shots.push({ at: at + .15, ...last }, { at: at + .95, ...aimAt });
      last = aimAt;
      const from = cursor.at(-1) ?? { x: target.x + 90, y: target.y + 70 };
      cursor.push({ at: at + .3, x: from.x, y: from.y }, { at: act - .2, x: target.x, y: target.y, click: step.action !== 'view' });
      rings.push({ start: act - .55, end: step.action === 'view' ? at + length - .2 : act + .35, ...target });
    }
    if (step.action === 'fill') step.typing?.forEach((src, k) => screens.push({ at: act + .15 + k * FRAME, src, fade: 0 }));
    if (step.action !== 'goto' && step.action !== 'view') screens.push({ at: step.action === 'fill' ? act + .15 + (step.typing?.length ?? 0) * FRAME : act + .15, src: next, fade: step.action === 'fill' ? 0 : .22 });
    at += length;
  });
  shots.push({ at: at + .1, ...last }, { at: at + .9, ...centre, zoom: 1 });
  return { steps, screens, shots, cursor, rings, scale, height, outro: at + .4, seconds: at + .4 + OUTRO };
}

function Rail({ t, manifest, plan }: { t: number; manifest: TutorialManifest; plan: ReturnType<typeof tutorialPlan> }) {
  const current = plan.steps.findLastIndex(step => t >= step.start);
  const progress = current < 0 ? 0 : Math.min(1, (current + Math.min(1, (t - plan.steps[current].start) / (plan.steps[current].end - plan.steps[current].start))) / plan.steps.length);
  return <aside className="tf-rail" style={rise(t, INTRO + .05, plan.outro + .3, 10)}>
    <p className="tf-app">{manifest.app}</p>
    <p className="tf-title">{manifest.title}</p>
    <div className="tf-progress"><i style={{ scale: `${progress} 1` }} /></div>
    <div className="tf-steps" style={{ height: Math.min(ROWS, manifest.steps.length) * ROW }}>
    <ol style={{ translate: `0 ${-keys(t, plan.steps.map((step, i) => [step.start - .3 + .001 * i, Math.max(0, Math.min(i - 2, manifest.steps.length - ROWS)) * ROW] as [number, number]))}px` }}>
      {manifest.steps.map((step, i) => {
        const state = i < current ? 'done' : i === current ? 'now' : 'next';
        return <li key={i} className={`tf-step tf-step--${state}`}>
          <span className="tf-step__n">{state === 'done' ? '✓' : i + 1}</span>
          <span className="tf-step__text">{step.caption}</span>
        </li>;
      })}
    </ol>
    </div>
  </aside>;
}

function Screen({ t, plan, manifest }: { t: number; plan: ReturnType<typeof tutorialPlan>; manifest: TutorialManifest }) {
  const index = plan.screens.findLastIndex(screen => t >= screen.at);
  const shown = plan.screens[Math.max(0, index)], before = plan.screens[index - 1];
  const fade = shown.fade ? ease(t, shown.at, shown.fade, curves.inOut) : 1;
  const camera = cameraAt(t, plan.shots);
  const ringStyle = (ring: (typeof plan.rings)[number]): CSSProperties => {
    const p = Math.min(ease(t, ring.start, .3), 1 - ease(t, ring.end, .25, curves.in));
    return { left: ring.x - ring.width / 2 - 6, top: ring.y - ring.height / 2 - 6, width: ring.width + 12, height: ring.height + 12, opacity: p, scale: `${1.06 - .06 * p}` };
  };
  return <div className="tf-viewport" style={{ height: plan.height, ...rise(t, INTRO + .25, plan.outro + .3, 18) }}>
    <div className="tf-world" style={{ transform: `translate(${WINDOW.width / 2}px, ${plan.height / 2}px) scale(${camera.zoom}) translate(${-camera.x}px, ${-camera.y}px)` }}>
      <BrowserWindow url={manifest.url} style={{ left: 0, top: 0, width: WINDOW.width, height: plan.height }}>
        {before && fade < 1 && <img className="tf-shot" src={before.src} alt="" />}
        <img className="tf-shot" src={shown.src} alt="" style={{ opacity: fade }} />
      </BrowserWindow>
      {plan.rings.filter(ring => t >= ring.start && t < ring.end + .3).map(ring => <span key={ring.start} className="tf-ring" style={ringStyle(ring)} />)}
      {plan.cursor.length > 0 && <Cursor t={t} path={plan.cursor} />}
    </div>
  </div>;
}

function Card({ t, start, end, logo, kicker, title, line }: { t: number; start: number; end: number; logo?: string; kicker: string; title: string; line: string }) {
  if (t < start - .01 || t > end + .01) return null;
  const p = Math.min(ease(t, start, .5), 1 - ease(t, end - .35, .35, curves.in));
  return <div className="tf-card" style={{ opacity: p }}>
    {logo && <img className="tf-card__logo" src={logo} alt="" style={rise(t, start + .1, end)} />}
    <p className="tf-card__kicker" style={rise(t, start + .25, end)}>{kicker}</p>
    <p className="tf-card__title" style={rise(t, start + .35, end, 22)}>{title}</p>
    <p className="tf-card__line" style={rise(t, start + .6, end)}>{line}</p>
  </div>;
}

/** Mounts the tutorial and wires window.film and window.seek for film-render.mjs. */
export function mountTutorial(manifest: TutorialManifest, options: TutorialOptions) {
  const plan = tutorialPlan(manifest);
  const { colors } = options;
  const vars = { '--tf-ink': colors.ink, '--tf-surface': colors.surface, '--tf-accent': colors.accent, '--tf-muted': colors.muted, '--tf-stage': colors.stage, '--tf-on-ink': colors.onInk, fontFamily: options.font } as CSSProperties;
  const steps = `${manifest.steps.length} steps`;
  const Film = ({ t }: { t: number }) => <div className="tf-stage" style={vars}>
    <Rail t={t} manifest={manifest} plan={plan} />
    <Screen t={t} plan={plan} manifest={manifest} />
    <Card t={t} start={.2} end={INTRO + .2} logo={options.logo} kicker={`${manifest.app} · ${steps}`} title={manifest.title} line={manifest.url} />
    <Card t={t} start={plan.outro} end={plan.seconds} logo={options.logo} kicker="Done" title={manifest.title} line={options.outro ?? manifest.url} />
  </div>;

  const root = createRoot(document.getElementById('film')!);
  const film = window as unknown as { film: { seconds: number; posterAt: number }; seek: (t: number) => Promise<void> };
  film.film = { seconds: plan.seconds, posterAt: plan.steps[Math.min(1, plan.steps.length - 1)].act + .8 };
  film.seek = async t => {
    flushSync(() => root.render(<Film t={t} />));
    await Promise.all([...document.images].map(image => image.decode().catch(() => undefined)));
    await document.fonts.ready;
  };
}
