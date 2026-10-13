'use client';

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';

/* Paper desk kit: a desk seen in perspective, paper that lies on it, a highlighter pen that marks lines, and the
   lines that join a claim to its source. One number, p, drives every part: 0 is the first step and each whole
   number the next, so the step list, a drag, Play or a page scroll all move the same scene. */

export type Pt = [number, number];
export interface Camera { x: number; y: number; zoom: number; tilt: number; turn: number }
export interface Place { x: number; y: number; w: number; r: number; from?: { dx: number; dy: number; r: number }; t?: [number, number]; lift?: number }
export interface Frag { x: number; y: number; w: number; h: number; a: number; b: number }
export interface Stroke { key: string; sheet: string; frags: Frag[]; path: [Pt, Pt][] }
export interface PenPose { at: Pt; lift: number; rise: number; turn: number }

/** Desk size in its own pixels; the view scales it to fit. */
export const DESK = { w: 1000, h: 620 };

const clamp01 = (u: number) => Math.max(0, Math.min(1, u));
const ease = (u: number) => u * u * (3 - 2 * u);
const mix = (a: number, b: number, u: number) => a + (b - a) * u;
const mixPt = (a: Pt, b: Pt, u: number): Pt => [mix(a[0], b[0], u), mix(a[1], b[1], u)];

/** The camera between two steps, eased so it starts and stops gently. */
export function cameraAt(cams: Camera[], p: number): Camera {
  const i = Math.max(0, Math.min(Math.floor(p), cams.length - 2)), u = ease(clamp01(p - i)), a = cams[i]!, b = cams[i + 1]!;
  return { x: mix(a.x, b.x, u), y: mix(a.y, b.y, u), zoom: mix(a.zoom, b.zoom, u), tilt: mix(a.tilt, b.tilt, u), turn: mix(a.turn, b.turn, u) };
}

/** The camera puts its focus point at the middle of the view. */
export const deskTransform = (c: Camera, fit: number) =>
  `scale3d(${fit}, ${fit}, ${fit}) rotateX(${c.tilt}deg) rotateZ(${c.turn}deg) scale3d(${c.zoom}, ${c.zoom}, ${c.zoom}) translate(${-c.x}px, ${-c.y}px)`;

/** A point on a resting sheet, given in the sheet's own pixels, in desk pixels. Sheets turn about their middle. */
export function onDesk(sheet: { x: number; y: number; w: number; h: number; r: number }, local: Pt): Pt {
  const t = sheet.r * Math.PI / 180, vx = local[0] - sheet.w / 2, vy = local[1] - sheet.h / 2;
  return [sheet.x + sheet.w / 2 + vx * Math.cos(t) - vy * Math.sin(t), sheet.y + sheet.h / 2 + vx * Math.sin(t) + vy * Math.cos(t)];
}

/** Split one stroke's window across the lines it covers, by width, with a short lift at each line break. */
export function splitWindow(rects: { x: number; y: number; w: number; h: number }[], a: number, b: number): Frag[] {
  const total = rects.reduce((sum, r) => sum + r.w, 0) || 1, gap = rects.length > 1 ? .012 : 0;
  let done = 0;
  return rects.map((r, k) => {
    const from = a + (b - a) * done / total;
    done += r.w;
    const end = a + (b - a) * done / total;
    // A short word at a line end keeps most of its share; the gap never runs its window backwards.
    return { ...r, a: from, b: k < rects.length - 1 ? Math.max(from + (end - from) * .6, end - gap) : end };
  });
}

/** Where the pen is: lying at rest, travelling raised between lines, or pressed to the paper while it marks one. */
export function penAt(p: number, rest: PenPose, strokes: Stroke[], up: number, down: number, work = { rise: 30, turn: 58 }): PenPose {
  const keys: { t: number; at: Pt; down: boolean }[] = [{ t: up, at: rest.at, down: false }];
  for (const stroke of strokes) stroke.frags.forEach((frag, k) => {
    keys.push({ t: frag.a, at: stroke.path[k]![0], down: false }, { t: frag.b, at: stroke.path[k]![1], down: true });
  });
  keys.push({ t: down, at: rest.at, down: false });
  if (keys.length < 3 || p <= up || p >= down) return rest;
  let k = 0;
  while (k < keys.length - 2 && p >= keys[k + 1]!.t) k++;
  const from = keys[k]!, to = keys[k + 1]!, u = clamp01((p - from.t) / Math.max(1e-6, to.t - from.t));
  if (to.down) return { at: mixPt(from.at, to.at, u), lift: 0, rise: work.rise, turn: work.turn };
  const e = ease(u), far = Math.hypot(to.at[0] - from.at[0], to.at[1] - from.at[1]);
  const leaving = k === 0, landing = k === keys.length - 2;
  return {
    at: mixPt(from.at, to.at, e),
    lift: Math.sin(Math.PI * u) * Math.min(48, 6 + far * .22),
    rise: leaving ? mix(rest.rise, work.rise, e) : landing ? mix(work.rise, rest.rise, e) : work.rise,
    turn: leaving ? mix(rest.turn, work.turn, e) : landing ? mix(work.turn, rest.turn, e) : work.turn,
  };
}

/** Placeholder text drawn as rounded bars, the same on every render. The last line runs short. */
export function Greek({ seed, lines, words = 6, className = '' }: { seed: number; lines: number; words?: number; className?: string }) {
  let s = seed;
  const next = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  return <span className={`pd-greek ${className}`} aria-hidden="true">
    {Array.from({ length: lines }, (_, row) => <span key={row} style={row === lines - 1 && lines > 1 ? { width: `${45 + next() * 30}%` } : undefined}>
      {Array.from({ length: words - (next() > .6 ? 1 : 0) }, (_, k) => <i key={k} style={{ flexGrow: 2 + next() * 5 }} />)}
    </span>)}
  </span>;
}

/** A barcode as one gradient: bars and gaps one to three pixels wide. */
export function barcode(seed: number, width = 132) {
  let s = seed, x = 0, ink = true;
  const stops: string[] = [];
  while (x < width) {
    const w = 1 + Math.floor(((s = (s * 9301 + 49297) % 233280) / 233280) * 3);
    stops.push(`${ink ? 'var(--bs-ink)' : 'transparent'} ${x}px ${x + w}px`);
    x += w;
    ink = !ink;
  }
  return `linear-gradient(90deg, ${stops.join(', ')}) 0 0 / ${width}px 100% no-repeat`;
}

/** A sheet on the desk. It rests at `at`, turned `at.r` degrees, and slides in from `at.from` over the window `at.t`. */
export function Sheet({ name, at, className = '', marks = [], before, after, children }: {
  name: string; at: Place; className?: string; marks?: Frag[]; before?: ReactNode; after?: ReactNode; children: ReactNode;
}) {
  const style = { '--x': at.x, '--y': at.y, '--w': at.w, '--r': at.r, ...(at.from && at.t ? { '--dx': at.from.dx, '--dy': at.from.dy, '--r0': at.from.r, '--t0': at.t[0], '--t1': at.t[1], '--lift': at.lift ?? 0 } : {}) } as CSSProperties;
  return <div className={`pd-sheet ${className}`} data-sheet={name} data-turn={at.r} style={style}>
    {before}
    <div className="pd-paper">
      {marks.map((m, k) => <i key={k} className="pd-mark" style={{ '--x': m.x, '--y': m.y, '--mw': m.w, '--mh': m.h, '--a': m.a, '--b': m.b } as CSSProperties} />)}
      {children}
    </div>
    {after}
  </div>;
}

/** A highlighter seen from above: chisel felt, nose, barrel with a window, and the cap pushed onto the end. */
export function Pen({ id }: { id: string }) {
  const line = { stroke: 'var(--pd-pen-line)', strokeWidth: .6, strokeLinejoin: 'round' as const };
  return <svg viewBox="0 0 200 20" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-barrel`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="var(--pd-pen-lo)" /><stop offset=".2" stopColor="var(--pd-pen-hi)" /><stop offset=".45" stopColor="var(--bs-accent)" /><stop offset="1" stopColor="var(--pd-pen-lo)" />
      </linearGradient>
      <linearGradient id={`${id}-cap`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="var(--pd-cap-lo)" /><stop offset=".22" stopColor="var(--pd-cap-hi)" /><stop offset=".5" stopColor="var(--pd-cap)" /><stop offset="1" stopColor="var(--pd-cap-lo)" />
      </linearGradient>
      <linearGradient id={`${id}-nose`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="var(--pd-nose-lo)" /><stop offset=".25" stopColor="var(--pd-nose-hi)" /><stop offset="1" stopColor="var(--pd-nose-lo)" />
      </linearGradient>
    </defs>
    <path d="M.8 8.4 9 5.8V14.2L1.8 12.4Z" fill="var(--pd-felt)" {...line} />
    <path d="M9 4.8 23 2.4H30V17.6H23L9 15.2Z" fill={`url(#${id}-nose)`} {...line} />
    <path d="M23 2.4V17.6" {...line} />
    <rect x="30" y=".9" width="116" height="18.2" rx="2.4" fill={`url(#${id}-barrel)`} {...line} />
    {[35, 38.5, 42, 45.5].map(x => <path key={x} d={`M${x} 2.2V17.8`} {...line} strokeOpacity=".45" />)}
    <rect x="66" y="6.4" width="42" height="7.2" rx="3.6" fill="var(--pd-window)" {...line} />
    <rect x="140" y=".2" width="58" height="19.6" rx="4.6" fill={`url(#${id}-cap)`} {...line} />
    <rect x="148" y="7.6" width="38" height="4.8" rx="2.4" fill="var(--pd-cap-hi)" {...line} />
    <path d="M193.4 1.2V18.8" {...line} />
  </svg>;
}

/** A wire paper clip; the scene places it over a sheet's top edge. */
export const Clip = () => <svg className="pd-clip" viewBox="0 0 18 56" aria-hidden="true">
  <path d="M5.5 44V10a3.75 3.75 0 0 1 7.5 0v36a6 6 0 0 1-12 0V15" fill="none" stroke="var(--pd-wire)" strokeWidth="1.8" strokeLinecap="round" />
  <path d="M5.1 43.6V10a3.75 3.75 0 0 1 7.5 0v36a6 6 0 0 1-12 0V15" fill="none" stroke="var(--pd-wire-hi)" strokeWidth=".6" strokeLinecap="round" />
</svg>;

/** Steps, a softly sprung position, Play, a sideways drag and the arrow keys, all moving one number. */
export function useScrub({ steps, paint, position, onStepChange, dwell = 3400 }: {
  steps: number; paint: (p: number) => void; position?: number; onStepChange?: (step: number) => void; dwell?: number;
}) {
  const last = steps - 1;
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const draw = useRef(paint);
  draw.current = paint;
  const m = useRef({ pos: 0, speed: 0, target: 0, frame: 0, then: 0, tour: 0, grip: null as { id: number; x: number; pos: number; moved: boolean } | null }).current;
  const clamp = (value: number) => Math.max(0, Math.min(last, value));
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Critically damped at 3.1 rad/s: a step takes about a second and a half, slow enough to follow the pen.
  const tick = (now: number) => {
    const dt = m.then ? Math.min((now - m.then) / 1000, 1 / 30) : 0;
    m.then = now;
    m.speed += (-9.6 * (m.pos - m.target) - 6.2 * m.speed) * dt;
    m.pos = clamp(m.pos + m.speed * dt);
    const settled = Math.abs(m.target - m.pos) < .001 && Math.abs(m.speed) < .01;
    if (settled) { m.pos = m.target; m.speed = 0; m.then = 0; }
    draw.current(m.pos);
    m.frame = settled ? 0 : requestAnimationFrame(tick);
  };
  const hold = () => { cancelAnimationFrame(m.frame); m.frame = 0; m.then = 0; m.speed = 0; };
  const mark = (step: number) => {
    const next = clamp(step);
    if (next === m.target) return;
    m.target = next;
    setSelected(next);
    onStepChange?.(next);
  };
  const select = (step: number, focus = false) => {
    mark(step);
    if (focus) tabs.current[m.target]?.focus();
    if (still()) { hold(); m.pos = m.target; draw.current(m.pos); } else if (!m.frame) m.frame = requestAnimationFrame(tick);
  };
  const stop = () => { window.clearInterval(m.tour); m.tour = 0; setPlaying(false); };
  const play = () => {
    if (m.tour) { stop(); return; }
    select(m.target === last ? 0 : m.target + 1);
    if (m.target === last) return;
    setPlaying(true);
    m.tour = window.setInterval(() => { select(m.target + 1); if (m.target === last) stop(); }, dwell);
  };
  useEffect(() => { setReady(true); return () => { hold(); window.clearInterval(m.tour); }; }, []);
  useEffect(() => {
    if (position === undefined) return;
    stop();
    hold();
    m.pos = clamp(position);
    mark(Math.round(m.pos));
    draw.current(m.pos);
  }, [position]);
  const stage = {
    onPointerDown: (event: PointerEvent<HTMLElement>) => { if (!event.button) m.grip = { id: event.pointerId, x: event.clientX, pos: m.pos, moved: false }; },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const grip = m.grip;
      if (!grip || grip.id !== event.pointerId) return;
      const dx = event.clientX - grip.x;
      if (!grip.moved && Math.abs(dx) < 8) return;
      if (!grip.moved) { grip.moved = true; stop(); event.currentTarget.setPointerCapture(grip.id); }
      if (still()) return;
      hold();
      m.pos = clamp(grip.pos - dx / (event.currentTarget.clientWidth * .45));
      mark(Math.round(m.pos));
      draw.current(m.pos);
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      const grip = m.grip;
      if (!grip || grip.id !== event.pointerId) return;
      m.grip = null;
      const dx = event.clientX - grip.x;
      if (grip.moved) select(still() ? m.target - (Math.abs(dx) < 40 ? 0 : Math.sign(dx)) : Math.round(m.pos - Math.sign(dx) * .25));
    },
    onPointerCancel: () => { if (m.grip?.moved) select(m.target); m.grip = null; },
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const to = ({ ArrowRight: m.target + 1, ArrowDown: m.target + 1, ArrowLeft: m.target - 1, ArrowUp: m.target - 1, Home: 0, End: last } as Record<string, number>)[event.key];
    if (to === undefined) return;
    event.preventDefault();
    stop();
    select(to, true);
  };
  return { selected, playing, ready, tabs, stage, onKeyDown, play, choose: (step: number) => { stop(); select(step); }, now: () => m.pos };
}

export const kitCss = `
.pd { --pd-shade: var(--bs-ink); --pd-s: 1; --pd-hair: color-mix(in srgb, var(--bs-line) 50%, transparent); --pd-rule: color-mix(in srgb, var(--bs-line) 20%, transparent);
  --pd-greek: color-mix(in srgb, var(--bs-ink) 13%, transparent); --pd-greek-strong: color-mix(in srgb, var(--bs-ink) 72%, transparent);
  --pd-pad: color-mix(in srgb, var(--bs-surface), var(--bs-ink) 3.5%); --pd-pocket: color-mix(in srgb, var(--bs-surface), var(--bs-ink) 9%);
  --pd-felt: color-mix(in srgb, var(--bs-accent), #000 24%); --pd-pen-hi: color-mix(in srgb, var(--bs-accent), #fff 55%); --pd-pen-lo: color-mix(in srgb, var(--bs-accent), #000 22%);
  --pd-pen-line: color-mix(in srgb, var(--bs-accent), #000 60%); --pd-window: color-mix(in srgb, var(--bs-accent), #fff 30%);
  --pd-cap: #24262b; --pd-cap-hi: #4a4d55; --pd-cap-lo: #101114; --pd-nose-hi: #f4f4f1; --pd-nose-lo: #b9bcc2;
  --pd-wire: color-mix(in srgb, var(--bs-ink) 48%, var(--bs-elevated)); --pd-wire-hi: color-mix(in srgb, var(--bs-elevated) 80%, transparent);
  --pd-sticky: color-mix(in srgb, var(--bs-accent) 34%, var(--bs-elevated)); }
:where(.bs-theme[data-bs-theme="dark"]) .pd { --pd-shade: #000; --pd-s: 3.2; --pd-greek: color-mix(in srgb, var(--bs-ink) 16%, transparent); --pd-pad: color-mix(in srgb, var(--bs-surface), var(--bs-ink) 3%); --pd-pocket: color-mix(in srgb, var(--bs-surface), #000 40%); --pd-sticky: color-mix(in srgb, var(--bs-accent) 82%, var(--bs-elevated)); --pd-wire-hi: color-mix(in srgb, var(--bs-ink) 40%, transparent); }
@media (prefers-color-scheme: dark) { :where(.bs-theme[data-bs-theme="system"]) .pd { --pd-shade: #000; --pd-s: 3.2; --pd-greek: color-mix(in srgb, var(--bs-ink) 16%, transparent); --pd-pad: color-mix(in srgb, var(--bs-surface), var(--bs-ink) 3%); --pd-pocket: color-mix(in srgb, var(--bs-surface), #000 40%); --pd-sticky: color-mix(in srgb, var(--bs-accent) 82%, var(--bs-elevated)); --pd-wire-hi: color-mix(in srgb, var(--bs-ink) 40%, transparent); } }
.pd-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.pd-view { position: relative; aspect-ratio: 1000 / 620; overflow: hidden; border-radius: calc(var(--bs-radius) * .75); background: var(--bs-surface); box-shadow: inset 0 0 0 1px var(--pd-hair); }
.pd-desk { position: absolute; left: 50%; top: 50%; width: 1000px; height: 620px; transform-origin: 0 0; transform-style: preserve-3d; --p: 0;
  --dim: clamp(0, calc((var(--p) - 2.1) * 3), 1); font-size: 11px; line-height: 1.4; color: var(--bs-ink); }
.pd-measure, .pd-measure * { transform: none !important; }
.pd-pad { position: absolute; left: 22px; top: 16px; width: 956px; height: 588px; overflow: hidden; border-radius: 18px; background: var(--pd-pad);
  box-shadow: inset 0 0 0 1px var(--pd-hair); outline: 1px dashed color-mix(in srgb, var(--bs-line) 32%, transparent); outline-offset: -10px; }
.pd-pad i { position: absolute; width: 70px; height: 70px; background: linear-gradient(to bottom right, var(--pd-pocket) calc(50% - .5px), var(--pd-hair) calc(50% - .5px) calc(50% + .5px), transparent calc(50% + .5px)); }
.pd-pad i:nth-child(1) { left: 0; top: 0; } .pd-pad i:nth-child(2) { right: 0; top: 0; transform: rotate(90deg); }
.pd-pad i:nth-child(3) { right: 0; bottom: 0; transform: rotate(180deg); } .pd-pad i:nth-child(4) { left: 0; bottom: 0; transform: rotate(270deg); }
.pd-sheet { position: absolute; left: calc(var(--x) * 1px); top: calc(var(--y) * 1px); width: calc(var(--w) * 1px); --t0: -2; --t1: -1; --dx: 0; --dy: 0; --lift: 0;
  --s: clamp(0, calc((var(--p) - var(--t0)) / (var(--t1) - var(--t0))), 1); --e: calc(var(--s) * var(--s) * (3 - 2 * var(--s))); --z: calc(sin(calc(var(--s) * 180deg)) * var(--lift));
  transform: translate3d(calc((1 - var(--e)) * var(--dx) * 1px), calc((1 - var(--e)) * var(--dy) * 1px), calc(var(--z) * 1px)) rotate(calc((var(--r) + (1 - var(--e)) * (var(--r0, var(--r)) - var(--r))) * 1deg));
  filter: drop-shadow(0 calc(1px + var(--z) * .3px) calc(1.2px + var(--z) * .3px) color-mix(in srgb, var(--pd-shade) calc(11% * var(--pd-s)), transparent))
    drop-shadow(0 calc(10px + var(--z) * .55px) calc(14px + var(--z) * .45px) color-mix(in srgb, var(--pd-shade) calc(8% * var(--pd-s)), transparent)); }
.pd-paper { position: relative; padding: 12px 14px 14px; border-radius: 10px; background: var(--bs-elevated);
  box-shadow: inset 0 0 0 1px var(--pd-hair), inset 0 1.5px 0 color-mix(in srgb, #fff 70%, transparent); }
:where(.bs-theme[data-bs-theme="dark"]) .pd-paper { box-shadow: inset 0 0 0 1px var(--pd-hair), inset 0 1px 0 color-mix(in srgb, var(--bs-ink) 10%, transparent); }
.pd-paper > :not(.pd-mark) { position: relative; }
.pd-paper p { margin: 0; }
.pd-mark { position: absolute; left: calc(var(--x) * 1px - 3px); top: calc(var(--y) * 1px - .5px); height: calc(var(--mh) * 1px + 1px); width: calc((var(--mw) * 1px + 6px) * var(--h));
  --h: clamp(0, calc((var(--p) - var(--a)) / (var(--b) - var(--a))), 1); background: var(--bs-accent); opacity: calc(1 - var(--dim) * .55);
  clip-path: polygon(4px 0, 34% .7px, 66% 0, 100% .9px, calc(100% - 4px) 100%, 68% calc(100% - .5px), 30% 100%, 0 calc(100% - .8px)); }
.pd-hl { --h: clamp(0, calc((var(--p) - var(--a)) / (var(--b) - var(--a))), 1); color: color-mix(in srgb, var(--bs-on-accent) calc(var(--h) * (1 - var(--dim)) * 100%), var(--bs-ink)); }
.pd-greek { display: grid; }
.pd-greek > span { display: flex; gap: .4em; align-items: center; height: 1.4em; }
.pd-greek i { flex: 1 1 0; height: .42em; border-radius: 99px; background: var(--pd-greek); }
.pd-kicker { display: flex; align-items: center; justify-content: space-between; gap: 6px; font: 500 8.5px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .07em; text-transform: uppercase; color: var(--bs-muted); }
.pd .pd-links { position: absolute; left: 0; top: 0; width: 1000px; height: 620px; overflow: visible; pointer-events: none; transform: translateZ(1px); }
.pd-links g { --l: clamp(0, calc((var(--p) - var(--a)) / .1), 1); opacity: calc(1 - var(--dim) * .5); }
.pd-links path { fill: none; stroke: var(--bs-ink); stroke-width: 1.1; stroke-dasharray: 1; stroke-dashoffset: calc(1 - var(--l)); }
.pd-links .pd-ring { fill: var(--bs-elevated); stroke: var(--bs-ink); stroke-width: 1.1; opacity: clamp(0, calc(var(--l) * 6), 1); }
.pd-links .pd-dot { fill: var(--bs-ink); opacity: clamp(0, calc(var(--l) * 6 - 5), 1); }
.pd-pen, .pd-pen-shadow { position: absolute; left: 0; pointer-events: none; }
.pd-pen { top: -10px; width: 200px; height: 20px; transform-origin: 0 10px; }
.pd .pd-pen svg { width: 200px; height: 20px; overflow: visible; }
.pd-pen-shadow { top: -5px; width: 194px; height: 10px; border-radius: 5px; transform-origin: 0 5px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--pd-shade) calc(20% * var(--pd-s)), transparent), color-mix(in srgb, var(--pd-shade) calc(6% * var(--pd-s)), transparent)); }
.pd .pd-clip { position: absolute; width: 18px; height: 56px; overflow: visible; }
.pd-foot { display: flex; align-items: center; justify-content: space-between; gap: .75rem; }
.pd-readout { font: .6875rem/1.3 ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--bs-muted); text-align: end; font-variant-numeric: tabular-nums; }
`;
