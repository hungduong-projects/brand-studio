// Film kit: pieces for product films drawn as a pure function of time `t` in seconds.
// Nothing here uses CSS transitions, timers or effects that run on their own: a renderer seeks any moment and gets the same frame.
import type { CSSProperties, ReactNode } from 'react';
import './kit.css';

/** A cubic-bezier curve like CSS `cubic-bezier(x1, y1, x2, y2)`, solved for y at x. */
export function bezier(x1: number, y1: number, x2: number, y2: number) {
  const at = (a: number, b: number, s: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
  return (x: number) => {
    let lo = 0, hi = 1;
    for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (at(x1, x2, mid) < x) lo = mid; else hi = mid; }
    return at(y1, y2, (lo + hi) / 2);
  };
}
export const curves = { out: bezier(.16, 1, .3, 1), inOut: bezier(.65, 0, .35, 1), in: bezier(.55, 0, 1, .45), pop: bezier(.34, 1.56, .64, 1) };

/** Progress from 0 to 1 between `from` and `from + length`, shaped by a curve. */
export const ease = (t: number, from: number, length = .5, curve = curves.out) => curve(Math.min(1, Math.max(0, (t - from) / length)));
/** A value that follows keyframes `[time, value]`, easing in and out between each pair. */
export function keys(t: number, frames: [number, number][], curve = curves.inOut) {
  if (t <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i++) {
    const [t0, v0] = frames[i - 1], [t1, v1] = frames[i];
    if (t < t1) return v0 + (v1 - v0) * curve((t - t0) / (t1 - t0));
  }
  return frames[frames.length - 1][1];
}
/** Enter at `start` rising from below, leave at `end`. */
export const rise = (t: number, start: number, end = Infinity, distance = 16): CSSProperties => {
  const p = Math.min(ease(t, start, .55), 1 - ease(t, end - .35, .35, curves.in));
  return { opacity: p, translate: `0 ${(1 - p) * distance}px` };
};
/** The part of `text` typed by `t`, at `perSecond` characters a second from `start`. */
export const typed = (text: string, t: number, start: number, perSecond = 22) => text.slice(0, Math.max(0, Math.floor((t - start) * perSecond)));
/** Seconds `text` takes to type at `perSecond`. */
export const typingTime = (text: string, perSecond = 22) => text.length / perSecond;

/** The soft backdrop every scene sits on. */
export function Stage({ children, tint = ['#dcd6ff', '#ffe1cc', '#d4f1e4'] }: { children: ReactNode; tint?: [string, string, string] }) {
  return <div className="fk-stage" style={{ '--fk-a': tint[0], '--fk-b': tint[1], '--fk-c': tint[2] } as CSSProperties}>{children}</div>;
}

export interface Shot { at: number; x: number; y: number; zoom: number }
/**
 * A virtual camera over a 1152x648 world. Each shot centres the point (x, y) at a zoom; the camera eases between shots
 * the way a screen recorder's auto-zoom follows the action.
 */
export function Camera({ t, shots, children }: { t: number; shots: Shot[]; children: ReactNode }) {
  const { x, y, zoom } = cameraAt(t, shots);
  return <div className="fk-camera" style={{ transform: `translate(576px, 324px) scale(${zoom}) translate(${-x}px, ${-y}px)` }}>{children}</div>;
}
/** Where the camera points at `t`. */
export function cameraAt(t: number, shots: Shot[]) {
  const pick = (key: 'x' | 'y' | 'zoom') => keys(t, shots.map(s => [s.at, s[key]] as [number, number]));
  return { x: pick('x'), y: pick('y'), zoom: pick('zoom') };
}

/** An app window with traffic lights. */
export function AppWindow({ title, children, style, className = '' }: { title: string; children: ReactNode; style?: CSSProperties; className?: string }) {
  return <section className={`fk-window ${className}`} style={style}>
    <header className="fk-window__bar"><span className="fk-lights" aria-hidden="true"><i /><i /><i /></span><span className="fk-window__title">{title}</span></header>
    <div className="fk-window__body">{children}</div>
  </section>;
}

/** A browser window with an address bar. */
export function BrowserWindow({ url, children, style, className = '' }: { url: string; children: ReactNode; style?: CSSProperties; className?: string }) {
  return <section className={`fk-window fk-browser ${className}`} style={style}>
    <header className="fk-window__bar"><span className="fk-lights" aria-hidden="true"><i /><i /><i /></span><span className="fk-url">{url}</span></header>
    <div className="fk-window__body">{children}</div>
  </section>;
}

export interface TerminalLine { command: string; at: number; result?: string }
/** A terminal that types each command, then prints its result half a second after the typing ends. */
export function Terminal({ t, lines, style, prompt = '$' }: { t: number; lines: TerminalLine[]; style?: CSSProperties; prompt?: string }) {
  return <section className="fk-window fk-terminal" style={style}>
    <header className="fk-window__bar"><span className="fk-lights" aria-hidden="true"><i /><i /><i /></span><span className="fk-window__title">Terminal</span></header>
    <div className="fk-terminal__body">
      {lines.filter(line => t >= line.at).map(line => {
        const done = line.at + typingTime(line.command, 30);
        const text = typed(line.command, t, line.at, 30);
        return <div key={line.at}>
          <p><span className="fk-terminal__prompt">{prompt}</span> {text}{t < done + .4 && <span className="fk-caret" style={{ opacity: Math.floor(t * 3) % 2 ? 0 : 1 }} />}</p>
          {line.result && t >= done + .5 && <p className="fk-terminal__result" style={rise(t, done + .5, Infinity, 6)}>{line.result}</p>}
        </div>;
      })}
    </div>
  </section>;
}

/**
 * A cursor stop. Give `target` (a CSS selector) and `aim` measures where that element sits at `at`, so the pointer lands on
 * it; `offset` moves the stop that many world pixels from the target's centre. With only an `offset`, the stop sits that far from
 * the stop before it, for moves after a click takes the target away. Otherwise `x` and `y` are used as is.
 */
export interface CursorPoint { at: number; x?: number; y?: number; target?: string; offset?: [number, number]; click?: boolean }
/** A pointer that glides between points and ripples on each click. Points are in world coordinates. */
export function Cursor({ t, path }: { t: number; path: CursorPoint[] }) {
  const x = keys(t, path.map(p => [p.at, p.x ?? 0] as [number, number]));
  const y = keys(t, path.map(p => [p.at, p.y ?? 0] as [number, number]));
  const click = path.filter(p => p.click && t >= p.at && t < p.at + .6).at(-1);
  const press = click ? 1 - .12 * Math.sin(Math.min(1, (t - click.at) / .2) * Math.PI) : 1;
  const visible = Math.min(ease(t, path[0].at - .3, .3), 1 - ease(t, path.at(-1)!.at + .4, .3));
  return <div className="fk-cursor" style={{ translate: `${x}px ${y}px`, opacity: visible }}>
    {click && <span className="fk-ripple" style={{ scale: `${.4 + ease(t, click.at, .6) * 1.6}`, opacity: 1 - ease(t, click.at, .6, curves.inOut) }} />}
    <svg viewBox="0 0 24 24" width="24" height="24" style={{ scale: `${press}` }} aria-hidden="true"><path d="M5 3l14 8-6.2 1.6L10 19z" fill="#0a0a0a" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" /></svg>
  </div>;
}

/** Resolves every targeted cursor stop to world coordinates by drawing the film at that stop's moment and measuring the target. */
export async function aim(paths: CursorPoint[][], shots: Shot[], seek: (t: number) => Promise<void>) {
  for (const path of paths) for (const [i, point] of path.entries()) {
    if (!point.target) {
      if (point.x === undefined && point.offset && i > 0) { point.x = path[i - 1].x! + point.offset[0]; point.y = path[i - 1].y! + point.offset[1]; }
      continue;
    }
    await seek(point.at);
    const element = document.querySelector(point.target);
    if (!element) throw new Error(`cursor target ${point.target} is not on screen at ${point.at}s`);
    const box = element.getBoundingClientRect(), camera = cameraAt(point.at, shots);
    point.x = (box.left + box.width / 2 - 576) / camera.zoom + camera.x + (point.offset?.[0] ?? 0);
    point.y = (box.top + box.height / 2 - 324) / camera.zoom + camera.y + (point.offset?.[1] ?? 0);
  }
}
/** Marks each click target as hovered from just before the click until just after, since a drawn cursor sets off no :hover. */
export function hover(t: number, paths: CursorPoint[][]) {
  for (const point of paths.flat()) {
    if (!point.click || !point.target) continue;
    document.querySelector(point.target)?.classList.toggle('fk-hover', t >= point.at - .2 && t < point.at + .15);
  }
}

/** A large caption that sits in the lower third. */
export function Caption({ t, start, end, children }: { t: number; start: number; end: number; children: ReactNode }) {
  return <p className="fk-caption" style={rise(t, start, end, 12)}>{children}</p>;
}
