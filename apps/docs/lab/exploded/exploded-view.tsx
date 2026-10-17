'use client';

import { memo, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Button } from '@brand-studio/ui';
import { Kit, P, f, patterns, type Bounds, type Model, type Part, type Vec3 } from './kit';

/* Exploded view: a product drawn as a stack of layers that comes apart, with a label beside each layer. Pick a layer to
   light it and see its parts; pick a part that has its own figure to zoom into it, as deep as the figures go.
   React draws each figure once; a Scene moves it, frame by frame, without rendering again. */

interface Drawn { key: string; title: string; readout: string; zA: number; parts: Part[]; n: string; body: ReactNode; defs: ReactNode[]; box: Bounds }
interface Ui { path: string[]; apart: boolean; playing: boolean; live: string }

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE = 'cubic-bezier(.2, .7, .1, 1)', DUR = 760;

class Scene {
  svg: SVGSVGElement; root: SVGGElement; groups: SVGGElement[]; leaders: SVGPathElement[]; anchors: SVGCircleElement[]; items: HTMLLIElement[]; buttons: HTMLButtonElement[];
  spring: { x: number; v: number; target: number; pending: { value: number; at: number } | null }[];
  apart = false; focus: number | null = null; hover: number | null = null; raf = 0; timer = 0; last = 0; s = 1; e = [0, 0]; dead = false;
  wide = false; px = 0; gap = 0; minX = 0; maxX = 0; LX = 0; top = 0; bottom = 0; wholeTop = 0; wholeBottom = 0; whole = [0, 0]; vb = [0, 0, 1, 1]; zoom = 1; heights: number[] = [];
  origin = '';
  private off = new AbortController();

  constructor(public model: Model, public layers: Drawn[], public el: HTMLDivElement, public figure: Figure) {
    this.svg = el.querySelector('svg')!; this.root = this.svg.querySelector('.root')!;
    this.groups = [...this.svg.querySelectorAll<SVGGElement>('.layer')];
    this.leaders = [...this.svg.querySelectorAll<SVGPathElement>('.leader')]; this.anchors = [...this.svg.querySelectorAll<SVGCircleElement>('.anchor')];
    this.items = layers.map((_, i) => el.querySelector<HTMLLIElement>(`li[data-i="${i}"]`)!);
    this.buttons = this.items.map((li) => li.querySelector<HTMLButtonElement>('.lb')!);
    this.spring = layers.map(() => ({ x: 0, v: 0, target: 0, pending: null }));
    this.bind();
  }

  bind() {
    const signal = this.off.signal;
    this.groups.forEach((g, i) => g.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && this.apart && !this.figure.busy) { this.hover = i; this.paint(); } }, { signal }));
    this.svg.addEventListener('pointerleave', () => { if (this.hover !== null) { this.hover = null; this.paint(); } }, { signal });
    this.svg.addEventListener('click', (e) => {
      const target = e.target as Element, layer = target.closest('.layer'), open = target.closest<SVGElement>('[data-open]');
      if (!layer) { if (this.focus !== null) { this.stopPlay(); this.setFocus(null); } return; }
      this.stopPlay();
      if (!this.apart) return this.setApart(true);
      const i = Number((layer as SVGGElement).dataset.i);
      if (open && i === this.shown()) return void this.figure.zoomIn(this, open.dataset.open!, open.dataset.part!);
      this.hover = null; this.setFocus(i);
    }, { signal });
    this.buttons.forEach((b, i) => {
      b.addEventListener('click', () => { this.stopPlay(); this.setFocus(this.focus === i ? null : i); }, { signal });
      b.addEventListener('keydown', (e) => {
        const to = ({ ArrowUp: i + 1, ArrowDown: i - 1 } as Record<string, number>)[e.key];
        if (to === undefined || to < 0 || to >= this.layers.length) return;
        e.preventDefault(); this.buttons[to]!.focus(); this.stopPlay(); this.setFocus(to);
      }, { signal });
    });
    this.el.querySelectorAll<HTMLButtonElement>('.p .zoom').forEach((b) => b.addEventListener('click', () => { this.stopPlay(); void this.figure.zoomIn(this, b.dataset.open!, b.dataset.part!); }, { signal }));
  }

  shown() { return this.hover ?? this.focus; }
  t() { const s = this.spring.slice(1); return s.reduce((a, x) => a + x.x, 0) / Math.max(1, s.length); }

  layout(width: number) {
    this.wide = width >= 600; this.px = width;
    this.el.classList.toggle('wide', this.wide);
    this.gap = this.model.gap[this.wide ? 0 : 1];
    const ls = this.layers, b = ls.map((l) => l.box);
    this.minX = Math.min(...b.map((x) => x.minX)); this.maxX = Math.max(...b.map((x) => x.maxX));
    this.LX = Math.max(...b.map((x) => x.ax)) + 53;
    const left = this.minX - 16, right = this.wide ? this.LX + 262 : this.maxX + 16;
    this.top = Math.min(...b.map((x, i) => x.minY - ls[i]!.zA - i * this.gap)) - 46;
    this.wholeTop = Math.min(...b.map((x, i) => x.minY - ls[i]!.zA));
    this.wholeBottom = Math.max(...b.map((x, i) => x.maxY - ls[i]!.zA));
    this.bottom = this.wholeBottom + 14;
    this.whole = [(this.minX + this.maxX) / 2, (this.wholeTop + this.wholeBottom) / 2];
    this.vb = [left, this.top, right - left, this.bottom - this.top];
    this.zoom = this.wide ? Math.min(1.5, .8 * this.vb[2]! / (this.maxX - this.minX), .62 * this.vb[3]! / (this.wholeBottom - this.wholeTop)) : 1;
    const column = Math.min(262, (right - this.LX) * width / this.vb[2]!);
    this.items.forEach((li) => { li.style.width = this.wide ? `${f(column)}px` : ''; });
    this.measure(); this.draw();
  }
  measure() { this.heights = this.items.map((li) => li.offsetHeight); }
  /* Each label sits level with its leader. One that would run into the label below pushes it down, and the floor of the
     box pushes back up. Takes and returns label heights in drawing units; labels draw 22 px above their top. */
  place(ys: number[], k: number) {
    const vb = this.vb, h = this.heights, top = ys.map((y) => (y - vb[1]!) * k), order = [...top.keys()].sort((a, b) => top[a]! - top[b]!);
    let edge = -Infinity;
    for (const i of order) { top[i] = Math.max(top[i]!, edge); edge = top[i]! + h[i]! + 12; }
    edge = vb[3]! * k + 22;
    for (const i of order.reverse()) { top[i] = Math.min(top[i]!, edge - h[i]!); edge = top[i]! - 12; }
    return top.map((y) => y / k + vb[1]!);
  }

  draw() {
    const t = this.t(), vb = this.vb, show = this.apart ? Math.min(1, Math.max(0, (t - .7) / .3)) : 0;
    /* Wide: the box keeps its height and the whole thing is drawn larger in the middle of it.
       Narrow: the box grows as the thing comes apart, so the whole thing leaves no empty space. */
    if (!this.wide) { vb[1] = this.wholeTop - 30 + (this.top - this.wholeTop + 30) * t; vb[3] = this.bottom - vb[1]; }
    this.svg.setAttribute('viewBox', vb.map(f).join(' '));
    const s = 1 + (this.zoom - 1) * (1 - t), mid = [vb[0]! + vb[2]! / 2, vb[1]! + vb[3]! / 2];
    const e = [0, 1].map((j) => (1 - t) * (mid[j]! - this.whole[j]!) - (s - 1) * this.whole[j]!);
    this.s = s; this.e = e;
    const T = ([x, y]: number[]) => [s * x! + e[0]!, s * y! + e[1]!], k = this.px / vb[2]!;
    this.root.setAttribute('transform', `matrix(${f(s)} 0 0 ${f(s)} ${f(e[0]!)} ${f(e[1]!)})`);
    const at = this.layers.map((l, i) => {
      const z = l.zA + this.spring[i]!.x * i * this.gap;
      this.groups[i]!.setAttribute('transform', `translate(0 ${f(-z)})`);
      return T([l.box.ax, l.box.ay - z - (this.shown() === i ? 8 : 0)]);
    });
    const ly = this.wide ? this.place(at.map((a) => a[1]!), k) : at.map((a) => a[1]!), end = this.LX - 10;
    at.forEach(([ax, ay], i) => {
      this.leaders[i]!.setAttribute('d', `M${f(ax! + 6)} ${f(ay!)}` + (Math.abs(ly[i]! - ay!) < .5 ? '' : `H${f(end - 30)}L${f(end - 14)} ${f(ly[i]!)}`) + `H${f(end)}`);
      this.anchors[i]!.setAttribute('cx', String(f(ax!))); this.anchors[i]!.setAttribute('cy', String(f(ay!)));
      this.leaders[i]!.style.opacity = this.anchors[i]!.style.opacity = String(show);
      if (this.wide) Object.assign(this.items[i]!.style, { left: `${f((this.LX - vb[0]!) * k)}px`, top: `${f((ly[i]! - vb[1]!) * k)}px`, opacity: String(show) });
      else Object.assign(this.items[i]!.style, { left: '', top: '', opacity: '' });
    });
    this.el.classList.toggle('apart', t > .5);
  }

  /** The whole thing's box in stage pixels, as drawn right now. Zooms start and end on it. */
  wholeRect(stage: DOMRect) {
    const r = this.svg.getBoundingClientRect(), k = r.width / this.vb[2]!;
    const X = (x: number) => (this.s * x + this.e[0]! - this.vb[0]!) * k + r.left - stage.left, Y = (y: number) => (this.s * y + this.e[1]! - this.vb[1]!) * k + r.top - stage.top;
    const x0 = X(this.minX), x1 = X(this.maxX), y0 = Y(this.wholeTop), y1 = Y(this.wholeBottom);
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
  }

  frame(now: number) {
    const dt = Math.min(.25, (now - this.last) / 1000), n = Math.max(4, Math.ceil(dt / .004)); this.last = now;
    let moving = false;
    for (const s of this.spring) {
      if (s.pending && now >= s.pending.at) { s.target = s.pending.value; s.pending = null; }
      if (reduced()) { s.x = s.target; s.v = 0; }
      else for (let j = 0; j < n; j++) { const h = dt / n, a = -150 * (s.x - s.target) - 21 * s.v; s.v += a * h; s.x += s.v * h; }
      if (s.pending || Math.abs(s.x - s.target) > 1e-3 || Math.abs(s.v) > 1e-3) moving = true; else { s.x = s.target; s.v = 0; }
    }
    this.draw();
    this.raf = moving && !this.dead ? requestAnimationFrame((n) => this.frame(n)) : 0;
  }
  kick() { if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame((n) => this.frame(n)); } }
  /** Resolves once the thing is all but whole again. */
  settle() { return new Promise<void>((done) => { const check = () => (this.raf && this.t() > .03 ? requestAnimationFrame(check) : done()); check(); }); }

  setApart(on: boolean, stagger = 70) {
    if (on === this.apart) return;
    this.apart = on;
    const order = on ? [...this.layers.keys()].reverse() : [...this.layers.keys()], now = performance.now();
    order.forEach((i, k) => { this.spring[i]!.pending = { value: on ? 1 : 0, at: now + k * stagger }; });
    if (!on) { this.focus = null; this.hover = null; this.paint(); }
    this.kick(); this.figure.sync();
  }
  paint() {
    const shown = this.shown();
    if (shown === null) delete this.el.dataset.focus; else this.el.dataset.focus = this.layers[shown]!.key;
    this.groups.forEach((g, i) => g.classList.toggle('on', i === shown));
    this.leaders.forEach((g, i) => g.classList.toggle('on', i === shown));
    this.anchors.forEach((g, i) => g.classList.toggle('on', i === shown));
    this.items.forEach((li, i) => li.classList.toggle('on', i === shown));
    this.buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(i === shown)));
    this.measure(); this.draw();
  }
  setFocus(i: number | null) { this.focus = i; if (i !== null) this.setApart(true); this.paint(); }
  togglePlay() {
    if (this.timer) return this.stopPlay();
    const order = [...this.layers.keys()].reverse();
    const step = (k: number) => { if (k === order.length) return this.stopPlay(); this.setFocus(order[k]!); this.timer = window.setTimeout(() => step(k + 1), 2200); };
    if (this.apart) { this.timer = -1; step(0); } else { this.setApart(true); this.timer = window.setTimeout(() => step(0), 900); }
    this.figure.sync();
  }
  stopPlay() { if (!this.timer) return; clearTimeout(this.timer); this.timer = 0; this.figure.sync(); }
  destroy() { this.dead = true; cancelAnimationFrame(this.raf); this.raf = 0; clearTimeout(this.timer); this.off.abort(); }
}

/** The stack of figures on show, from the whole product down to the part zoomed into last. */
class Figure {
  stack: Scene[] = []; busy = false; stage: HTMLDivElement | null = null; root: HTMLElement | null = null;
  pending: { parent: Scene; part: string; keyboard: boolean } | null = null;
  private width = 0;
  private fit = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { const s = this.top; if (s && this.stage) this.stage.style.height = `${s.el.offsetHeight}px`; }) : null;
  private sizer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { const w = this.stage?.clientWidth ?? 0; if (w && w !== this.width) { this.width = w; this.stack.forEach((s) => s.layout(w)); } }) : null;

  constructor(public models: Record<string, Model>, public mountKeys: (next: (keys: string[]) => string[]) => void, public ui: (next: Partial<Ui>) => void) {}
  get top() { return this.stack[this.stack.length - 1]; }
  sync() { const top = this.top; if (top) this.ui({ path: this.stack.map((s) => s.model.crumb), apart: top.apart, playing: !!top.timer }); }

  mount(level: number, key: string, el: HTMLDivElement, layers: Drawn[]) {
    if (!this.stage) { this.stage = el.parentElement as HTMLDivElement; this.width = this.stage.clientWidth; this.sizer?.observe(this.stage); }
    const scene = new Scene(this.models[key]!, layers, el, this);
    this.stack[level] = scene; this.fit?.observe(el);
    scene.layout(this.stage.clientWidth);
    if (level === 0) this.sync();
    // A zoom starts once React has finished mounting; under Strict Mode the first mount is torn down before then.
    else queueMicrotask(() => { const p = this.pending; if (scene.dead || !p) return; this.pending = null; void this.grow(p.parent, scene, p.part, p.keyboard); });
    return () => { this.fit?.unobserve(el); scene.destroy(); if (this.stack[level] === scene) this.stack.length = level; };
  }
  detach() { this.fit?.disconnect(); this.sizer?.disconnect(); }
  private button(name: string) { return this.root?.querySelector<HTMLButtonElement>(`[data-xv="${name}"]`) ?? null; }

  /** The part's patch in the parent figure and the child's whole box, both in stage pixels. */
  ends(parent: Scene, part: string, child: Scene) {
    const st = this.stage!.getBoundingClientRect(), g = parent.svg.querySelector(`.hit[data-part="${part}"]`)!, r = (g.querySelector('.spot') ?? g).getBoundingClientRect();
    const from = { cx: r.left + r.width / 2 - st.left, cy: r.top + r.height / 2 - st.top, w: r.width, h: r.height }, to = child.wholeRect(st);
    return { from, to, k: to.w / Math.max(from.w, 1) };
  }

  zoomIn(parent: Scene, key: string, part: string) {
    if (this.busy || !this.models[key] || parent !== this.top || !parent.svg.querySelector(`.hit[data-part="${part}"]`)) return;
    this.busy = true;
    const keyboard = !!this.root?.contains(document.activeElement) && document.activeElement !== this.root;
    parent.focus = parent.layers.findIndex((l) => l.parts.some((p) => p.id === part)); parent.hover = null; parent.paint();
    this.pending = { parent, part, keyboard };
    this.mountKeys((keys) => [...keys, key]);
  }
  async grow(parent: Scene, child: Scene, part: string, keyboard: boolean) {
    child.origin = part;
    const stage = this.stage!, { from, to, k } = this.ends(parent, part, child);
    this.sync(); this.ui({ live: `Zoomed into ${child.model.crumb.toLowerCase()}` });
    stage.classList.add('swap'); stage.style.height = `${child.el.offsetHeight}px`;
    if (!reduced()) {
      parent.el.style.transformOrigin = `${from.cx}px ${from.cy}px`;
      child.el.style.transformOrigin = `${to.cx}px ${to.cy}px`;
      const zoom = parent.el.animate([{ transform: 'none' }, { transform: `translate(${to.cx - from.cx}px, ${to.cy - from.cy}px) scale(${k})` }], { duration: DUR, easing: EASE, fill: 'forwards' });
      parent.el.animate([{ opacity: 1 }, { opacity: 1, offset: .3 }, { opacity: 0, offset: .7 }, { opacity: 0 }], { duration: DUR, fill: 'forwards' });
      child.el.animate([{ transform: `translate(${from.cx - to.cx}px, ${from.cy - to.cy}px) scale(${1 / k})` }, { transform: 'none' }], { duration: DUR, easing: EASE });
      child.el.animate([{ opacity: 0 }, { opacity: 0, offset: .25 }, { opacity: 1, offset: .65 }, { opacity: 1 }], { duration: DUR });
      await zoom.finished;
    }
    parent.el.hidden = true; parent.el.getAnimations().forEach((a) => a.cancel());
    stage.classList.remove('swap'); this.busy = false;
    if (keyboard) this.button('back')?.focus();
    window.setTimeout(() => child.setApart(true), reduced() ? 0 : 140);
  }
  async zoomOut() {
    if (this.busy || this.stack.length < 2) return;
    this.busy = true;
    const child = this.top!, parent = this.stack[this.stack.length - 2]!, stage = this.stage!, keyboard = !!this.root?.contains(document.activeElement) && document.activeElement !== this.root;
    child.stopPlay();
    if (child.apart) { child.setApart(false, 20); await child.settle(); }
    parent.el.hidden = false; parent.hover = null; parent.paint();
    const { from, to, k } = this.ends(parent, child.origin, child);
    this.stack.pop(); this.sync(); this.ui({ live: `Zoomed out to ${parent.model.crumb.toLowerCase()}` });
    stage.classList.add('swap'); stage.style.height = `${parent.el.offsetHeight}px`;
    if (!reduced()) {
      parent.el.style.transformOrigin = `${from.cx}px ${from.cy}px`;
      child.el.style.transformOrigin = `${to.cx}px ${to.cy}px`;
      const zoom = parent.el.animate([{ transform: `translate(${to.cx - from.cx}px, ${to.cy - from.cy}px) scale(${k})` }, { transform: 'none' }], { duration: DUR, easing: EASE });
      parent.el.animate([{ opacity: 0 }, { opacity: 0, offset: .3 }, { opacity: 1, offset: .7 }, { opacity: 1 }], { duration: DUR });
      child.el.animate([{ transform: 'none' }, { transform: `translate(${from.cx - to.cx}px, ${from.cy - to.cy}px) scale(${1 / k})` }], { duration: DUR, easing: EASE, fill: 'forwards' });
      child.el.animate([{ opacity: 1 }, { opacity: 1, offset: .25 }, { opacity: 0, offset: .65 }, { opacity: 0 }], { duration: DUR, fill: 'forwards' });
      await zoom.finished;
    }
    child.el.hidden = true;
    this.mountKeys((keys) => keys.slice(0, -1));
    parent.hover = null; parent.paint();
    stage.classList.remove('swap'); this.busy = false;
    if (keyboard) (parent.el.querySelector<HTMLButtonElement>(`.zoom[data-part="${child.origin}"]`) ?? this.button('apart'))?.focus();
  }
  async zoomTo(level: number) { while (this.stack.length > level + 1 && !this.busy) await this.zoomOut(); }
  back() {
    if (this.busy) return;
    if (this.stack.length > 1) return void this.zoomOut();
    const s = this.top; if (!s) return;
    s.stopPlay();
    if (s.focus !== null) s.setFocus(null); else if (s.apart) s.setApart(false);
  }
}

function Pin({ n, at, part }: { n: number; at: Vec3; part: Part }) {
  const [a, b] = P(...at).map(f) as [number, number];
  return <g className={`pin${part.open ? ' open' : ''}`} data-open={part.open} data-part={part.id}>
    {part.open && <circle className="halo" cx={a} cy={b - 25} r="12.5" />}
    <circle className="dot" cx={a} cy={b} r="2" /><line x1={a} y1={b} x2={a} y2={b - 16.5} />
    <circle className="bub" cx={a} cy={b - 25} r="8.5" /><text x={a} y={b - 21.5}>{n}</text>
  </g>;
}

const ZoomIcon = () => <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" /><path d="M4.5 7h5M7 4.5v5M11 11l3 3" /></svg>;

/** One figure: the drawing and its layer list, drawn whole. Its Scene takes over once it mounts. */
const SceneView = memo(function SceneView({ model, level, figureKey, id, shared, onMount }: {
  model: Model; level: number; figureKey: string; id: string; shared: string; onMount: (level: number, key: string, el: HTMLDivElement, layers: Drawn[]) => () => void;
}) {
  const layers = useMemo(() => model.layers.map((layer, i): Drawn => {
    const k = new Kit(`${id}-${i}`, shared), body = layer.draw(k);
    return { ...layer, parts: layer.parts ?? [], n: String(model.layers.length - i).padStart(2, '0'), body, defs: k.defs, box: k.box };
  }), [model, id, shared]);
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => onMount(level, figureKey, ref.current!, layers), [onMount, level, figureKey, layers]);
  const minX = Math.min(...layers.map((l) => l.box.minX)), maxX = Math.max(...layers.map((l) => l.box.maxX));
  const top = Math.min(...layers.map((l) => l.box.minY - l.zA)) - 30, bottom = Math.max(...layers.map((l) => l.box.maxY - l.zA)) + 14;
  return <div ref={ref} className="xv-scene">
    <svg className="xv-draw" role="img" aria-label={model.alt} viewBox={[minX - 16, top, maxX - minX + 32, bottom - top].map(f).join(' ')}>
      <defs>{layers.flatMap((l) => l.defs)}</defs>
      <g className="root">{layers.map((l, i) => <g key={l.key} className="layer" data-i={i} transform={`translate(0 ${f(-l.zA)})`}>
        <g className="lift">{l.body}{l.parts.map((p, k) => p.at && <Pin key={k} n={k + 1} at={p.at} part={p} />)}</g>
      </g>)}</g>
      <g className="leaders">{layers.map((l) => <g key={l.key}><path className="leader" style={{ opacity: 0 }} /><circle className="anchor" r="2.5" style={{ opacity: 0 }} /></g>)}</g>
    </svg>
    <ol className="xv-list">{layers.map((l, i) => ({ l, i })).reverse().map(({ l, i }) => <li key={l.key} data-i={i}>
      <button type="button" className="lb" aria-pressed="false"><span className="n">{l.n}</span><span className="t">{l.title}</span><span className="r">{l.readout}</span></button>
      {l.parts.length > 0 && <div className="p">{l.parts.map((p, k) => p.open
        ? <button key={p.name} type="button" className="zoom" data-open={p.open} data-part={p.id} aria-label={`Zoom into ${p.name}`}><b>{k + 1}</b><span>{p.name}</span><ZoomIcon /></button>
        : <span key={p.name}><b>{k + 1}</b>{p.name}</span>)}</div>}
    </li>)}</ol>
  </div>;
});

export function ExplodedView({ models, root, fig = 'Fig. 1', className = '' }: { models: Record<string, Model>; root: string; fig?: string; className?: string }) {
  const uid = `xv${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [keys, setKeys] = useState<string[]>([root]);
  const [ui, setUiState] = useState<Ui>({ path: [models[root]!.crumb], apart: false, playing: false, live: '' });
  const setUi = useCallback((next: Partial<Ui>) => setUiState((current) => ({ ...current, ...next })), []);
  const [figure] = useState(() => new Figure(models, setKeys, setUi));
  const onMount = useCallback((level: number, key: string, el: HTMLDivElement, layers: Drawn[]) => figure.mount(level, key, el, layers), [figure]);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    figure.root = rootRef.current;
    document.fonts?.ready.then(() => figure.top?.paint());
    return () => figure.detach();
  }, [figure]);

  const top = models[keys[ui.path.length - 1] ?? root] ?? models[root]!;
  const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') figure.back(); };
  // A click on the drawing focuses no control, so the figure takes focus itself and Escape still zooms out.
  const onPointerDown = () => { const el = rootRef.current; if (el && !el.contains(document.activeElement)) el.focus({ preventScroll: true }); };

  return <figure ref={rootRef} className={`xv ${className}`} aria-labelledby={`${uid}-title`} tabIndex={-1} onKeyDown={onKeyDown} onPointerDown={onPointerDown}>
    <style>{css}</style>
    <svg width="0" height="0" className="xv-defs" aria-hidden="true"><defs>{patterns(uid)}</defs></svg>
    <div className="xv-head">
      <span className="xv-crumbs"><span>{fig}</span><span aria-hidden="true">·</span>{ui.path.map((crumb, i) => <span key={i} className="xv-crumb">
        {i > 0 && <span aria-hidden="true">›</span>}
        {i < ui.path.length - 1 ? <button type="button" onClick={() => void figure.zoomTo(i)}>{crumb}</button> : <span aria-current="true">{crumb}</span>}
      </span>)}</span>
      <span id={`${uid}-title`}>{top.heading}</span>
    </div>
    <div className="xv-bar">
      {ui.path.length > 1 && <Button data-xv="back" tone="secondary" onClick={() => void figure.zoomOut()}><ZoomOutIcon />Zoom out</Button>}
      <Button data-xv="apart" aria-pressed={ui.apart} onClick={() => { const s = figure.top; if (!s) return; s.stopPlay(); s.setApart(!s.apart); }}>{ui.apart ? 'Put together' : 'Take apart'}</Button>
      <Button tone="secondary" onClick={() => figure.top?.togglePlay()}>{ui.playing ? 'Pause' : 'Play'}</Button>
    </div>
    <div className="xv-stage">{keys.map((key, level) => <SceneView key={`${level}-${key}`} model={models[key]!} level={level} figureKey={key} id={`${uid}-${level}`} shared={uid} onMount={onMount} />)}</div>
    <figcaption>{top.caption}</figcaption>
    <p className="xv-sr" aria-live="polite">{ui.live}</p>
  </figure>;
}

const ZoomOutIcon = () => <svg className="xv-icon" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" /><path d="M4.5 7h5M11 11l3 3" /></svg>;

/* Material tones mix the brand's ink into its surfaces, so the drawing takes on each brand's neutrals; the accent marks
   only the lit layer. Pixel colours, the dark screen and glass shine stay literal: they show real materials. */
const dark = `--xv-side: color-mix(in srgb, var(--bs-elevated) 45%, #000); --xv-edge: color-mix(in srgb, var(--bs-ink) 34%, transparent); --xv-detail: color-mix(in srgb, var(--bs-ink) 26%, transparent);
  --xv-chip: color-mix(in srgb, var(--bs-ink) 17%, var(--bs-elevated)); --xv-chip-side: color-mix(in srgb, var(--bs-ink) 10%, var(--bs-elevated)); --xv-chip2: color-mix(in srgb, var(--bs-ink) 24%, var(--bs-elevated));
  --xv-foil: color-mix(in srgb, var(--bs-ink) 9%, var(--bs-elevated)); --xv-metal: color-mix(in srgb, var(--bs-ink) 10%, var(--bs-elevated)); --xv-graphite: color-mix(in srgb, var(--bs-ink) 17%, var(--bs-elevated));
  --xv-oxide: color-mix(in srgb, var(--bs-ink) 30%, var(--bs-elevated)); --xv-film: color-mix(in srgb, var(--bs-ink) 6%, var(--bs-elevated)); --xv-dim: .5;`;
const css = `
.xv:focus:not(:focus-visible) { outline: none; }
.xv { --xv-side: color-mix(in srgb, var(--bs-ink) 10%, var(--bs-elevated)); --xv-edge: color-mix(in srgb, var(--bs-ink) 40%, transparent); --xv-detail: color-mix(in srgb, var(--bs-ink) 34%, transparent);
  --xv-chip: color-mix(in srgb, var(--bs-ink) 84%, var(--bs-elevated)); --xv-chip-side: color-mix(in srgb, var(--bs-ink) 92%, var(--bs-elevated)); --xv-chip2: color-mix(in srgb, var(--bs-ink) 70%, var(--bs-elevated));
  --xv-foil: color-mix(in srgb, var(--bs-ink) 9%, var(--bs-elevated)); --xv-metal: color-mix(in srgb, var(--bs-ink) 7%, var(--bs-elevated)); --xv-graphite: color-mix(in srgb, var(--bs-ink) 78%, var(--bs-elevated));
  --xv-oxide: color-mix(in srgb, var(--bs-ink) 42%, var(--bs-elevated)); --xv-film: color-mix(in srgb, var(--bs-ink) 7%, var(--bs-surface)); --xv-dim: .4;
  --xv-mono: "Geist Mono", ui-monospace, monospace;
  margin: 0; padding: 18px; border-radius: var(--bs-radius); background: var(--bs-surface); color: var(--bs-ink); font-family: var(--bs-font); font-size: 15px; line-height: 1.45;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--bs-line) 55%, transparent); }
.bs-theme[data-bs-theme="dark"] .xv { ${dark} }
@media (prefers-color-scheme: dark) { .bs-theme[data-bs-theme="system"] .xv { ${dark} } }
.xv-defs { position: absolute; }
.xv-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 12px; font: 11px/1.4 var(--xv-mono); letter-spacing: .08em; text-transform: uppercase; color: var(--bs-muted); }
.xv-crumbs, .xv-crumb { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.xv-crumbs button { all: unset; cursor: pointer; color: var(--bs-ink); text-decoration: underline; text-underline-offset: 3px; text-decoration-color: color-mix(in srgb, var(--bs-ink) 30%, transparent); }
.xv-crumbs [aria-current] { color: var(--bs-accent-text); }
.xv-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.xv-bar .bs-button { min-height: 44px; gap: 8px; }
.xv-icon { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }
.xv-crumbs button:focus-visible, .xv-list button:focus-visible { outline: 2px solid var(--bs-accent); outline-offset: 2px; }
.xv-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; margin: 0; }
.xv-stage { position: relative; margin-top: 8px; overflow: hidden; touch-action: manipulation; }
.xv-stage.swap { transition: height .5s cubic-bezier(.2, .7, .1, 1); }
.xv-scene { position: absolute; top: 0; left: 0; width: 100%; }
.xv-scene:first-child { position: relative; }
.xv-scene[hidden] { display: none; }
.xv-draw { display: block; width: 100%; height: auto; overflow: visible; -webkit-tap-highlight-color: transparent; }
.xv figcaption { margin-top: 12px; font-size: 13px; color: var(--bs-muted); }

.xv .layer { cursor: pointer; transition: opacity .25s; }
.xv-scene[data-focus] .layer:not(.on) { opacity: var(--xv-dim); }
.xv .layer.on { --xv-edge: var(--bs-accent); --xv-detail: color-mix(in srgb, var(--bs-accent) 80%, transparent); }
.xv .lift { transition: transform .3s cubic-bezier(.2, .8, .2, 1); }
.xv .layer.on .lift { transform: translateY(-8px); }
.xv .side { fill: var(--xv-side); }
.xv .side.base, .xv .top, .xv .tan, .xv .det, .xv .dash { stroke: var(--xv-edge); stroke-width: 1; vector-effect: non-scaling-stroke; }
.xv .det { fill: none; stroke: var(--xv-detail); }
.xv .det * { vector-effect: non-scaling-stroke; }
.xv .dash { fill: none; stroke-dasharray: 3 4; }
.xv .top.plain { fill: var(--bs-elevated); }
.xv .layer.on .top.plain { fill: color-mix(in srgb, var(--bs-accent) 8%, var(--bs-elevated)); }
.xv .layer.on .hit { cursor: zoom-in; }
.xv .layer.on .hit:hover .top.plain { fill: color-mix(in srgb, var(--bs-accent) 22%, var(--bs-elevated)); }
.xv .layer.on .hit:hover .top { stroke-width: 1.8; }
.xv .hitarea { fill: transparent; stroke: none; }
.xv .hole, .xv .det .hole { fill: #0c0c0e; stroke: none; }
.xv .top.lens, .xv .glassdisc { fill: #121214; } .xv .glassdisc { stroke: none; }
.xv .lensring circle { fill: none; stroke: rgba(255, 255, 255, .28); stroke-width: 1; vector-effect: non-scaling-stroke; }
.xv .glint { fill: none; stroke: rgba(255, 255, 255, .6); stroke-width: 1.6; stroke-linecap: round; vector-effect: non-scaling-stroke; }
.xv .top.flash { fill: #f2e7c9; }
.xv .side.chip { fill: var(--xv-chip-side); } .xv .top.chip { fill: var(--xv-chip); stroke: none; } .xv .top.chip2 { fill: var(--xv-chip2); stroke: none; }
.xv .side.dark { fill: #222225; } .xv .top.panel { fill: #0c0c0e; }
.xv .side.glass { fill: none; }
.xv .top.glass { fill: color-mix(in srgb, var(--bs-elevated) 22%, transparent); }
.xv .top.ir { fill: color-mix(in srgb, #5fb3c9 26%, transparent); }
.xv .top.polar { fill: color-mix(in srgb, var(--bs-ink) 20%, transparent); }
.xv .top.foil { fill: var(--xv-foil); } .xv .top.metal { fill: var(--xv-metal); } .xv .top.graphite { fill: var(--xv-graphite); } .xv .top.oxide { fill: var(--xv-oxide); } .xv .top.film { fill: var(--xv-film); }
.xv .top.magnet, .xv .mag { fill: var(--xv-chip); } .xv .mag { stroke: none; }
.xv .top.red { fill: #e0645a; } .xv .top.green { fill: #4fb07a; } .xv .top.blue { fill: #5a84e0; }
.xv .blk { fill: var(--xv-chip2); stroke: none; }
.xv .vent { fill: color-mix(in srgb, var(--bs-ink) 45%, transparent); stroke: none; }
.xv .light { fill: none; stroke: rgba(255, 255, 255, .35); stroke-width: 1.4; stroke-linecap: round; vector-effect: non-scaling-stroke; }
.xv .shine { fill: color-mix(in srgb, #ffffff 30%, transparent); stroke: none; }
.xv .screen text { fill: #f5f5f4; font-family: var(--bs-font); text-anchor: middle; }
.xv .pat-dot { fill: var(--xv-detail); } .xv .pat-line { fill: none; stroke: var(--xv-detail); stroke-width: .7; }
.xv .pat-light { fill: none; stroke: rgba(255, 255, 255, .3); stroke-width: .5; } .xv .pat-pad { fill: rgba(255, 255, 255, .28); }
.xv .pat-gate { fill: none; stroke: rgba(255, 255, 255, .45); stroke-width: 1.2; }
.xv .pat-wire { fill: none; stroke: var(--xv-detail); stroke-width: .9; } .xv .pat-bus { fill: none; stroke: var(--xv-detail); stroke-width: 2.6; } .xv .pat-via { fill: var(--xv-detail); }
.xv .pin { opacity: 0; transition: opacity .2s; pointer-events: none; }
.xv .layer.on .pin { opacity: 1; }
.xv .layer.on .pin.open { pointer-events: auto; cursor: zoom-in; }
.xv .pin .bub, .xv .pin .dot { fill: var(--bs-accent); } .xv .pin line { stroke: var(--bs-accent); stroke-width: 1; }
.xv .pin .halo { fill: none; stroke: var(--bs-accent); stroke-width: 1; }
.xv .pin text { fill: var(--bs-on-accent); font: 500 10px/1 var(--xv-mono); text-anchor: middle; }
.xv .leader { fill: none; stroke: color-mix(in srgb, var(--bs-ink) 30%, transparent); stroke-width: 1; transition: opacity .2s; }
.xv .leader.on { stroke: var(--bs-accent); }
.xv .anchor { fill: var(--bs-surface); stroke: color-mix(in srgb, var(--bs-ink) 50%, transparent); stroke-width: 1; transition: opacity .2s; }
.xv .anchor.on { fill: var(--bs-accent); stroke: var(--bs-accent); }
.xv-scene:not(.wide) .leaders { display: none; }

.xv-list { list-style: none; margin: 14px 0 0; padding: 0; display: grid; gap: 2px; }
.xv-list li { border-radius: 12px; }
.xv-list .lb { all: unset; box-sizing: border-box; display: grid; grid-template-columns: 28px 1fr; column-gap: 6px; width: 100%; min-height: 44px; padding: 8px 10px; border-radius: 12px; cursor: pointer; color: var(--bs-muted); }
.xv-list .n { grid-row: span 2; font: 11px/21px var(--xv-mono); letter-spacing: .06em; }
.xv-list .t { font-size: 15px; font-weight: 500; color: color-mix(in srgb, var(--bs-ink) 80%, transparent); }
.xv-list .r { font-size: 13px; line-height: 1.4; }
.xv-list .p { display: none; flex-wrap: wrap; gap: 2px 10px; padding: 0 10px 8px 44px; font-size: 12.5px; }
.xv-list li.on .p { display: flex; }
.xv-list .p > span, .xv-list .p .zoom { display: inline-flex; align-items: center; gap: 5px; min-height: 40px; }
.xv-list .p .zoom { all: unset; box-sizing: border-box; display: inline-flex; align-items: center; gap: 5px; min-height: 40px; cursor: zoom-in; color: var(--bs-accent-text); font-weight: 500; }
.xv-list .p .zoom:hover span { text-decoration: underline; text-underline-offset: 3px; }
.xv-list .p .zoom svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }
.xv-list .p b { display: inline-grid; place-items: center; width: 17px; height: 17px; border-radius: 50%; background: var(--bs-accent); color: var(--bs-on-accent); font: 500 10px/1 var(--xv-mono); }
.xv-list li.on { box-shadow: inset 0 0 0 1px var(--bs-accent); }
.xv-list li.on .t, .xv-list li.on .n { color: var(--bs-accent-text); }
.xv-scene.wide .xv-list { position: absolute; inset: 0; margin: 0; display: block; pointer-events: none; }
.xv-scene.wide .xv-list li { position: absolute; width: 262px; transform: translateY(-22px); transition: opacity .2s; opacity: 0; }
.xv-scene.wide.apart .xv-list li { pointer-events: auto; }
.xv-scene.wide .xv-list li.on { box-shadow: none; z-index: 1; }
.xv-scene.wide .xv-list .lb { padding: 2px 4px; min-height: 0; }
.xv-scene.wide .xv-list .p { padding: 4px 4px 0 38px; }
.xv-scene.wide .xv-list .p > span, .xv-scene.wide .xv-list .p .zoom { min-height: 24px; }
`;
