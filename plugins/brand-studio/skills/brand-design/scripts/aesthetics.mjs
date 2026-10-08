#!/usr/bin/env node
// Audit drawn SVG artwork against the checkable rules in references/aesthetics.md: rounded corners that keep curvature
// continuous, one stroke width and few corner radii per set, ink weight and outline detail near the set's median, mirror
// symmetry, and no golden-ratio claims in the notes beside the files.
//
//   node aesthetics.mjs <set>... [--json]
//
// A set is a folder of SVGs, one SVG, a mascot.json (its assembled states, with corners and strokes read from its parts) or
// an icons.json (its glyphs, then its app layers). Problems print as warnings and the run still succeeds: the numbers point
// at what to compare by eye, and a person still judges proportion, novelty and fit. The corner check skips corners under a
// tenth of the canvas, where the jump is too small to see, and canvases of 48 or less, since UI glyphs follow Lucide's
// circular 2 px corners.
//
// Needs playwright-core and a Chromium (`npx playwright-core install chromium`).
import { readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { assembleState } from './mascot.mjs';
import { inside, launch, pixels, readTags, root, shapes } from './svg-kit.mjs';

const SIZE = 128;
/** A set member whose weight or detail is this many times the set's median, or less than its inverse, gets a warning. */
const SPREAD = 1.5;
const PHI = /golden (?:ratio|section|mean)|1\.618|φ|\bphi\b|fibonacci/i;

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const cross = (a, b) => a.x * b.y - a.y * b.x;
const len = a => Math.hypot(a.x, a.y);
const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** Elliptical arc from p0 to p as cubic segments of 90 degrees or less, after the SVG spec's endpoint-to-centre conversion. */
function arc(p0, rx, ry, degrees, large, sweep, p) {
  rx = Math.abs(rx); ry = Math.abs(ry);
  if (!rx || !ry) return [[p0, p0, p, p]];
  const cos = Math.cos(degrees * Math.PI / 180), sin = Math.sin(degrees * Math.PI / 180);
  const hx = (p0.x - p.x) / 2, hy = (p0.y - p.y) / 2, x1 = cos * hx + sin * hy, y1 = -sin * hx + cos * hy;
  const grow = Math.sqrt(Math.max(1, x1 ** 2 / rx ** 2 + y1 ** 2 / ry ** 2));
  rx *= grow; ry *= grow;
  const k = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, (rx ** 2 * ry ** 2 - rx ** 2 * y1 ** 2 - ry ** 2 * x1 ** 2) / (rx ** 2 * y1 ** 2 + ry ** 2 * x1 ** 2)));
  const cx1 = k * rx * y1 / ry, cy1 = -k * ry * x1 / rx;
  const cx = cos * cx1 - sin * cy1 + (p0.x + p.x) / 2, cy = sin * cx1 + cos * cy1 + (p0.y + p.y) / 2;
  const angle = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const start = angle(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry);
  let delta = angle((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry);
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  if (sweep && delta < 0) delta += 2 * Math.PI;
  const n = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2) - 1e-9)), step = delta / n, h = 4 / 3 * Math.tan(step / 4);
  const at = t => ({ x: cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin, y: cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos });
  const dir = t => ({ x: -rx * Math.sin(t) * cos - ry * Math.cos(t) * sin, y: -rx * Math.sin(t) * sin + ry * Math.cos(t) * cos });
  return Array.from({ length: n }, (_, i) => {
    const a = start + i * step, b = a + step, pa = i ? at(a) : p0, pb = i === n - 1 ? p : at(b);
    return [pa, { x: pa.x + h * dir(a).x, y: pa.y + h * dir(a).y }, { x: pb.x - h * dir(b).x, y: pb.y - h * dir(b).y }, pb];
  });
}

/** Subpaths of path data as { closed, segs }, each segment a cubic [p0, p1, p2, p3]. A line is [a, a, b, b]. */
export function subpaths(d) {
  const s = String(d), out = [], NUMBER = /[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/iy;
  let i = 0, cmd = '', last = '', cur = { x: 0, y: 0 }, start = cur, ctrl = cur, sub_ = null;
  const space = () => { while (i < s.length && /[\s,]/.test(s[i])) i++; };
  const num = () => { space(); NUMBER.lastIndex = i; const m = NUMBER.exec(s); if (!m) throw new Error(`path data: number expected at ${i}`); i = NUMBER.lastIndex; return Number(m[0]); };
  const flag = () => { space(); const c = s[i++]; if (c !== '0' && c !== '1') throw new Error(`path data: arc flag expected at ${i - 1}`); return c === '1'; };
  const add = segs => { if (!sub_) { sub_ = { closed: false, segs: [] }; out.push(sub_); } sub_.segs.push(...segs); cur = segs.at(-1)[3]; };
  for (space(); i < s.length; space()) {
    if (/[a-z]/i.test(s[i])) cmd = s[i++];
    else if (!cmd || /z/i.test(cmd)) throw new Error(`path data: command expected at ${i}`);
    const rel = cmd !== cmd.toUpperCase(), C = cmd.toUpperCase();
    const pt = () => { const x = num(), y = num(); return rel ? { x: cur.x + x, y: cur.y + y } : { x, y }; };
    const line = p => add([[cur, cur, p, p]]);
    if (C === 'M') { cur = start = pt(); sub_ = null; cmd = rel ? 'l' : 'L'; }
    else if (C === 'Z') { if (sub_) { if (len(sub(cur, start))) line(start); sub_.closed = true; } sub_ = null; cur = start; }
    else if (C === 'L') line(pt());
    else if (C === 'H') { const x = num(); line({ x: rel ? cur.x + x : x, y: cur.y }); }
    else if (C === 'V') { const y = num(); line({ x: cur.x, y: rel ? cur.y + y : y }); }
    else if (C === 'C' || C === 'S') {
      const p1 = C === 'C' ? pt() : /[CS]/.test(last) ? { x: 2 * cur.x - ctrl.x, y: 2 * cur.y - ctrl.y } : cur, p2 = pt(), p3 = pt();
      add([[cur, p1, p2, p3]]); ctrl = p2;
    } else if (C === 'Q' || C === 'T') {
      const q = C === 'Q' ? pt() : /[QT]/.test(last) ? { x: 2 * cur.x - ctrl.x, y: 2 * cur.y - ctrl.y } : cur, p3 = pt();
      add([[cur, lerp(cur, q, 2 / 3), lerp(p3, q, 2 / 3), p3]]); ctrl = q;
    } else if (C === 'A') {
      const rx = num(), ry = num(), deg = num(), large = flag(), sweep = flag(), p = pt();
      add(arc(cur, rx, ry, deg, large, sweep, p));
    } else throw new Error(`path data: unknown command ${cmd}`);
    last = C;
  }
  return out;
}

const straight = ([a, b, c, d]) => { const v = sub(d, a), l2 = v.x ** 2 + v.y ** 2; return l2 > 0 && [b, c].every(p => Math.abs(cross(v, sub(p, a))) <= 1e-6 * l2); };
const headTangent = ([a, ...rest]) => rest.map(p => sub(p, a)).find(v => len(v) > 1e-9);
const tailTangent = seg => [seg[2], seg[1], seg[0]].map(p => sub(seg[3], p)).find(v => len(v) > 1e-9);
/** Angle in degrees between two directions. */
const turn = (u, v) => Math.abs(Math.atan2(cross(u, v), u.x * v.x + u.y * v.y)) * 180 / Math.PI;

/** Curvature of a cubic at t; just inside the end when the end has a zero-length handle. */
function curvature([a, b, c, d], t) {
  const u = 1 - t;
  const d1 = { x: 3 * (u * u * (b.x - a.x) + 2 * u * t * (c.x - b.x) + t * t * (d.x - c.x)), y: 3 * (u * u * (b.y - a.y) + 2 * u * t * (c.y - b.y) + t * t * (d.y - c.y)) };
  const d2 = { x: 6 * (u * (c.x - 2 * b.x + a.x) + t * (d.x - 2 * c.x + b.x)), y: 6 * (u * (c.y - 2 * b.y + a.y) + t * (d.y - 2 * c.y + b.y)) };
  const speed = len(d1);
  return speed > 1e-9 ? Math.abs(cross(d1, d2)) / speed ** 3 : curvature([a, b, c, d], t ? t - 1e-3 : 1e-3);
}

const point = ([a, b, c, d], t) => { const u = 1 - t; return { x: u ** 3 * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t ** 3 * d.x, y: u ** 3 * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t ** 3 * d.y }; };

/** Rounded corners in path data: runs of curves between two straight edges, met by both without a kink, that turn between
 * 5 and 150 degrees (so a jog or a pill's round end is not a corner). Each reports its mean radius (length over turn) and
 * whether curvature jumps at an edge: a circular arc meets the line at full curvature, a continuous corner starts near zero. */
export function corners(d) {
  const found = [], SAMPLES = Array.from({ length: 21 }, (_, i) => i / 20);
  for (const { closed, segs: all } of subpaths(d)) {
    const segs = all.filter(seg => seg.some(p => len(sub(p, seg[0])) > 1e-9)), flat = segs.map(straight), n = segs.length;
    if (!flat.includes(true) || !flat.includes(false)) continue;
    const first = flat.indexOf(true), order = closed ? Array.from({ length: n }, (_, k) => (first + 1 + k) % n) : [...segs.keys()];
    let before = closed ? first : undefined, run = [];
    for (const idx of order) {
      if (!flat[idx]) { run.push(segs[idx]); continue; }
      if (run.length && before !== undefined) {
        const into = tailTangent(segs[before]), out = headTangent(segs[idx]), angle = turn(into, out);
        if (turn(into, headTangent(run[0])) < 5 && turn(tailTangent(run.at(-1)), out) < 5 && angle > 5 && angle < 150) {
          const peak = Math.max(...run.flatMap(seg => SAMPLES.map(t => curvature(seg, t))));
          const length = run.reduce((sum, seg) => sum + SAMPLES.slice(1).reduce((s, t, k) => s + len(sub(point(seg, t), point(seg, SAMPLES[k]))), 0), 0);
          found.push({ radius: length / (angle * Math.PI / 180), abrupt: Math.max(curvature(run[0], 0), curvature(run.at(-1), 1)) >= 0.5 * peak });
        }
      }
      run = []; before = idx;
    }
  }
  return found;
}

/** Path data for a rounded <rect>, or null when its corners are square. */
function rectPath({ x = 0, y = 0, width, height, rx, ry }) {
  const w = Number(width), h = Number(height);
  let a = Number(rx ?? ry), b = Number(ry ?? rx);
  if (!(a > 0 && b > 0 && w > 0 && h > 0)) return null;
  a = Math.min(a, w / 2); b = Math.min(b, h / 2);
  const [l, t] = [Number(x), Number(y)];
  return `M${l + a} ${t}H${l + w - a}A${a} ${b} 0 0 1 ${l + w} ${t + b}V${t + h - b}A${a} ${b} 0 0 1 ${l + w - a} ${t + h}H${l + a}A${a} ${b} 0 0 1 ${l} ${t + h - b}V${t + b}A${a} ${b} 0 0 1 ${l + a} ${t}Z`;
}

/** Rounded corners, stroke widths and the canvas size of one SVG. */
export function vectorFacts(svg) {
  const paths = readTags(svg).filter(t => !t.close).map(t => t.name === 'path' ? t.attrs.d : t.name === 'rect' ? rectPath(t.attrs) : null).filter(Boolean);
  const strokes = shapes(svg).filter(({ attrs: a }) => a.stroke && a.stroke !== 'none').map(({ attrs: a }) => Number(a['stroke-width'] ?? 1));
  const box = (root(svg)?.viewBox ?? '').trim().split(/[\s,]+/).map(Number);
  return { corners: paths.flatMap(corners), strokes, canvas: Math.max(box[2], box[3]) || Infinity };
}

/** Weight (mean coverage), detail (outline length in canvas widths) and mirror symmetry (IoU of the shape and its mirror
 * about its own vertical centre) from RGBA pixels at size × size. */
export function rasterFacts(px, size) {
  const m = new Uint8Array(size * size);
  let ink = 0, edge = 0, lo = size, hi = -1;
  for (let i = 0; i < m.length; i++) { ink += px[i * 4 + 3] / 255; m[i] = px[i * 4 + 3] >= 128 ? 1 : 0; }
  const on = (x, y) => x >= 0 && y >= 0 && x < size && y < size && m[y * size + x];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (!m[y * size + x]) continue;
    lo = Math.min(lo, x); hi = Math.max(hi, x);
    if (!on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1)) edge++;
  }
  let both = 0, either = 0;
  for (let y = 0; y < size; y++) for (let x = lo; x <= hi; x++) {
    const a = m[y * size + x], b = m[y * size + lo + hi - x];
    if (a && b) both++; if (a || b) either++;
  }
  return { weight: ink / m.length, detail: edge / size, symmetry: either ? both / either : 1 };
}

const median = values => { const s = [...values].sort((a, b) => a - b), k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };
const round = (v, digits = 2) => Number(v.toFixed(digits));

/** Warnings for one set from its measured items and sources. */
export function judge({ items, sources }) {
  const warnings = [];
  for (const s of sources) {
    if (s.canvas <= 48) continue;
    const large = s.corners.filter(c => c.radius >= 0.1 * s.canvas), abrupt = large.filter(c => c.abrupt);
    if (abrupt.length) warnings.push(`${s.id}: ${abrupt.length} of ${large.length} large rounded corners jump straight to full curvature (radius ${[...new Set(abrupt.map(c => Math.round(c.radius)))].join(', ')}); draw continuous corners, such as Figma's corner smoothing at 0.6`);
  }
  const strokes = [...new Set(sources.flatMap(s => s.strokes))].sort((a, b) => a - b);
  if (strokes.length > 1) warnings.push(`${strokes.length} stroke widths across the set (${strokes.join(', ')}); hold one width`);
  const radii = [...new Set(sources.flatMap(s => s.corners.map(c => round(c.radius, 1))))].sort((a, b) => a - b);
  if (radii.length > 2) warnings.push(`${radii.length} corner radii across the set (${radii.join(', ')}); hold one or two`);
  if (items.length >= 3) for (const key of ['weight', 'detail']) {
    const mid = median(items.map(i => i[key]));
    for (const i of items) {
      const ratio = i[key] / mid;
      if (ratio > SPREAD || ratio < 1 / SPREAD) warnings.push(`${i.id}: ${key} is ${round(ratio, 1)}× the set's median; compare it beside the others`);
    }
  }
  return warnings;
}

/** Lines that cite the golden ratio in the Markdown and JSON notes of a folder. */
export function phiClaims(dir) {
  return readdirSync(dir).filter(f => /\.(md|json)$/.test(f)).flatMap(f => readFileSync(path.join(dir, f), 'utf8').split('\n')
    .flatMap((line, k) => PHI.test(line) ? [`${path.relative(process.cwd(), path.join(dir, f))}:${k + 1}: cites the golden ratio; size parts from one module or the object's job instead`] : []));
}

/** The sets one argument names, each { name, dir, items, sources } with items and sources as { id, svg }. */
export function loadSets(arg) {
  const full = path.resolve(arg), dir = statSync(full).isDirectory() ? full : path.dirname(full);
  const read = file => { if (!inside(dir, file)) throw new Error(`${arg}: ${file} is outside the spec's folder`); return readFileSync(path.resolve(dir, file), 'utf8'); };
  const set = (name, items, sources = items) => ({ name, dir, items, sources });
  if (dir === full) {
    const files = readdirSync(full).filter(f => f.endsWith('.svg')).sort();
    if (!files.length) throw new Error(`${arg}: no SVG files`);
    return [set(arg, files.map(f => ({ id: f.slice(0, -4), svg: read(f) })))];
  }
  if (full.endsWith('.svg')) return [set(arg, [{ id: path.basename(full, '.svg'), svg: read(path.basename(full)) }])];
  const spec = JSON.parse(readFileSync(full, 'utf8'));
  if (Array.isArray(spec.states) && Array.isArray(spec.slots)) {
    const parts = [...new Set(Object.values(spec.parts ?? {}).flatMap(v => Object.values(v ?? {})))];
    return [set(`${arg} states`, spec.states.map(s => ({ id: s.id, svg: assembleState(spec, s, read) })), parts.map(f => ({ id: f, svg: read(f) })))];
  }
  if (Array.isArray(spec.glyphs)) {
    const sets = [set(`${arg} glyphs`, spec.glyphs.map(g => ({ id: g.name, svg: read(g.file) })))];
    if (Array.isArray(spec.app?.layers)) sets.push(set(`${arg} app layers`, spec.app.layers.map(f => ({ id: f, svg: read(f) }))));
    return sets;
  }
  throw new Error(`${arg}: expected a folder of SVGs, an SVG, a mascot.json or an icons.json`);
}

async function main() {
  const argv = process.argv.slice(2), args = argv.filter(a => !a.startsWith('--'));
  if (!args.length) throw new Error('Usage: node aesthetics.mjs <folder | file.svg | mascot.json | icons.json>... [--json]');
  const sets = args.flatMap(loadSets), notes = new Set(), report = [];
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.setContent('<!doctype html><html><body></body></html>');
    for (const s of sets) {
      const items = [];
      for (const { id, svg } of s.items) items.push({ id, ...rasterFacts(await pixels(page, svg, SIZE), SIZE) });
      const sources = s.sources.map(({ id, svg }) => ({ id, ...vectorFacts(svg) }));
      const warnings = judge({ items, sources });
      if (!notes.has(s.dir)) { notes.add(s.dir); warnings.push(...phiClaims(s.dir)); }
      report.push({ name: s.name, items: items.map(i => ({ id: i.id, weight: round(i.weight), detail: round(i.detail), symmetry: round(i.symmetry) })), warnings });
    }
  } finally { await browser.close(); }
  if (argv.includes('--json')) { console.log(JSON.stringify({ sets: report }, null, 2)); return; }
  for (const r of report) {
    const width = Math.max(4, ...r.items.map(i => i.id.length));
    console.log(`\n${r.name}\n  ${'item'.padEnd(width)}  weight  detail  symmetry`);
    for (const i of r.items) console.log(`  ${i.id.padEnd(width)}  ${String(i.weight).padStart(6)}  ${String(i.detail).padStart(6)}  ${String(i.symmetry).padStart(8)}`);
    for (const w of r.warnings) console.log(`  warning: ${w}`);
  }
  const count = report.reduce((n, r) => n + r.warnings.length, 0);
  console.log(`\nAudited ${report.length} sets: ${count} warnings. The numbers point at what to compare by eye; they do not score beauty.`);
}

// realpath: Node resolves a symlinked script to its target, so compare against the resolved path.
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
