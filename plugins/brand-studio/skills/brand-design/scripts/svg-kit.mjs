// Shared helpers for mascot.mjs and icons.mjs: read SVG tags, flag unsafe content, measure masks, encode PNGs and render
// SVG in Chromium. The tag reader handles the hand-written and exported SVG these scripts check, not every XML feature.
import { createRequire } from 'node:module';
import path from 'node:path';
import { crc32, deflateSync } from 'node:zlib';

const TAG = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<![A-Za-z][^>]*>|<(\/?)([A-Za-z][\w:.-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
const ATTR = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const BANNED = new Set(['script', 'foreignObject', 'image', 'style', 'text', 'iframe']);
const DRAWN = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon']);
const INHERITED = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'fill-rule'];
const PRESENTATION = [...INHERITED, 'fill-opacity', 'stroke-opacity', 'stroke-miterlimit', 'stroke-dasharray', 'stroke-dashoffset', 'opacity', 'color', 'clip-rule', 'paint-order', 'shape-rendering', 'visibility'];

export const text = v => typeof v === 'string' && v.trim().length > 0;
export const texts = v => Array.isArray(v) && v.length > 0 && v.every(text);
export const slug = v => /^[a-z][a-z0-9-]*$/.test(v ?? '');
export const hex6 = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
export const inside = (dir, file) => { const rel = path.relative(dir, path.resolve(dir, file)); return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel); };

/** Tags in document order as { name, attrs, close, self }. Comments, prolog, doctype and CDATA are skipped. */
export function readTags(svg) {
  const tags = [];
  for (const m of String(svg).matchAll(TAG)) {
    if (!m[2]) continue;
    const attrs = {};
    for (const a of (m[3] ?? '').matchAll(ATTR)) attrs[a[1]] = a[2] ?? a[3];
    tags.push({ name: m[2], attrs, close: m[1] === '/', self: m[4] === '/' });
  }
  return tags;
}

/** The root <svg> element's attributes, or null when the first element is not <svg>. */
export function root(svg) { const first = readTags(svg).find(t => !t.close); return first?.name === 'svg' ? first.attrs : null; }

/** Markup between the root <svg> tags. */
export function inner(svg) {
  const s = String(svg), open = s.search(/<svg[\s>]/), start = s.indexOf('>', open) + 1, end = s.lastIndexOf('</svg>');
  return open < 0 || end < start ? '' : s.slice(start, end).trim();
}

/** The root's presentation attributes, except skip, as an attribute string for a wrapper <g>. inner() drops the root, so
 * callers that reuse a file's markup carry these across. */
export function rootStyle(svg, skip = []) {
  const attrs = root(svg) ?? {};
  return PRESENTATION.filter(k => k in attrs && !skip.includes(k)).map(k => ` ${k}="${attrs[k].replace(/"/g, '&quot;')}"`).join('');
}

/** Drawn shapes with the presentation attributes they set or inherit from ancestors. */
export function shapes(svg) {
  const stack = [{}], out = [];
  for (const t of readTags(svg)) {
    if (t.close) { stack.pop(); continue; }
    const merged = { ...stack.at(-1), ...Object.fromEntries(INHERITED.filter(k => k in t.attrs).map(k => [k, t.attrs[k].trim()])) };
    if (DRAWN.has(t.name)) out.push({ tag: t.name, attrs: merged });
    if (!t.self) stack.push(merged);
  }
  return out;
}

/** Problems that make an SVG unsafe or non-portable: scripts, embedded media, live text, CSS, handlers and external links. */
export function unsafe(svg) {
  const problems = new Set();
  for (const { name, attrs, close } of readTags(svg)) {
    if (close) continue;
    if (BANNED.has(name)) problems.add(`<${name}> is not allowed`);
    if (name.includes(':')) problems.add(`<${name}> is not allowed; export plain SVG`);
    for (const [key, value] of Object.entries(attrs)) {
      if (/^on/i.test(key)) problems.add(`event attribute ${key} is not allowed`);
      if (key.includes(':') && !/^xml(ns)?:/.test(key)) problems.add(`namespaced attribute ${key} is not allowed; export plain SVG`);
      if ((key === 'href' || key === 'xlink:href') && !value.startsWith('#')) problems.add(`external ${key} is not allowed`);
      if (key === 'style' || key === 'class') problems.add(`${key} attribute is not allowed; use presentation attributes`);
    }
  }
  return [...problems];
}

/** The SVG with xmlns and its root width and height set to size, so Chromium rasterizes it at that size. */
export function withSize(svg, size) {
  return String(svg).replace(/<svg\b([^>]*)>/, (_, attrs) => {
    const kept = attrs.replace(/\s(width|height)\s*=\s*("[^"]*"|'[^']*')/g, '');
    return `<svg${kept}${/\sxmlns=/.test(kept) ? '' : ' xmlns="http://www.w3.org/2000/svg"'} width="${size}" height="${size}">`;
  });
}

/** Intersection over union of two equal-length masks (truthy = covered); 1 when both are empty. */
export function iou(a, b) {
  let both = 0, either = 0;
  for (let i = 0; i < a.length; i++) { if (a[i] && b[i]) both++; if (a[i] || b[i]) either++; }
  return either ? both / either : 1;
}

const luminance = (px, i) => [0, 1, 2].reduce((sum, c) => {
  const v = px[i + c] / 255;
  return sum + [0.2126, 0.7152, 0.0722][c] * (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
}, 0);

/** Share of a layer's covered pixels that reach 3:1 against the backdrop pixels behind them, the WCAG minimum for graphics.
 * Both are RGBA at the same size; 1 when the layer covers nothing. */
export function visibleShare(layer, backdrop) {
  let covered = 0, seen = 0;
  for (let i = 0; i < layer.length; i += 4) {
    if (layer[i + 3] < 128) continue;
    covered++;
    const [hi, lo] = [luminance(layer, i), luminance(backdrop, i)].sort((a, b) => b - a);
    if ((hi + 0.05) / (lo + 0.05) >= 3) seen++;
  }
  return covered ? seen / covered : 1;
}

/** Covered pixels of a size × size mask whose centres fall outside a centred circle of radius share × size. */
export function outsideCircle(mask, size, share) {
  const r = share * size, c = size / 2;
  let n = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (mask[y * size + x] && Math.hypot(x + 0.5 - c, y + 0.5 - c) > r) n++;
  return n;
}

/** Encode RGBA pixels as a PNG. alpha false writes RGB with no alpha channel, which the app stores require. */
export function encodePng(width, height, rgba, { alpha = true } = {}) {
  const channels = alpha ? 4 : 3, row = width * channels + 1, raw = Buffer.alloc(row * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) for (let c = 0; c < channels; c++) raw[y * row + 1 + x * channels + c] = rgba[(y * width + x) * 4 + c];
  const chunk = (type, data) => {
    const length = Buffer.alloc(4), body = Buffer.concat([Buffer.from(type, 'ascii'), data]), crc = Buffer.alloc(4);
    length.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = alpha ? 6 : 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

/** Chromium flags for WebGL, as shoot.mjs and film-render.mjs use. */
export const GPU = ['--enable-gpu', '--ignore-gpu-blocklist', ...(process.platform === 'darwin' ? ['--use-angle=metal'] : [])];

/** Load a package from the project in the working directory; an installed plugin has no node_modules of its own. */
export const fromProject = id => createRequire(path.join(process.cwd(), 'package.json'))(id);

/** Launch Chromium through the project's playwright-core, with an install hint when it is missing. */
export async function launch(args = []) {
  let chromium;
  try { ({ chromium } = fromProject('playwright-core')); } catch { throw new Error('playwright-core is not installed here. Run: npm install --no-save playwright-core && npx playwright-core install chromium'); }
  return chromium.launch({ args });
}

/** Draw an SVG on a size × size canvas, over background when given, and return its RGBA pixels. */
export async function pixels(page, svg, size, background) {
  const data = await page.evaluate(async ({ svg, size, background }) => {
    const img = new Image();
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
    await img.decode();
    const canvas = Object.assign(document.createElement('canvas'), { width: size, height: size });
    const ctx = canvas.getContext('2d');
    if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, size, size); }
    ctx.drawImage(img, 0, 0, size, size);
    const bytes = ctx.getImageData(0, 0, size, size).data;
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }, { svg: withSize(svg, size), size, background });
  return Buffer.from(data, 'base64');
}

/** Alpha mask of an SVG at size px: 1 where a pixel is at least half opaque. */
export async function mask(page, svg, size) {
  const px = await pixels(page, svg, size), m = new Uint8Array(size * size);
  for (let i = 0; i < m.length; i++) m[i] = px[i * 4 + 3] >= 128 ? 1 : 0;
  return m;
}
