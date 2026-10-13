#!/usr/bin/env node
// Check and export an explainer figure: an isometric drawing of a working object, built from a parts list, that steps
// through how a system works in the brand's tokens.
//
//   node figure.mjs <dir>/figure.json [--out DIR] [--video]
//
// Paths in the spec resolve from its folder. Writes figure.html (standalone, light and dark, keyboard and touch),
// figure.svg (the poster step in presentation attributes), poster.png, phone.png and sheet.png (every step in both
// themes) to <dir>/out. --video adds figure.mp4, the page walking through every step. Exits with an error after writing
// them when parts pass through each other at a step or during a move, a part floats, the depth order has a cycle, the
// lit part is too small on a 390 px phone, or the page overflows, clips text, has a small tap target, draws a step
// differently from the audit or does not follow a swipe, Play or a seek.
//
// Needs playwright-core and a Chromium (`npx playwright-core install chromium`). --video needs ffmpeg on the PATH.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { contrast, validateBrand } from './brand-check.mjs';
import { launch, slug, text, unsafe } from './svg-kit.mjs';

/** Part tones from references/figure.md, quietest first. The lit accent is set per step, not per part. */
export const TONES = ['base', 'structure', 'subject'];
/** Marks a part can carry on its faces. Each one is a closed outline, runs edge to edge or stands for text. */
export const DETAILS = ['inset', 'screws', 'slats', 'seam', 'slots', 'rules'];
const ON = { inset: ['top', 'left', 'right'], screws: ['top'], slats: ['top'], seam: ['side'], slots: ['left', 'right'], rules: ['top', 'left', 'right'] };
const ELEVATION = Math.PI / 6;
const EPS = 1e-6;
/** Poses audited between two neighbouring steps, and the paint orders the page can switch between during a move. */
export const SAMPLES = 8;
/** Side shades between the face turned to the left edge and the face turned to the right edge. */
const LEVELS = 16;
/** Stage width on a 390 px phone: the viewport less the page and card padding the page CSS sets. */
export const PHONE_STAGE = 326;
const MIN_LIT = 24;
/** The film of the tour: seconds a step holds, seconds it takes to reach the next, and frames per second. */
const HOLD = 1.6, MOVE = 0.9, FPS = 30;

const num = v => typeof v === 'number' && Number.isFinite(v);
const vec = v => Array.isArray(v) && v.length === 3 && v.every(num);
const add = (a, b) => a.map((v, i) => v + b[i]);
const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const fix = v => String(Math.round(v * 100) / 100);
const line = points => points.map((p, i) => `${i ? 'L' : 'M'}${fix(p[0])} ${fix(p[1])}`).join('');
const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const heightOf = part => part.kind === 'cylinder' ? part.h : part.size[2];

/** The camera at an azimuth in degrees: x runs right and down the screen, y left and down, z up, one world unit per
 * screen unit. Every axis points at the viewer, so a larger coordinate is nearer. */
export function camera(azimuth = 45) {
  const a = azimuth * Math.PI / 180, [ca, sa] = [Math.cos(a), Math.sin(a)], [ce, se] = [Math.cos(ELEVATION), Math.sin(ELEVATION)];
  return {
    point: ([x, y, z]) => [x * ca - y * sa, (x * sa + y * ca) * se - z * ce],
    depth: ([x, y, z]) => (x * sa + y * ca) * ce + z * se,
    toward: [sa, ca], right: [ca, -sa],
  };
}

/** A part's bounding box, moved by offset. A box's `at` is its low corner; a cylinder's is the centre of its base. */
export function boxOf(part, offset = [0, 0, 0]) {
  const [x, y, z] = add(part.at, offset);
  if (part.kind === 'cylinder') return { min: [x - part.r, y - part.r, z], max: [x + part.r, y + part.r, z + part.h] };
  return { min: [x, y, z], max: add([x, y, z], part.size) };
}

const gap = (a, b, k) => Math.max(a.min[k] - b.max[k], b.min[k] - a.max[k]);
/** True when two boxes share volume. */
export const collide = (a, b) => [0, 1, 2].every(k => gap(a, b, k) < -EPS);
/** True when two boxes meet on a face: flush on one axis and overlapping on the other two. */
export const touch = (a, b) => { const g = [0, 1, 2].map(k => gap(a, b, k)); return g.filter(v => Math.abs(v) <= EPS).length === 1 && g.filter(v => v < -EPS).length === 2; };
/** 1 when a is painted after b, -1 when before, 0 when the two never cover each other. */
export function nearer(a, b) {
  const front = (p, q) => [0, 1, 2].some(k => p.min[k] >= q.max[k] - EPS);
  return front(a, b) === front(b, a) ? 0 : front(a, b) ? 1 : -1;
}

function hull(points) {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = list => { const h = []; for (const p of list) { while (h.length > 1 && cross(h.at(-2), h.at(-1), p) <= 0) h.pop(); h.push(p); } h.pop(); return h; };
  return [...half(sorted), ...half(sorted.reverse())];
}

/** True when two convex outlines share area on screen; outlines that only touch do not. */
function cover(a, b) {
  for (const poly of [a, b]) for (let i = 0; i < poly.length; i++) {
    const [p, q] = [poly[i], poly[(i + 1) % poly.length]], l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, n = [(q[1] - p[1]) / l, (p[0] - q[0]) / l];
    const [sa, sb] = [a, b].map(list => list.map(v => v[0] * n[0] + v[1] * n[1]));
    if (Math.min(...sa) >= Math.max(...sb) - EPS || Math.min(...sb) >= Math.max(...sa) - EPS) return false;
  }
  return true;
}

const corners = box => [0, 1].flatMap(i => [0, 1].flatMap(j => [0, 1].map(k => [i ? box.max[0] : box.min[0], j ? box.max[1] : box.min[1], k ? box.max[2] : box.min[2]])));

/** Back-to-front order of items { id, box, ghost } so that every item is painted after the items it covers. Ghosts take
 * any slot. cycle lists the items left when no order satisfies every pair. */
export function paintOrder(items, cam = camera()) {
  const outline = items.map(it => hull(corners(it.box).map(cam.point)));
  const behind = items.map(() => new Set());
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    if (items[i].ghost || items[j].ghost) continue;
    const n = nearer(items[i].box, items[j].box);
    if (n && cover(outline[i], outline[j])) behind[n > 0 ? i : j].add(n > 0 ? j : i);
  }
  const key = items.map(it => cam.depth(lerp(it.box.min, it.box.max, 0.5)));
  const left = new Set(items.keys()), order = [];
  while (left.size) {
    const free = [...left].filter(i => ![...behind[i]].some(j => left.has(j))).sort((a, b) => key[a] - key[b]);
    if (!free.length) return { order: order.map(i => items[i].id), cycle: [...left].map(i => items[i].id) };
    left.delete(free[0]); order.push(free[0]);
  }
  return { order: order.map(i => items[i].id), cycle: [] };
}

/** A part's plan outline, counter-clockwise, shrunk by inset. */
function planOf(part, inset = 0) {
  if (part.kind === 'cylinder') {
    const r = part.r - inset;
    return Array.from({ length: 48 }, (_, i) => [part.at[0] + r * Math.cos(Math.PI * i / 24), part.at[1] + r * Math.sin(Math.PI * i / 24)]);
  }
  const [x, y] = [part.at[0] + inset, part.at[1] + inset], [w, d] = [part.size[0] - 2 * inset, part.size[1] - 2 * inset];
  const r = Math.max(0, Math.min((part.round ?? 0) - inset, w / 2, d / 2));
  if (r < 0.05) return [[x, y], [x + w, y], [x + w, y + d], [x, y + d]];
  const arc = (cx, cy, from) => Array.from({ length: 7 }, (_, i) => { const t = (from + i * 15) * Math.PI / 180; return [cx + r * Math.cos(t), cy + r * Math.sin(t)]; });
  return [...arc(x + w - r, y + r, -90), ...arc(x + w - r, y + d - r, 0), ...arc(x + r, y + d - r, 90), ...arc(x + r, y + r, 180)];
}

/** The marks of one detail as { d, paint } paths. chain is the part's visible side run at a height. */
function detailPaths(part, detail, cam, chain) {
  const P = cam.point, [x, y, z0] = part.at, h = heightOf(part), z1 = z0 + h, m = detail.margin ?? 3, on = detail.on ?? ON[detail.kind][0];
  if (detail.kind === 'seam') return [{ d: line(chain(z0 + h * (detail.at ?? 0.5))), paint: 'detail' }];
  if (on === 'top' && detail.kind === 'inset') return [{ d: `${line(planOf(part, m).map(p => P([...p, z1])))}Z`, paint: 'detail' }];
  const [w, d] = part.size, round = part.round ?? 0;
  // A point on a face from its low corner: u along the face, v across the top or up a side.
  const face = { top: (u, v) => [x + u, y + v, z1], left: (u, v) => [x + u, y + d, z0 + v], right: (u, v) => [x + w, y + u, z0 + v] }[on];
  const [U, V] = [on === 'right' ? d : w, on === 'top' ? d : h];
  const pad = Math.max(m, on === 'top' ? 0 : round), at = (u, v) => P(face(u, v));
  if (detail.kind === 'inset') return [{ d: `${line([at(pad, m), at(U - pad, m), at(U - pad, V - m), at(pad, V - m)])}Z`, paint: 'detail' }];
  if (detail.kind === 'screws') return [[m, m], [U - m, m], [U - m, V - m], [m, V - m]].map(([u, v]) => ({ d: `${line(Array.from({ length: 10 }, (_, i) => at(u + 0.9 * Math.cos(Math.PI * i / 5), v + 0.9 * Math.sin(Math.PI * i / 5))))}Z`, paint: 'dot' }));
  const count = detail.count ?? 3;
  if (detail.kind === 'slats') {
    // Each slat runs across the top from edge to edge, so it ends on the outline, also on a rounded plan.
    const plan = planOf(part), axis = detail.along === 'y' ? 1 : 0, across = 1 - axis, low = part.at[across], size = part.size[across];
    return Array.from({ length: count }, (_, i) => {
      const value = low + size * (i + 1) / (count + 1), hits = [];
      plan.forEach((p, k) => { const q = plan[(k + 1) % plan.length]; if ((p[across] - value) * (q[across] - value) < 0) hits.push(p[axis] + (q[axis] - p[axis]) * (value - p[across]) / (q[across] - p[across])); });
      const ends = [Math.min(...hits), Math.max(...hits)].map(v => { const p = [0, 0, z1]; p[axis] = v; p[across] = value; return P(p); });
      return { d: line(ends), paint: 'detail' };
    });
  }
  if (detail.kind === 'slots') {
    const width = (U - 2 * pad) / (count * 1.5 - 0.5), tall = Math.min(2, V * 0.14), mid = V * (detail.at ?? 0.5);
    return Array.from({ length: count }, (_, i) => { const u = pad + i * width * 1.5; return { d: `${line([at(u, mid - tall / 2), at(u + width, mid - tall / 2), at(u + width, mid + tall / 2), at(u, mid + tall / 2)])}Z`, paint: 'detail' }; });
  }
  // rules: lines of different lengths that stand for printed text, the one mark allowed to end on a bare face
  return Array.from({ length: count }, (_, i) => { const v = m + (V - 2 * m) * (i + 0.5) / count; return { d: line([at(pad, v), at(pad + (U - 2 * pad) * [1, 0.62, 0.84][i % 3], v)]), paint: 'rule' }; });
}

/** The paths of one part at rest, back to front: side facets, top, creases, outline, then details. */
function draw(part, cam) {
  const P = cam.point, plan = planOf(part), n = plan.length, z0 = part.at[2], z1 = z0 + heightOf(part);
  const at = (i, z) => P([...plan[i % n], z]);
  const normal = i => { const [a, b] = [plan[i % n], plan[(i + 1) % n]], l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[1] - a[1]) / l, (a[0] - b[0]) / l]; };
  const seen = i => { const m = normal(i); return m[0] * cam.toward[0] + m[1] * cam.toward[1] > EPS; };
  let start = 0; while (!(seen(start) && !seen(start + n - 1))) start++;
  let count = 0; while (seen(start + count)) count++;
  const level = i => { const m = normal(i); return Math.round((Math.asin(Math.max(-1, Math.min(1, m[0] * cam.right[0] + m[1] * cam.right[1]))) / Math.PI + 0.5) * LEVELS); };
  const chain = z => Array.from({ length: count + 1 }, (_, k) => at(start + k, z));
  const shapes = [];
  for (let i = 0; i < count;) {
    let j = i; while (j + 1 < count && level(start + j + 1) === level(start + i)) j++;
    const run = Array.from({ length: j - i + 2 }, (_, k) => start + i + k);
    shapes.push({ d: `${line([...run.map(k => at(k, z0)), ...run.reverse().map(k => at(k, z1))])}Z`, paint: 'side', level: level(start + i) });
    i = j + 1;
  }
  shapes.push({ d: `${line(plan.map((_, i) => at(i, z1)))}Z`, paint: 'top' });
  shapes.push({ d: line(chain(z1)), paint: 'crease' });
  for (let k = 1; k < count; k++) {
    const [a, b] = [normal(start + k - 1), normal(start + k)];
    if (a[0] * b[0] + a[1] * b[1] < 0.8) shapes.push({ d: line([at(start + k, z0), at(start + k, z1)]), paint: 'crease' });
  }
  const far = Array.from({ length: n - count + 1 }, (_, k) => at(start + count + k, z1));
  shapes.push({ d: `${line([...chain(z0), ...far])}Z`, paint: 'edge' });
  for (const detail of part.details ?? []) shapes.push(...detailPaths(part, detail, cam, chain));
  return shapes;
}

const mix = (a, b, t) => `#${[1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('')}`;

/** Face and line colours for one theme's tokens, per tone and for the lit accent. Every colour is a mix of the card,
 * the ink and the accent, so the figure takes the brand's palette. top is the lightest face; sides run from sa, facing
 * the left edge, to sb, facing the right. */
export function palette(tokens) {
  const card = tokens.elevated, dark = contrast(card, '#ffffff') > contrast(card, '#000000'), shadow = dark ? '#000000' : tokens.ink;
  const toward = v => v < 0 ? mix(card, shadow, -v) : mix(card, tokens.ink, v);
  const tone = (top, sa, sb, edge) => ({ top: toward(top), sa: toward(sa), sb: toward(sb), edge: toward(edge), crease: toward(edge * 0.42), detail: toward(edge * 0.55) });
  return {
    base: dark ? tone(0.04, -0.12, -0.3, 0.4) : tone(0.05, 0.1, 0.165, 0.38),
    structure: dark ? tone(0.09, 0.03, -0.14, 0.55) : tone(0.02, 0.065, 0.13, 0.5),
    subject: dark ? tone(0.16, 0.09, 0.02, 0.85) : tone(0, 0.04, 0.1, 0.85),
    lit: { top: tokens.accent, sa: mix(tokens.accent, shadow, 0.14), sb: mix(tokens.accent, shadow, 0.34), edge: tokens.ink, crease: mix(tokens.accent, shadow, 0.45), detail: mix(tokens.accent, tokens.onAccent, 0.7) },
    halo: { fill: shadow, opacity: dark ? 0.55 : 0.12 },
  };
}

const STROKES = { edge: 0.8, crease: 0.6, detail: 0.6, rule: 0.6 };
/** Presentation attributes for a path in a theme's colours, for output that carries no CSS. */
function paintAttrs(shape, c) {
  const flat = 'vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"';
  if (shape.paint === 'side') { const fill = mix(c.sa, c.sb, shape.level / LEVELS); return `fill="${fill}" stroke="${fill}" stroke-width="0.5" ${flat}`; }
  if (shape.paint === 'top') return `fill="${c.top}"`;
  if (shape.paint === 'dot') return `fill="${c.detail}"`;
  return `fill="none" stroke="${c[shape.paint === 'rule' ? 'detail' : shape.paint]}" stroke-width="${STROKES[shape.paint]}" ${flat}`;
}

/** Offsets, lit parts and hidden parts of each step, per part. A move, lit or hide name is a part id or a group. */
function poses(spec) {
  const named = (list, p) => list.includes(p.id) || (p.group !== undefined && list.includes(p.group));
  return spec.steps.map(step => ({
    offset: spec.parts.map(p => step.move?.[p.id] ?? step.move?.[p.group] ?? [0, 0, 0]),
    lit: spec.parts.map(p => named([step.lit], p)),
    hidden: spec.parts.map(p => named(step.hide ?? [], p)),
  }));
}

/** The figure's screen box over every step, with room for the halo: [x, y, width, height]. */
function viewBox(spec, cam, pose) {
  const points = pose.flatMap(s => spec.parts.flatMap((p, i) => corners(boxOf(p, s.offset[i])).map(cam.point)));
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]), pad = 0.08 * (Math.max(...xs) - Math.min(...xs));
  return [Math.min(...xs) - pad, Math.min(...ys) - pad / 2, Math.max(...xs) - Math.min(...xs) + 2 * pad, Math.max(...ys) - Math.min(...ys) + pad + 6];
}

/** Audit the geometry. problems: parts that pass through each other at a step or at SAMPLES poses between neighbours,
 * parts that float, depth cycles and a lit part too small for a phone. Also returns the paint order of every
 * pose, which the page replays. */
export function audit(spec) {
  const cam = camera(spec.camera?.azimuth), pose = poses(spec), problems = new Set(), warnings = new Set();
  const ids = spec.parts.map(p => p.id), name = i => spec.steps[i].id;
  const at = (a, b, t) => spec.parts.map((p, i) => ({ id: p.id, box: boxOf(p, lerp(pose[a].offset[i], pose[b].offset[i], t)), ghost: pose[a].hidden[i] && pose[b].hidden[i], solid: !pose[a].hidden[i] && !pose[b].hidden[i] }));
  const check = (items, where) => {
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      if (items[i].solid && items[j].solid && collide(items[i].box, items[j].box)) problems.add(`${where}: ${items[i].id} passes through ${items[j].id}`);
    }
    const { order, cycle } = paintOrder(items, cam);
    if (cycle.length) problems.add(`${where}: no depth order fits ${cycle.join(', ')}; split one of them or move them apart`);
    return [...order, ...cycle].map(id => ids.indexOf(id));
  };
  const box = viewBox(spec, cam, pose), scale = PHONE_STAGE / box[2];
  const steps = spec.steps.map((step, s) => {
    const items = at(s, s, 0), shown = items.filter(it => it.solid);
    // A set visits the members added while it is walked, so this reaches every part joined to the ground by touching parts.
    const held = new Set(shown.filter(it => Math.abs(it.box.min[2]) <= EPS));
    for (const it of held) for (const o of shown) if (!held.has(o) && touch(it.box, o.box)) held.add(o);
    for (const it of shown) if (!held.has(it)) problems.add(`step ${step.id}: ${it.id} floats; rest it on the ground or on a part that reaches the ground`);
    const lit = items.filter((it, i) => pose[s].lit[i] && it.solid).flatMap(it => corners(it.box).map(cam.point));
    const span = lit.length ? Math.max(Math.max(...lit.map(p => p[0])) - Math.min(...lit.map(p => p[0])), Math.max(...lit.map(p => p[1])) - Math.min(...lit.map(p => p[1]))) * scale : 0;
    if (span < MIN_LIT) problems.add(`step ${step.id}: the lit part spans ${Math.round(span)} px on a 390 px phone; make it at least ${MIN_LIT} px`);
    return check(items, `step ${step.id}`);
  });
  const between = steps.slice(1).map((_, s) => Array.from({ length: SAMPLES + 1 }, (_, k) => k === 0 ? steps[s] : k === SAMPLES ? steps[s + 1] : check(at(s, s + 1, k / SAMPLES), `between ${name(s)} and ${name(s + 1)}`)));
  if (box[2] / box[3] < 0.9 || box[2] / box[3] > 2.4) warnings.add(`the figure is ${fix(box[2] / box[3])} times as wide as it is tall; between 1.2 and 2 fills a card best`);
  return { problems: [...problems], warnings: [...warnings], pose, steps, between, viewBox: box, cam };
}

function tokenErrors(spec, dir) {
  if (!text(spec.brand)) return ['brand must name the contract file'];
  const file = path.resolve(dir, spec.brand);
  if (!existsSync(file)) return [`brand contract not found: ${spec.brand}`];
  return validateBrand(JSON.parse(readFileSync(file, 'utf8'))).map(e => `${spec.brand}: ${e}`);
}

/** Errors and warnings for a figure spec. root is the spec's folder. */
export function validateFigure(spec, { root: dir = '.' } = {}) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) return { errors: ['spec must be an object'], warnings: [] };
  const errors = [], warnings = [];
  if (spec.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (!slug(spec.id)) errors.push('id must be kebab-case');
  for (const key of ['fig', 'title', 'alt', 'caption', 'truth']) if (!text(spec[key])) errors.push(`${key} must be nonempty text${key === 'truth' ? ': say where the names and numbers in the readouts come from' : ''}`);
  errors.push(...tokenErrors(spec, dir));
  const azimuth = spec.camera?.azimuth;
  if (azimuth !== undefined && !(num(azimuth) && azimuth >= 30 && azimuth <= 60)) errors.push('camera.azimuth must be between 30 and 60 degrees');
  const parts = Array.isArray(spec.parts) ? spec.parts : [], ids = new Set(), groups = new Set();
  if (parts.length < 8) errors.push('parts needs at least 8 solids; a few plain slabs read as a diagram, not an object');
  else if (parts.length < 20) warnings.push(`${parts.length} parts: crafted figures carry 30 to 60; add structure such as feet, rails, stops and pulls`);
  parts.forEach((p, i) => {
    const at = `parts[${i}]${slug(p?.id) ? ` (${p.id})` : ''}`;
    if (!slug(p?.id)) errors.push(`${at}.id must be kebab-case`);
    else if (ids.has(p.id)) errors.push(`duplicate part: ${p.id}`);
    else ids.add(p.id);
    if (!vec(p?.at)) errors.push(`${at}.at must be [x, y, z]`);
    if (p?.kind === 'cylinder') { if (!(num(p.r) && p.r > 0 && num(p.h) && p.h > 0)) errors.push(`${at} needs r and h above 0`); }
    else if (p?.kind !== 'box') errors.push(`${at}.kind must be box or cylinder`);
    else if (!(vec(p.size) && p.size.every(v => v > 0))) errors.push(`${at}.size must be [width, depth, height], each above 0`);
    else if (p.round !== undefined && !(num(p.round) && p.round >= 0 && p.round <= Math.min(p.size[0], p.size[1]) / 2)) errors.push(`${at}.round must be from 0 to half the shorter side`);
    if (!TONES.includes(p?.tone)) errors.push(`${at}.tone must be one of ${TONES.join(', ')}`);
    if (p?.group !== undefined) { if (slug(p.group)) groups.add(p.group); else errors.push(`${at}.group must be kebab-case`); }
    for (const d of Array.isArray(p?.details) ? p.details : []) {
      if (!DETAILS.includes(d?.kind)) { errors.push(`${at}: detail kind must be one of ${DETAILS.join(', ')}`); continue; }
      if (d.kind !== 'seam' && !ON[d.kind].includes(d.on ?? ON[d.kind][0])) errors.push(`${at}: ${d.kind} goes on ${ON[d.kind].join(' or ')}`);
      if (p.kind === 'cylinder' && !(d.kind === 'seam' || (d.kind === 'inset' && (d.on ?? 'top') === 'top'))) errors.push(`${at}: a cylinder takes a seam or a top inset`);
    }
  });
  for (const g of groups) if (ids.has(g)) errors.push(`group ${g} has the name of a part; rename one`);
  const known = v => ids.has(v) || groups.has(v), steps = Array.isArray(spec.steps) ? spec.steps : [], stepIds = new Set();
  if (steps.length < 2 || steps.length > 6) errors.push('steps needs 2 to 6 steps');
  steps.forEach((s, i) => {
    const at = `steps[${i}]${slug(s?.id) ? ` (${s.id})` : ''}`;
    if (!slug(s?.id)) errors.push(`${at}.id must be kebab-case`);
    else if (stepIds.has(s.id)) errors.push(`duplicate step: ${s.id}`);
    else stepIds.add(s.id);
    for (const key of ['label', 'readout']) if (!text(s?.[key])) errors.push(`${at}.${key} must be nonempty text`);
    if (!known(s?.lit)) errors.push(`${at}.lit must name one part or group: the thing to watch in this step`);
    const hide = s?.hide ?? [], move = s?.move ?? {};
    if (!Array.isArray(hide) || !hide.every(known)) errors.push(`${at}.hide must list parts or groups`);
    else if (hide.includes(s?.lit)) errors.push(`${at}: the lit part is hidden`);
    if (typeof move !== 'object' || Array.isArray(move)) errors.push(`${at}.move must map a part or group to [x, y, z]`);
    else for (const [key, v] of Object.entries(move)) if (!known(key) || !vec(v)) errors.push(`${at}.move.${key} must map a part or group to [x, y, z]`);
  });
  const legend = Array.isArray(spec.legend) ? spec.legend : [];
  if (legend.length < 1 || legend.length > 4) errors.push('legend needs 1 to 4 keys');
  legend.forEach((k, i) => { if (!['lit', ...TONES].includes(k?.tone) || !text(k?.label)) errors.push(`legend[${i}] needs a tone (lit, ${TONES.join(', ')}) and a label`); });
  if (legend.length && !legend.some(k => k?.tone === 'lit')) errors.push('legend needs a lit key that says what the accent marks');
  if (spec.poster !== undefined && !stepIds.has(spec.poster)) errors.push('poster must name a step');
  return { errors, warnings };
}

/** The drawing as SVG markup. With step and colors it is one still in presentation attributes; without colors it is the
 * live drawing at step, whose classes read the page's CSS variables. */
export function figureSvg(spec, model, { step = 0, colors, id = spec.id } = {}) {
  const { cam, pose, viewBox: box } = model, P = cam.point;
  const base = spec.parts.filter(p => p.tone === 'base'), ground = hull((base.length ? base : spec.parts).flatMap(p => planOf(p).map(q => P([...q, 0]))));
  const halo = `${line(ground.map(([x, y]) => [x, y + 3]))}Z`, blur = `<filter id="${id}-halo" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="5"/></filter>`;
  const parts = model.steps[step].map(i => {
    const part = spec.parts[i], [dx, dy] = P(pose[step].offset[i]).map((v, k) => v - P([0, 0, 0])[k]), lit = pose[step].lit[i], hidden = pose[step].hidden[i];
    const move = `transform="translate(${fix(dx)} ${fix(dy)})"`;
    if (colors) return hidden ? '' : `<g ${move}>${draw(part, cam).map(s => `<path d="${s.d}" ${paintAttrs(s, colors[lit ? 'lit' : part.tone])}/>`).join('')}</g>`;
    return `<g id="${id}-${part.id}" class="bsf-p${lit ? ' is-lit' : ''}${hidden ? ' is-hidden' : ''}" data-tone="${part.tone}" ${move}>${draw(part, cam).map(s => `<path class="bsf-${s.paint === 'side' ? `s${s.level}` : s.paint}" d="${s.d}"/>`).join('')}</g>`;
  }).join('');
  const shade = colors ? `fill="${colors.halo.fill}" fill-opacity="${colors.halo.opacity}"` : 'class="bsf-halo"';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.map(fix).join(' ')}"${colors ? ` role="img" aria-label="${esc(spec.alt)}"` : ' aria-hidden="true"'}><defs>${blur}</defs><path d="${halo}" ${shade} filter="url(#${id}-halo)"/><g${colors ? '' : ' class="bsf-art"'}>${parts}</g></svg>`;
}

const kebab = v => v.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`);
function themeCss(tokens) {
  const c = palette(tokens), out = [];
  for (const key of ['surface', 'elevated', 'ink', 'muted', 'accent', 'onAccent', 'line']) out.push(`--bsf-${kebab(key)}:${tokens[key]}`);
  out.push(`--bsf-font:${tokens.font}`, `--bsf-radius:${tokens.radius}`, `--bsf-halo:${c.halo.fill}`, `--bsf-halo-opacity:${c.halo.opacity}`);
  for (const role of [...TONES, 'lit']) for (const [slot, value] of Object.entries(c[role])) out.push(`--bsf-${role}-${slot}:${value}`);
  return out.join(';');
}

const SLOTS = ['top', 'sa', 'sb', 'edge', 'crease', 'detail'];
const role = name => SLOTS.map(slot => `--${slot}:var(--bsf-${name}-${slot})`).join(';');
/** The figure's CSS: the brand's tokens for both themes, the card, the step list and the drawing's paint classes. */
export function figureCss(brand) {
  const sides = Array.from({ length: LEVELS + 1 }, (_, i) => `.bsf-s${i}{--c:color-mix(in srgb,var(--sb) ${fix(i / LEVELS * 100)}%,var(--sa))}`).join('');
  return `.bsf,.bsf-page{${themeCss(brand.tokens.light)};color-scheme:light}
.bsf[data-theme="dark"],.bsf-page[data-theme="dark"]{${themeCss(brand.tokens.dark)};color-scheme:dark}
@media (prefers-color-scheme:dark){.bsf:not([data-theme="light"]),.bsf-page:not([data-theme="light"]){${themeCss(brand.tokens.dark)};color-scheme:dark}}
.bsf-page{margin:0;padding:16px;background:var(--bsf-surface)}
.bsf{--bsf-mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;box-sizing:border-box;max-width:720px;margin:0 auto;font:15px/1.45 var(--bsf-font);color:var(--bsf-ink)}
.bsf *{box-sizing:border-box}
.bsf-card{background:var(--bsf-elevated);border:1px solid var(--bsf-line);border-radius:var(--bsf-radius);padding:15px}
.bsf-head{display:flex;justify-content:space-between;gap:12px;margin:0 0 4px;font:11px/1.3 var(--bsf-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--bsf-muted)}
.bsf-stage{touch-action:pan-y;cursor:grab;-webkit-user-select:none;user-select:none}
.bsf-stage:active{cursor:grabbing}
.bsf-stage svg{display:block;width:100%;height:auto;overflow:visible}
.bsf-play{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 12px 0 10px;margin:4px 0 -6px -10px;border-radius:calc(var(--bsf-radius)*.66);font:11px/1 var(--bsf-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--bsf-muted);cursor:pointer;-webkit-tap-highlight-color:transparent}
.bsf-play[hidden]{display:none}
.bsf-play:hover{color:var(--bsf-ink)}
.bsf-play:focus-visible{outline:2px solid var(--bsf-ink);outline-offset:-2px}
.bsf-play svg{width:12px;height:12px;fill:currentColor}
.bsf-play path:last-child,.bsf-play.is-on path:first-child{display:none}
.bsf-play.is-on path:last-child{display:inline}
.bsf-steps{display:grid;gap:2px;margin:10px 0 0}
.bsf-steps button{all:unset;box-sizing:border-box;display:grid;grid-template-columns:22px 1fr;gap:1px 10px;align-items:center;width:100%;min-height:44px;padding:7px 10px;border-radius:calc(var(--bsf-radius)*.66);color:var(--bsf-muted);cursor:pointer;-webkit-tap-highlight-color:transparent}
.bsf-steps button:focus-visible{outline:2px solid var(--bsf-ink);outline-offset:2px}
.bsf-steps b{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;border:1px solid var(--bsf-line);font:500 11px/1 var(--bsf-mono)}
.bsf-steps span{font-weight:500;overflow-wrap:anywhere}
.bsf-steps small{grid-column:2;font:12px/1.35 var(--bsf-mono);overflow-wrap:anywhere}
.bsf-steps [aria-selected="true"]{color:var(--bsf-ink);background:var(--bsf-elevated);box-shadow:inset 0 0 0 1px var(--bsf-line)}
.bsf-steps [aria-selected="true"] b{background:var(--bsf-accent);border-color:var(--bsf-accent);color:var(--bsf-on-accent)}
.bsf-steps [aria-selected="true"] small{color:var(--bsf-muted)}
.bsf-legend{display:flex;flex-wrap:wrap;gap:6px 18px;margin:12px 0 0;padding:0 10px;list-style:none;font-size:13px;color:var(--bsf-muted)}
.bsf-legend i{display:inline-block;width:16px;height:10px;margin-right:7px;border-radius:3px;border:1px solid var(--edge);background:var(--top)}
.bsf figcaption{margin:8px 0 0;padding:0 10px;font-size:13px;color:var(--bsf-muted)}
.bsf{${role('base')}}
.bsf [data-tone="structure"]{${role('structure')}}
.bsf [data-tone="subject"]{${role('subject')}}
.bsf .bsf-p.is-lit,.bsf [data-tone="lit"]{${role('lit')}}
.bsf-p{transition:opacity .3s}
.bsf-p.is-hidden{opacity:0}
.bsf-p path{vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round;transition:fill .3s,stroke .3s}
${sides}
.bsf-p path[class^="bsf-s"]{fill:var(--c);stroke:var(--c);stroke-width:.5px}
.bsf-top{fill:var(--top)}
.bsf-dot{fill:var(--detail)}
.bsf-edge,.bsf-crease,.bsf-detail,.bsf-rule{fill:none;stroke-width:${STROKES.crease}px}
.bsf-edge{stroke:var(--edge);stroke-width:${STROKES.edge}px}
.bsf-crease{stroke:var(--crease)}
.bsf-detail,.bsf-rule{stroke:var(--detail)}
.bsf-halo{fill:var(--bsf-halo);fill-opacity:var(--bsf-halo-opacity)}
@media (prefers-reduced-motion:reduce){.bsf-p,.bsf-p path{transition:none}}`;
}

/** What the page script needs: screen offsets, lit and hidden parts per step, and the paint order of every audited pose. */
function pageData(spec, model) {
  const { cam, pose } = model, zero = cam.point([0, 0, 0]), table = [], find = order => { const key = order.join(); let i = table.findIndex(o => o.join() === key); if (i < 0) i = table.push(order) - 1; return i; };
  const picked = flags => flags.flatMap((on, i) => on ? [i] : []);
  return {
    parts: spec.parts.map(p => p.id), samples: SAMPLES,
    steps: pose.map(s => ({ at: s.offset.map(o => cam.point(o).map((v, k) => Number(fix(v - zero[k])))), lit: picked(s.lit), hide: picked(s.hidden) })),
    between: model.between.map(seg => seg.map(find)), orders: table,
  };
}

// The step list is a tablist: arrow keys, Home and End move between steps. The drawing follows the selected step on a
// critically damped spring, so a jump over several steps plays each one in between and never cuts through a part.
// A sideways drag on the drawing scrubs between steps and settles on the nearest. Play walks to the last step and stops.
// A host page can scrub it too: dispatch a figure:seek event on the <figure> with detail 0 to steps - 1.
function live(id, data) {
  const fig = document.getElementById(id), art = fig.querySelector('.bsf-art'), stage = fig.querySelector('.bsf-stage'), play = fig.querySelector('.bsf-play');
  const tabs = [...fig.querySelectorAll('[role=tab]')], parts = data.parts.map(p => document.getElementById(id + '-' + p));
  const still = matchMedia('(prefers-reduced-motion: reduce)'), last = data.steps.length - 1, clamp = v => Math.max(0, Math.min(last, v));
  let pos = 0, speed = 0, target = 0, frame = 0, then = 0, drawn = -1, tour = 0, grip = null;
  const paint = () => {
    const a = Math.min(Math.floor(pos), last - 1), t = pos - a, from = data.steps[a].at, to = data.steps[a + 1].at, near = data.steps[Math.round(pos)];
    parts.forEach((el, i) => {
      el.setAttribute('transform', 'translate(' + (from[i][0] * (1 - t) + to[i][0] * t) + ' ' + (from[i][1] * (1 - t) + to[i][1] * t) + ')');
      el.classList.toggle('is-lit', near.lit.includes(i));
      el.classList.toggle('is-hidden', near.hide.includes(i));
    });
    const order = data.between[a][Math.round(t * data.samples)];
    if (order !== drawn) { for (const i of data.orders[order]) art.appendChild(parts[i]); drawn = order; }
  };
  const tick = now => {
    const dt = then ? Math.min((now - then) / 1000, 1 / 30) : 0;
    then = now;
    speed += (-81 * (pos - target) - 18 * speed) * dt;
    pos = clamp(pos + speed * dt);
    if (Math.abs(target - pos) < 0.002 && Math.abs(speed) < 0.02) { pos = target; speed = 0; frame = 0; then = 0; paint(); return; }
    paint();
    frame = requestAnimationFrame(tick);
  };
  const hold = () => { cancelAnimationFrame(frame); frame = 0; then = 0; speed = 0; };
  const mark = step => {
    target = clamp(step);
    tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === target)); tab.tabIndex = i === target ? 0 : -1; });
  };
  const select = (step, focus) => {
    mark(step);
    if (focus) tabs[target].focus();
    if (still.matches) { hold(); pos = target; paint(); } else if (!frame) frame = requestAnimationFrame(tick);
  };
  const stop = () => { clearInterval(tour); tour = 0; play.classList.remove('is-on'); play.lastChild.textContent = 'Play'; };
  play.hidden = false;
  play.addEventListener('click', () => {
    if (tour) return stop();
    select(target === last ? 0 : target + 1);
    if (target === last) return;
    play.classList.add('is-on');
    play.lastChild.textContent = 'Pause';
    tour = setInterval(() => { select(target + 1); if (target === last) stop(); }, 2400);
  });
  tabs.forEach((tab, i) => tab.addEventListener('click', () => { stop(); select(i); }));
  fig.querySelector('[role=tablist]').addEventListener('keydown', event => {
    const to = { ArrowRight: target + 1, ArrowDown: target + 1, ArrowLeft: target - 1, ArrowUp: target - 1, Home: 0, End: last }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    stop();
    select(to, true);
  });
  stage.addEventListener('pointerdown', event => { if (!event.button) grip = { id: event.pointerId, x: event.clientX, pos, moved: false }; });
  stage.addEventListener('pointermove', event => {
    if (!grip || event.pointerId !== grip.id) return;
    const dx = event.clientX - grip.x;
    if (!grip.moved && Math.abs(dx) < 8) return;
    if (!grip.moved) { grip.moved = true; stop(); stage.setPointerCapture(grip.id); }
    if (still.matches) return;
    hold();
    pos = clamp(grip.pos - dx / (stage.clientWidth * 0.45));
    if (Math.round(pos) !== target) mark(Math.round(pos));
    paint();
  });
  stage.addEventListener('pointerup', event => {
    if (!grip || event.pointerId !== grip.id) return;
    const dx = event.clientX - grip.x, moved = grip.moved;
    grip = null;
    // A short flick is enough: a quarter of the way to the next step carries it over.
    if (moved) select(still.matches ? target - (Math.abs(dx) < 40 ? 0 : Math.sign(dx)) : Math.round(pos - Math.sign(dx) * 0.25));
  });
  stage.addEventListener('pointercancel', () => { if (grip && grip.moved) select(target); grip = null; });
  fig.addEventListener('figure:seek', event => { stop(); hold(); pos = clamp(Number(event.detail) || 0); mark(Math.round(pos)); paint(); });
}

/** The figure as an HTML fragment: card, step list, legend, caption, styles and script. */
export function figureHtml(spec, brand, model) {
  const id = `bsf-${spec.id}`, panel = `${id}-stage`;
  const steps = spec.steps.map((s, i) => `<button type="button" role="tab" id="${id}-tab-${s.id}" aria-controls="${panel}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''}><b>${i + 1}</b><span>${esc(s.label)}</span><small>${esc(s.readout)}</small></button>`).join('');
  const legend = spec.legend.map(k => `<li><i data-tone="${k.tone}"></i>${esc(k.label)}</li>`).join('');
  const data = JSON.stringify(pageData(spec, model)).replace(/</g, '\\u003c');
  return `<style>${figureCss(brand)}</style>
<figure class="bsf" id="${id}">
<div class="bsf-card"><p class="bsf-head"><span>${esc(spec.fig)}</span><span>${esc(spec.title)}</span></p><div class="bsf-stage" id="${panel}" role="tabpanel" aria-label="${esc(spec.alt)}">${figureSvg(spec, model, { id })}</div><button type="button" class="bsf-play" hidden><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5v9l7.5-4.5z"/><path d="M2.5 1.5H5v9H2.5zM7 1.5h2.5v9H7z"/></svg><span>Play</span></button></div>
<div class="bsf-steps" role="tablist" aria-label="${esc(spec.title)}: steps" aria-orientation="vertical">${steps}</div>
<ul class="bsf-legend">${legend}</ul>
<figcaption>${esc(spec.caption)}</figcaption>
</figure>
<script>(${live})(${JSON.stringify(id)},${data})</script>`;
}

const pageHtml = (spec, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(spec.title)}</title></head><body class="bsf-page">\n${body}\n</body></html>\n`;

/** Every step as a still, in light then dark, for review at a glance. */
function sheetHtml(spec, brand, model) {
  const row = mode => { const t = brand.tokens[mode], colors = palette(t); return `<section style="background:${t.surface};color:${t.muted}">${spec.steps.map((s, i) => `<figure><div style="background:${t.elevated};border:1px solid ${t.line};border-radius:${t.radius}">${figureSvg(spec, model, { step: i, colors, id: `${mode}-${i}` })}</div><figcaption>${i + 1} ${esc(s.label)} (${mode})</figcaption></figure>`).join('')}</section>`; };
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;font:13px ui-monospace,monospace}section{display:grid;grid-template-columns:repeat(${Math.min(spec.steps.length, 3)},1fr);gap:24px;padding:32px}figure{margin:0}svg{display:block;width:100%;height:auto}figcaption{margin-top:8px}</style></head><body>${row('light')}${row('dark')}</body></html>`;
}

/** Load the page at a viewport and report layout problems, then select each step and compare the drawing with the audit. */
async function review(browser, file, spec, model, { width, height, scheme, shot, scale = 1 }) {
  const context = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, reducedMotion: 'reduce', deviceScaleFactor: scale });
  const page = await context.newPage(), problems = [], at = `${width} px ${scheme}`;
  page.on('pageerror', e => problems.push(`${at}: script error: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') problems.push(`${at}: console error: ${m.text()}`); });
  await page.goto(pathToFileURL(file).href);
  if (shot) await page.locator('.bsf').screenshot({ path: shot });
  const layout = await page.evaluate(() => ({
    wide: document.documentElement.scrollWidth - innerWidth,
    small: [...document.querySelectorAll('.bsf [role=tab], .bsf-play')].filter(b => b.getBoundingClientRect().height < 44 || b.getBoundingClientRect().width < 44).length,
    clipped: [...document.querySelectorAll('.bsf-head span, .bsf-steps span, .bsf-steps small, .bsf-legend li, .bsf figcaption')].filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent.slice(0, 30)),
  }));
  if (layout.wide > 0) problems.push(`${at}: the page scrolls sideways by ${layout.wide} px`);
  if (layout.small) problems.push(`${at}: ${layout.small} buttons are under 44 px`);
  for (const t of layout.clipped) problems.push(`${at}: text is clipped: ${t}`);
  const data = pageData(spec, model);
  for (const [s, step] of spec.steps.entries()) {
    await page.locator(`#bsf-${spec.id}-tab-${step.id}`).click();
    const seen = await page.evaluate(() => [...document.querySelectorAll('.bsf-art > g')].map(g => ({ id: g.id, move: g.getAttribute('transform'), lit: g.classList.contains('is-lit') })));
    const want = model.steps[s].map(i => ({ id: `bsf-${spec.id}-${spec.parts[i].id}`, move: `translate(${data.steps[s].at[i][0]} ${data.steps[s].at[i][1]})`, lit: model.pose[s].lit[i] }));
    if (JSON.stringify(seen) !== JSON.stringify(want)) problems.push(`${at}: step ${step.id} is drawn differently from the audit`);
  }
  await context.close();
  return problems;
}

/** Use the page as a person would, with motion on: a swipe settles on the next step, Play moves on and a seek lands on its pose. */
async function drive(browser, file, spec, model) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }), problems = [], data = pageData(spec, model), last = spec.steps.length - 1, id = `bsf-${spec.id}`;
  await page.goto(pathToFileURL(file).href);
  const settled = step => page.waitForFunction(([id, parts, want, step]) => document.querySelectorAll(`#${id} [role=tab]`)[step].getAttribute('aria-selected') === 'true' && parts.every((p, i) => document.getElementById(`${id}-${p}`).getAttribute('transform') === want[i]),
    [id, data.parts, data.steps[step].at.map(([x, y]) => `translate(${x} ${y})`), step], { timeout: 4000 }).then(() => true, () => false);
  const box = await page.locator('.bsf-stage').boundingBox(), y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.8, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.3, y, { steps: 8 });
  await page.mouse.up();
  if (!await settled(1)) problems.push('a swipe to the left does not settle on step 2');
  const next = last === 1 ? 0 : 2;
  await page.locator('.bsf-play').click();
  if (!await settled(next)) problems.push(`Play does not move on to step ${next + 1}`);
  await page.evaluate(id => document.getElementById(id).dispatchEvent(new CustomEvent('figure:seek', { detail: 0 })), id);
  if (!await settled(0)) problems.push('a figure:seek event to 0 does not draw step 1');
  await page.close();
  return problems;
}

/** Seconds the film of the tour runs: every step holds, then eases to the next. */
export const tourSeconds = steps => steps * HOLD + (steps - 1) * MOVE;
/** Where the tour is at t seconds, from 0 on the first step to steps - 1 on the last. */
export function tourAt(t, steps) {
  const i = Math.max(0, Math.min(Math.floor(t / (HOLD + MOVE)), steps - 1)), u = Math.max(0, Math.min(1, (t - i * (HOLD + MOVE) - HOLD) / MOVE));
  return i === steps - 1 ? i : i + (u < 0.5 ? 4 * u ** 3 : 1 - (2 - 2 * u) ** 3 / 2);
}

/** Film the tour: seek the page frame by frame and pipe the screenshots to ffmpeg. */
async function film(browser, file, spec, target) {
  const page = await browser.newPage({ viewport: { width: 540, height: 800 }, deviceScaleFactor: 2, colorScheme: 'light' });
  await page.goto(pathToFileURL(file).href);
  await page.addStyleTag({ content: '.bsf-play{display:none!important}.bsf-p,.bsf-p path{transition:none!important}' });
  await page.setViewportSize({ width: 540, height: await page.evaluate(() => Math.ceil(document.body.getBoundingClientRect().height)) });
  const ffmpeg = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', target], { stdio: ['pipe', 'ignore', 'inherit'] });
  const done = new Promise((resolve, reject) => ffmpeg.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`))));
  for (let n = 0; n <= Math.round(tourSeconds(spec.steps.length) * FPS); n++) {
    await page.evaluate(([id, at]) => document.getElementById(id).dispatchEvent(new CustomEvent('figure:seek', { detail: at })), [`bsf-${spec.id}`, tourAt(n / FPS, spec.steps.length)]);
    if (!ffmpeg.stdin.write(await page.screenshot({ type: 'jpeg', quality: 95 }))) await new Promise(resolve => ffmpeg.stdin.once('drain', resolve));
  }
  ffmpeg.stdin.end();
  await done;
  await page.close();
}

async function main() {
  const argv = process.argv.slice(2), input = argv[0];
  if (!input || input.startsWith('--')) throw new Error('Usage: node figure.mjs <dir>/figure.json [--out DIR] [--video]');
  const video = argv.includes('--video');
  if (video && spawnSync('ffmpeg', ['-version']).status !== 0) throw new Error('ffmpeg is not on the PATH. Install it (brew install ffmpeg) and run again, or leave out --video.');
  const dir = path.dirname(path.resolve(input)), spec = JSON.parse(readFileSync(input, 'utf8'));
  const { errors, warnings } = validateFigure(spec, { root: dir });
  if (errors.length) throw new Error(errors.join('\n'));
  const brand = JSON.parse(readFileSync(path.resolve(dir, spec.brand), 'utf8')), model = audit(spec);
  const at = argv.indexOf('--out'), out = path.resolve(at > 0 ? argv[at + 1] : path.join(dir, 'out'));
  mkdirSync(out, { recursive: true });
  const poster = Math.max(0, spec.steps.findIndex(s => s.id === (spec.poster ?? spec.steps.at(-1).id)));
  const still = figureSvg(spec, model, { step: poster, colors: palette(brand.tokens.light) }), file = path.join(out, 'figure.html');
  writeFileSync(file, pageHtml(spec, figureHtml(spec, brand, model)));
  writeFileSync(path.join(out, 'figure.svg'), `${still}\n`);
  const problems = [...model.problems, ...unsafe(still).map(e => `figure.svg: ${e}`)];
  const browser = await launch();
  try {
    problems.push(...await review(browser, file, spec, model, { width: 390, height: 844, scheme: 'light', shot: path.join(out, 'phone.png'), scale: 2 }));
    problems.push(...await review(browser, file, spec, model, { width: 390, height: 844, scheme: 'dark' }));
    problems.push(...await review(browser, file, spec, model, { width: 1280, height: 900, scheme: 'light' }));
    problems.push(...await drive(browser, file, spec, model));
    if (video) await film(browser, file, spec, path.join(out, 'figure.mp4'));
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await page.setContent(`<!doctype html><style>body{margin:0}div{box-sizing:border-box;width:1200px;padding:32px;background:${brand.tokens.light.elevated}}svg{display:block;width:100%;height:auto}</style><div>${still}</div>`);
    await page.locator('div').screenshot({ path: path.join(out, 'poster.png') });
    await page.setContent(sheetHtml(spec, brand, model));
    await page.locator('body').screenshot({ path: path.join(out, 'sheet.png') });
  } finally { await browser.close(); }
  for (const w of [...warnings, ...model.warnings]) console.warn(`warning: ${w}`);
  if (problems.length) throw new Error(problems.join('\n'));
  console.log(`Figure exported to ${path.relative(process.cwd(), out) || '.'}: ${spec.parts.length} parts, ${spec.steps.length} steps, audited at ${SAMPLES - 1} poses between each pair. Read sheet.png and phone.png before you ship it.`);
}

// realpath: Node resolves a symlinked script to its target, so compare against the resolved path.
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
