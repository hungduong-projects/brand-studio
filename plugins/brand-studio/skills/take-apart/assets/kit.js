/* Drawing kit for take-apart models. Load it before a model file: it defines the drawing helpers below as globals, and
   model() records the model. It touches no DOM, so take-apart.mjs can run it in Node to check a model before any browser opens.

   Axes: x runs right and down the screen, y runs left and down, z runs up. One unit is one screen unit. */
const C = Math.cos(Math.PI / 6), S = 0.5, K = Math.SQRT1_2;
/** The screen point of a point in space. */
const P = (x, y, z) => [(x - y) * C, (x + y) * S - z];
const f = n => +n.toFixed(2);
/** Draws flat things on the floor plane at height z. */
const plane = z => `matrix(${f(C)} ${S} ${f(-C)} ${S} 0 ${f(-z)})`;
/** Draws on the x = w side: u runs along y, v is height. */
const faceX = w => `matrix(${f(-C)} ${S} 0 -1 ${f(w * C)} ${f(w * S)})`;
/** Draws on the y = d side: u runs along x, v is height. */
const faceY = d => `matrix(${f(C)} ${S} 0 -1 ${f(-d * C)} ${f(d * S)})`;
/** A rounded rectangle's path. */
const rr = (x, y, w, h, r) => `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
/** A circle's path. */
const circ = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
/** The two points where a rounded rectangle's or a circle's silhouette edges stand. */
const rrTan = (x, y, w, h, r) => [[x + r - r * K, y + h - r + r * K], [x + w - r + r * K, y + r - r * K]];
const cTan = (cx, cy, r) => [[cx - r * K, cy + r * K], [cx + r * K, cy - r * K]];
/** The near half of a circle's rim, for rings drawn round a cylinder. */
const frontArc = (cx, cy, r) => `M${f(cx - r * K)} ${f(cy + r * K)}A${r} ${r} 0 0 0 ${f(cx + r * K)} ${f(cy - r * K)}`;
/** Sorts [x, y] points far to near, so near things paint over far ones. */
const byDepth = list => list.sort((a, b) => a[0] + a[1] - b[0] - b[1]);
/** An n by n grid of [x, y] points, far to near. */
const grid = (n, from, step) => byDepth(Array.from({ length: n * n }, (_, k) => [from + (k % n) * step, from + Math.floor(k / n) * step]));

/* While a layer draws, `ink` collects the paths it reuses and the bounds of what it drew. */
let ink = null, uid = 0;
function grow(x0, y0, x1, y1, z0, z1) {
  for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) {
    const [a, b] = P(x, y, z);
    ink.minX = Math.min(ink.minX, a); ink.maxX = Math.max(ink.maxX, a); ink.minY = Math.min(ink.minY, b); ink.maxY = Math.max(ink.maxY, b);
    if (z === z1 && (a > ink.ax + .01 || (Math.abs(a - ink.ax) <= .01 && b < ink.ay))) { ink.ax = a; ink.ay = b; } // the label points at the right-most top corner
  }
}
/** A solid: its footprint path stacked in half-unit slices, the two silhouette edges, then its top face. */
function solid({ d, bounds, tan, z0 = 0, h, top = '', side = '', evenodd = false }) {
  const id = `s${uid++}`;
  ink.defs += `<path id="${id}" d="${d}"${evenodd ? ' fill-rule="evenodd"' : ''}/>`;
  grow(...bounds, z0, z0 + h);
  let out = '';
  for (let z = z0, first = true; z < z0 + h - 1e-6; z += 0.5, first = false)
    out += `<use href="#${id}" transform="${plane(z)}" class="side ${side}${first ? ' base' : ''}"/>`;
  for (const [x, y] of tan) { const [a, b] = P(x, y, z0), [, c] = P(x, y, z0 + h); out += `<line class="tan" x1="${f(a)}" y1="${f(b)}" x2="${f(a)}" y2="${f(c)}"/>`; }
  return out + `<use href="#${id}" transform="${plane(z0 + h)}" class="top ${top || 'plain'}"/>`;
}
/** A box with rounded corners in plan: low corner x, y; size w by h; corner radius r; from height z0, `height` tall. */
const slab = (x, y, w, h, r, z0, height, o = {}) => solid({ d: rr(x, y, w, h, r), bounds: [x, y, x + w, y + h], tan: rrTan(x, y, w, h, r), z0, h: height, ...o });
/** A cylinder standing on its base. */
const cyl = (cx, cy, r, z0, height, o = {}) => solid({ d: circ(cx, cy, r), bounds: [cx - r, cy - r, cx + r, cy + r], tan: cTan(cx, cy, r), z0, h: height, ...o });
/** A rounded plate with holes cut out, such as a frame: `holes` is more path data, drawn even-odd. */
const ringed = ([x, y, w, h, r], holes, height, o = {}) => solid({ d: rr(x, y, w, h, r) + holes, evenodd: true, bounds: [x, y, x + w, y + h], tan: rrTan(x, y, w, h, r), h: height, ...o });
/** Marks drawn flat at height z. The class `det` strokes them as fine detail; pass '' for none. */
const flat = (z, inner, cls = 'det') => `<g transform="${plane(z)}"${cls ? ` class="${cls}"` : ''}>${inner}</g>`;
/** Marks on a side face, from faceX or faceY. */
const face = (transform, inner) => `<g transform="${transform}" class="det">${inner}</g>`;
/** A dashed footprint, for a layer of loose parts. */
const outline = (x, y, w, h, r) => { grow(x, y, x + w, y + h, 0, 0); return flat(0, `<path class="dash" d="${rr(x, y, w, h, r)}"/>`, ''); };
const holes = list => list.map(([x, y, r]) => `<circle class="hole" cx="${x}" cy="${y}" r="${r}"/>`).join('');
const rings = (cx, cy, list) => list.map(r => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`).join('');
/** A part that has its own figure: a click zooms into figure `open`. `id` matches the part's id; `spot` is the patch the zoom
    grows out of, when not the whole part. */
const hit = (open, id, name, inner, spot = '') => `<g class="hit" data-open="${open}" data-part="${id}"><title>Zoom into ${name}</title>${inner}${spot}</g>`;
/** A square patch for hit(), at height z. */
const spot = (x, y, size, z) => flat(z, `<rect class="hitarea spot" x="${x}" y="${y}" width="${size}" height="${size}"/>`, '');
/** A numbered pin over a part. The viewer adds one for each part that has `at`. */
const pin = (n, [x, y, z], part) => {
  const [a, b] = P(x, y, z).map(f), open = part.open ? ` data-open="${part.open}" data-part="${part.id}"` : '';
  return `<g class="pin${part.open ? ' open' : ''}"${open}>` + (part.open ? `<circle class="halo" cx="${a}" cy="${b - 25}" r="12.5"/>` : '')
    + `<circle class="dot" cx="${a}" cy="${b}" r="2"/><line x1="${a}" y1="${b}" x2="${a}" y2="${b - 16.5}"/>`
    + `<circle class="bub" cx="${a}" cy="${b - 25}" r="8.5"/><text x="${a}" y="${b - 21.5}">${n}</text></g>`;
};

/** Shared fills, used as fill="url(#name)". Each is a tile in drawing units. */
const PATTERNS = [
  ['pores', 6, 6, '<circle cx="3" cy="3" r=".8" class="pat-dot"/>'],
  ['tft', 10, 10, '<path d="M0 .5H10M.5 0V10" class="pat-line"/><rect x="3" y="3" width="3.4" height="3.4" class="pat-dot"/>'],
  ['rgb', 12, 10, '<rect x="1" y="1.5" width="2.6" height="7" rx=".6" fill="#e0645a"/><rect x="4.7" y="1.5" width="2.6" height="7" rx=".6" fill="#4fb07a"/><rect x="8.4" y="1.5" width="2.6" height="7" rx=".6" fill="#5a84e0"/>'],
  ['mesh', 12, 12, '<path d="M6 0L12 6L6 12L0 6Z" class="pat-line"/>'],
  ['hatch', 5, 5, '<path d="M-1 6L6 -1" class="pat-line"/>'],
  ['sensor', 5, 5, '<path d="M0 .5H5M.5 0V5" class="pat-light"/>'],
  ['pads', 6.5, 6.5, '<circle cx="3.25" cy="3.25" r="1.2" class="pat-pad"/>'],
  ['fins', 8, 8, '<path d="M0 2H8M0 6H8" class="pat-light"/><path d="M4 0V8" class="pat-gate"/>'],
  ['wires', 5, 5, '<path d="M0 2.5H5" class="pat-wire"/>'],
  ['bus', 17, 17, '<path d="M8.5 0V17" class="pat-bus"/><circle cx="8.5" cy="8.5" r="2" class="pat-via"/>'],
].map(([id, w, h, inner]) => `<pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse">${inner}</pattern>`).join('');

let MODEL = null;
/** Records the model. Call it once, at the end of the model file. */
function model(m) { MODEL = m; }
/** Draws one layer and its pins. Returns the SVG, the definitions it needs and its bounds on screen. */
function drawLayer(layer) {
  ink = { defs: '', minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, ax: -Infinity, ay: Infinity };
  let body = layer.draw();
  (layer.parts || []).forEach((p, k) => { if (p.at) body += pin(k + 1, p.at, p); });
  const { defs, ...box } = ink;
  ink = null;
  return { body, defs, box };
}
