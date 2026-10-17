import type { ReactNode } from 'react';

/* Isometric drawing kit for exploded views. x runs right and down the screen, y left and down, z up; one unit is one
   screen unit. A layer's draw() calls the kit, which returns SVG and widens the layer's bounds as it goes. */

export type Vec3 = [number, number, number];
export type Pt = [number, number];
export interface Bounds { minX: number; maxX: number; minY: number; maxY: number; ax: number; ay: number }

export const C = Math.cos(Math.PI / 6), S = 0.5, K = Math.SQRT1_2;
export const P = (x: number, y: number, z: number): Pt => [(x - y) * C, (x + y) * S - z];
export const f = (n: number) => +n.toFixed(2);
const plane = (z: number) => `matrix(${f(C)} ${S} ${f(-C)} ${S} 0 ${f(-z)})`;
/** The x = w side: u runs along y, v is height. */
export const faceX = (w: number) => `matrix(${f(-C)} ${S} 0 -1 ${f(w * C)} ${f(w * S)})`;
/** The y = d side: u runs along x, v is height. */
export const faceY = (d: number) => `matrix(${f(C)} ${S} 0 -1 ${f(-d * C)} ${f(d * S)})`;
export const rr = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
export const circ = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const rrTan = (x: number, y: number, w: number, h: number, r: number): Pt[] => [[x + r - r * K, y + h - r + r * K], [x + w - r + r * K, y + r - r * K]];
const cTan = (cx: number, cy: number, r: number): Pt[] => [[cx - r * K, cy + r * K], [cx + r * K, cy - r * K]];
/** The near half of a circle's rim, for rings drawn round a cylinder. */
export const frontArc = (cx: number, cy: number, r: number) => `M${f(cx - r * K)} ${f(cy + r * K)}A${r} ${r} 0 0 0 ${f(cx + r * K)} ${f(cy - r * K)}`;
/** Far things first, so near ones paint over them. */
export const byDepth = <T extends Pt>(list: T[]) => [...list].sort((a, b) => a[0] + a[1] - b[0] - b[1]);
export const grid = (n: number, from: number, step: number) => byDepth(Array.from({ length: n * n }, (_, k): Pt => [from + (k % n) * step, from + Math.floor(k / n) * step]));

/** A named part of a layer. `at` places its numbered pin; `open` names the figure that a click on it zooms into, and `id`
 * names the hit() group in the drawing that the zoom grows out of. */
export interface Part { name: string; at?: Vec3; open?: string; id?: string }
/** One layer, listed bottom up. `zA` is its height while the thing is whole. */
export interface Layer { key: string; title: string; readout: string; zA: number; parts?: Part[]; draw: (k: Kit) => ReactNode }
/** One figure. `gap` is the space between layers when apart, with labels beside the drawing and with labels under it. */
export interface Model { crumb: string; heading: string; gap: [number, number]; alt: string; caption: string; layers: Layer[] }

interface SolidSpec { d: string; bounds: [number, number, number, number]; tan: Pt[]; z0?: number; h: number; top?: string; side?: string; evenodd?: boolean }

export class Kit {
  defs: ReactNode[] = [];
  box: Bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, ax: -Infinity, ay: Infinity };
  private n = 0;
  /** `id` prefixes the shapes this layer defines; `shared` prefixes the figure's patterns. */
  constructor(private id: string, private shared: string) {}

  private next() { return `${this.id}-${this.n++}`; }
  private grow(x0: number, y0: number, x1: number, y1: number, z0: number, z1: number) {
    const b = this.box;
    for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) {
      const [a, c] = P(x, y, z);
      b.minX = Math.min(b.minX, a); b.maxX = Math.max(b.maxX, a); b.minY = Math.min(b.minY, c); b.maxY = Math.max(b.maxY, c);
      // The label points at the right-most top corner.
      if (z === z1 && (a > b.ax + .01 || (Math.abs(a - b.ax) <= .01 && c < b.ay))) { b.ax = a; b.ay = c; }
    }
  }

  /** A fill from the figure's shared patterns: pores, tft, rgb, mesh, hatch, sensor, pads, fins, wires, bus. */
  url(name: string) { return `url(#${this.shared}-${name})`; }
  /** Adds a gradient, clip path or other definition and returns `url(#id)` for it. */
  def(make: (id: string) => ReactNode) { const id = this.next(); this.defs.push(<g key={id}>{make(id)}</g>); return `url(#${id})`; }

  /** A solid: its footprint stacked in half-unit slices, the two silhouette edges, then its top face. */
  solid({ d, bounds, tan, z0 = 0, h, top = '', side = '', evenodd = false }: SolidSpec) {
    const id = this.next();
    this.defs.push(<path key={id} id={id} d={d} fillRule={evenodd ? 'evenodd' : undefined} />);
    this.grow(...bounds, z0, z0 + h);
    const out: ReactNode[] = [];
    for (let z = z0, k = 0; z < z0 + h - 1e-6; z += 0.5, k++) out.push(<use key={k} href={`#${id}`} transform={plane(z)} className={`side ${side}${k === 0 ? ' base' : ''}`} />);
    tan.forEach(([x, y], k) => { const [a, b] = P(x, y, z0), [, c] = P(x, y, z0 + h); out.push(<line key={`t${k}`} className="tan" x1={f(a)} y1={f(b)} x2={f(a)} y2={f(c)} />); });
    out.push(<use key="top" href={`#${id}`} transform={plane(z0 + h)} className={`top ${top || 'plain'}`} />);
    return <g key={id}>{out}</g>;
  }
  slab(x: number, y: number, w: number, h: number, r: number, z0: number, height: number, o: Partial<SolidSpec> = {}) {
    return this.solid({ d: rr(x, y, w, h, r), bounds: [x, y, x + w, y + h], tan: rrTan(x, y, w, h, r), z0, h: height, ...o });
  }
  cyl(cx: number, cy: number, r: number, z0: number, height: number, o: Partial<SolidSpec> = {}) {
    return this.solid({ d: circ(cx, cy, r), bounds: [cx - r, cy - r, cx + r, cy + r], tan: cTan(cx, cy, r), z0, h: height, ...o });
  }
  /** A rounded plate with a rounded hole or a circle cut out, such as a frame. */
  ringed(outer: [number, number, number, number, number], hole: string, height: number, o: Partial<SolidSpec> = {}) {
    const [x, y, w, h, r] = outer;
    return this.solid({ d: rr(x, y, w, h, r) + hole, evenodd: true, bounds: [x, y, x + w, y + h], tan: rrTan(x, y, w, h, r), h: height, ...o });
  }
  /** Marks drawn flat on the plane at height z. */
  flat(z: number, children: ReactNode, className: string | null = 'det') {
    return <g key={this.next()} transform={plane(z)} className={className ?? undefined}>{children}</g>;
  }
  /** Marks on a side face, from faceX or faceY. */
  face(transform: string, children: ReactNode) { return <g key={this.next()} transform={transform} className="det">{children}</g>; }
  /** A dashed footprint for a layer of loose parts. */
  outline(x: number, y: number, w: number, h: number, r: number) {
    this.grow(x, y, x + w, y + h, 0, 0);
    return this.flat(0, <path className="dash" d={rr(x, y, w, h, r)} />, null);
  }
  holes(list: [number, number, number][]) { return list.map(([x, y, r]) => <circle key={this.next()} className="hole" cx={x} cy={y} r={r} />); }
  rings(cx: number, cy: number, list: number[]) { return list.map((r) => <circle key={this.next()} cx={cx} cy={cy} r={r} />); }
  /** A part that has its own figure: clicking it zooms in. `spot` is the patch the zoom starts from, when not the whole part. */
  hit(open: string, id: string, name: string, children: ReactNode, spot?: ReactNode) {
    return <g key={this.next()} className="hit" data-open={open} data-part={id}><title>{`Zoom into ${name}`}</title>{children}{spot}</g>;
  }
  /** A patch for hit(): the zoom grows out of this square, at height z. */
  spot(x: number, y: number, size: number, z: number) {
    return this.flat(z, <rect className="hitarea spot" x={x} y={y} width={size} height={size} />, null);
  }
}

/** The figure's shared fills. Ids are prefixed so two figures on one page never share them. */
export function patterns(id: string) {
  const p = (name: string, size: [number, number], children: ReactNode) =>
    <pattern key={name} id={`${id}-${name}`} width={size[0]} height={size[1]} patternUnits="userSpaceOnUse">{children}</pattern>;
  return [
    p('pores', [6, 6], <circle cx="3" cy="3" r=".8" className="pat-dot" />),
    p('tft', [10, 10], <><path d="M0 .5H10M.5 0V10" className="pat-line" /><rect x="3" y="3" width="3.4" height="3.4" className="pat-dot" /></>),
    p('rgb', [12, 10], <><rect x="1" y="1.5" width="2.6" height="7" rx=".6" fill="#e0645a" /><rect x="4.7" y="1.5" width="2.6" height="7" rx=".6" fill="#4fb07a" /><rect x="8.4" y="1.5" width="2.6" height="7" rx=".6" fill="#5a84e0" /></>),
    p('mesh', [12, 12], <path d="M6 0L12 6L6 12L0 6Z" className="pat-line" />),
    p('hatch', [5, 5], <path d="M-1 6L6 -1" className="pat-line" />),
    p('sensor', [5, 5], <path d="M0 .5H5M.5 0V5" className="pat-light" />),
    p('pads', [6.5, 6.5], <circle cx="3.25" cy="3.25" r="1.2" className="pat-pad" />),
    p('fins', [8, 8], <><path d="M0 2H8M0 6H8" className="pat-light" /><path d="M4 0V8" className="pat-gate" /></>),
    p('wires', [5, 5], <path d="M0 2.5H5" className="pat-wire" />),
    p('bus', [17, 17], <><path d="M8.5 0V17" className="pat-bus" /><circle cx="8.5" cy="8.5" r="2" className="pat-via" /></>),
  ];
}
