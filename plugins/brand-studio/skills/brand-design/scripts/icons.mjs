#!/usr/bin/env node
// Check and export a brand icon set: UI glyphs that sit beside the product's existing set, and a layered app icon.
//
//   node icons.mjs <dir>/icons.json [--out DIR]
//
// Glyphs take the spec's style: outline follows the Lucide specification (24 px canvas, strokes 1 px from the edge, round
// caps and joins) at the spec's stroke width; solid fills in the text colour; duotone lays outline strokes over a tone fill.
// Writes glyphs/, sprite.svg and glyph-sheet.png; with an app block, app/ exports for iOS Icon Composer,
// Android, Google Play, PWA and web (favicon.ico and an SVG favicon with an optional dark drawing) plus app-sheet.png. A layer
// that fades into what is behind it prints a warning. Sizes checked 2026-10-01 against WWDC25 session 361, Android's
// adaptive icon guide and web.dev's maskable icon article.
//
// Needs playwright-core and a Chromium (`npx playwright-core install chromium`).
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { encodePng, hex6, inner, inside, launch, mask, outsideCircle, pixels, root, rootStyle, shapes, slug, text, unsafe, visibleShare } from './svg-kit.mjs';

const GLYPH_STYLE = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'];
/** Glyph drawing styles from references/icons.md. */
export const ICON_STYLES = ['outline', 'solid', 'duotone'];
/** Fill opacity of a duotone tone shape: the text colour, faint, under the strokes. */
const TONE = 0.2;
/** The attributes a style puts on each glyph's root and sprite symbol. */
const styleAttrs = (style, stroke) => style === 'solid'
  ? { fill: 'currentColor' }
  : { fill: 'none', stroke: 'currentColor', 'stroke-width': String(stroke), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
const attrText = attrs => Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
/** A file's markup, inside a <g> that carries its root styling when it has any. */
const wrap = (svg, skip) => { const style = rootStyle(svg, skip); return style ? `<g${style}>${inner(svg)}</g>` : inner(svg); };

/** Shares of the icon width: Android always shows the inner 66 of 108 dp; web.dev keeps maskable content within a 40% radius. */
export const safeZones = { android: 33 / 108, maskable: 0.4 };

/** App icon exports. flat: background and layers, opaque. layers: transparent foreground. mono: one colour, transparent. */
export const appTargets = [
  { file: 'ios/icon-1024.png', size: 1024, kind: 'flat', use: 'App Store and Expo icon' },
  { file: 'android/foreground.png', size: 1024, kind: 'layers', use: 'Expo android.adaptiveIcon.foregroundImage' },
  { file: 'android/monochrome.png', size: 1024, kind: 'mono', use: 'Expo android.adaptiveIcon.monochromeImage, themed icons on Android 13+' },
  { file: 'play-512.png', size: 512, kind: 'flat', use: 'Google Play listing icon' },
  { file: 'pwa/icon-192.png', size: 192, kind: 'flat', use: 'Web app manifest' },
  { file: 'pwa/icon-512.png', size: 512, kind: 'flat', use: 'Web app manifest' },
  { file: 'pwa/maskable-512.png', size: 512, kind: 'flat', use: 'Web app manifest, purpose maskable' },
  { file: 'web/favicon-48.png', size: 48, kind: 'flat', use: 'Favicon fallback and Expo web.favicon' },
  { file: 'web/apple-touch-icon.png', size: 180, kind: 'flat', use: 'apple-touch-icon link' },
];

/** The manifest icons array for the PWA exports, with paths relative to app/. */
export const manifestIcons = [
  { src: 'pwa/icon-192.png', sizes: '192x192', type: 'image/png' },
  { src: 'pwa/icon-512.png', sizes: '512x512', type: 'image/png' },
  { src: 'pwa/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
];

/** Problems with one glyph: canvas, unsafe content, and the style's rules on every shape. */
export function checkGlyph(svg, { grid = 24, stroke = 2, style = 'outline' } = {}) {
  const attrs = root(svg);
  if (!attrs) return ['root element must be <svg>'];
  const errors = unsafe(svg);
  if (attrs.viewBox !== `0 0 ${grid} ${grid}`) errors.push(`viewBox must be "0 0 ${grid} ${grid}"`);
  const list = shapes(svg);
  if (!list.length) errors.push('draws no shapes');
  let tones = 0;
  for (const { tag, attrs: a } of list) {
    if (style === 'solid') {
      if (a.fill !== 'currentColor') errors.push(`<${tag}> fill must be currentColor so the glyph takes the text colour`);
      if (a.stroke !== undefined && a.stroke !== 'none') errors.push(`<${tag}> must not stroke; solid glyphs are filled shapes`);
      continue;
    }
    if (style === 'duotone' && a.fill === 'currentColor') {
      tones++;
      if (Number(a['fill-opacity']) !== TONE) errors.push(`<${tag}> tone needs fill-opacity="${TONE}"`);
      if (a.stroke !== 'none') errors.push(`<${tag}> tone needs stroke="none"; the outline strokes sit on top`);
      continue;
    }
    if (a.fill !== 'none') errors.push(`<${tag}> fill must be none; glyphs are drawn in strokes`);
    if (a.stroke !== 'currentColor') errors.push(`<${tag}> stroke must be currentColor so the glyph takes the text colour`);
    if (Number(a['stroke-width']) !== stroke) errors.push(`<${tag}> stroke-width must be ${stroke}`);
    if (a['stroke-linecap'] !== 'round') errors.push(`<${tag}> stroke-linecap must be round`);
    if (a['stroke-linejoin'] !== 'round') errors.push(`<${tag}> stroke-linejoin must be round`);
  }
  if (style === 'duotone' && list.length && !tones) errors.push(`duotone glyphs need a tone shape: fill="currentColor" fill-opacity="${TONE}" stroke="none"`);
  return [...new Set(errors)];
}

/** A checked glyph rebuilt with the style's attributes on the root and no title or size. Outline and solid shapes drop
 * their own style attributes; duotone shapes keep theirs, since tone shapes override the root. */
export function normalizeGlyph(svg, { grid = 24, stroke = 2, style = 'outline' } = {}) {
  const attrs = styleAttrs(style, stroke), keep = style === 'duotone', from = root(svg) ?? {};
  let body = wrap(svg, keep ? GLYPH_STYLE.filter(k => from[k] === attrs[k]) : GLYPH_STYLE).replace(/<(title|desc)\b[\s\S]*?<\/\1>/g, '');
  if (!keep) body = body.replace(/\s(fill|stroke|stroke-width|stroke-linecap|stroke-linejoin)\s*=\s*("[^"]*"|'[^']*')/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${grid} ${grid}" ${attrText(attrs)}>${body.replace(/>\s+</g, '><').trim()}</svg>`;
}

/** One SVG of <symbol> elements with id prefix-name, for <svg><use href="sprite.svg#prefix-name"/></svg>. */
export function sprite(glyphs, { prefix, grid = 24, stroke = 2, style = 'outline' }) {
  const symbols = glyphs.map(g => `<symbol id="${prefix}-${g.name}" viewBox="0 0 ${grid} ${grid}" ${attrText(styleAttrs(style, stroke))}>${inner(g.svg)}</symbol>`);
  return `<svg xmlns="http://www.w3.org/2000/svg">${symbols.join('')}</svg>\n`;
}

/** Problems with one app icon layer: the 1024 Icon Composer canvas and no live text or embedded media. */
export function checkAppLayer(svg) {
  const attrs = root(svg);
  if (!attrs) return ['root element must be <svg>'];
  const errors = unsafe(svg);
  if (attrs.viewBox !== '0 0 1024 1024') errors.push('viewBox must be "0 0 1024 1024", the Icon Composer canvas');
  if (!shapes(svg).length) errors.push('draws no shapes');
  return errors;
}

/** The app icon as one SVG: an optional background square, then the layers bottom to top. */
export function composeApp(layers, background) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${background ? `<rect width="1024" height="1024" fill="${background}"/>` : ''}${layers.map(l => wrap(l)).join('')}</svg>`;
}

/** favicon.svg: the light drawing alone, or both with the dark one shown while the browser is in dark mode. */
export function faviconSvg(light, dark) {
  if (!dark) return light;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><style>#favicon-dark{display:none}@media (prefers-color-scheme: dark){#favicon-light{display:none}#favicon-dark{display:inline}}</style><g id="favicon-light">${inner(light)}</g><g id="favicon-dark">${inner(dark)}</g></svg>`;
}

/** An .ico file holding each PNG behind a directory entry; browsers and Windows read PNG entries. */
export function encodeIco(images) {
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(1, 2); head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach(({ size, png }, i) => {
    const entry = 6 + 16 * i;
    head[entry] = head[entry + 1] = size % 256;
    head.writeUInt16LE(1, entry + 4); head.writeUInt16LE(32, entry + 6);
    head.writeUInt32LE(png.length, entry + 8); head.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([head, ...images.map(i => i.png)]);
}

function fileErrors(dir, file, at, check) {
  if (!text(file) || !inside(dir, file)) return [`${at} must be a path inside the spec's folder`];
  const full = path.resolve(dir, file);
  if (!existsSync(full)) return [`${at} not found: ${file}`];
  return check(readFileSync(full, 'utf8')).map(e => `${file}: ${e}`);
}

/** Errors for an icons spec and its files. root is the spec's folder. */
export function validateIcons(spec, { root: dir = '.' } = {}) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) return { errors: ['spec must be an object'] };
  const errors = [];
  if (spec.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (!slug(spec.prefix)) errors.push('prefix must be a short lowercase slug, such as dh');
  const grid = spec.grid ?? 24, stroke = spec.stroke ?? 2, style = spec.style ?? 'outline';
  if (!ICON_STYLES.includes(style)) errors.push(`style must be one of ${ICON_STYLES.join(', ')}`);
  if (!Number.isInteger(grid) || grid < 12) errors.push('grid must be a whole number of at least 12');
  if (!(typeof stroke === 'number' && stroke > 0 && stroke <= 3)) errors.push('stroke must be a number above 0 and at most 3');
  const glyphs = Array.isArray(spec.glyphs) ? spec.glyphs : [];
  if (!glyphs.length && spec.app === undefined) errors.push('add glyphs, an app icon or both');
  const names = new Set();
  glyphs.forEach((g, i) => {
    const at = `glyphs[${i}]${text(g?.name) ? ` (${g.name})` : ''}`;
    if (!slug(g?.name)) errors.push(`${at}.name must be kebab-case`);
    else if (names.has(g.name)) errors.push(`duplicate glyph: ${g.name}`);
    else names.add(g.name);
    if (!text(g?.meaning)) errors.push(`${at}.meaning must say what the glyph stands for; a glyph without one is decoration`);
    errors.push(...fileErrors(dir, g?.file, `${at}.file`, svg => checkGlyph(svg, { grid, stroke, style })));
  });
  if (spec.app !== undefined) {
    const app = spec.app ?? {};
    if (!hex6(app.background)) errors.push('app.background must be a six-digit hex; Icon Composer sets it, so it is not a layer');
    const layers = Array.isArray(app.layers) ? app.layers : [];
    if (layers.length < 1 || layers.length > 4) errors.push('app.layers needs 1 to 4 SVG files, bottom to top (Icon Composer groups)');
    layers.forEach((file, i) => errors.push(...fileErrors(dir, file, `app.layers[${i}]`, checkAppLayer)));
    if (app.monochrome !== undefined) errors.push(...fileErrors(dir, app.monochrome, 'app.monochrome', checkAppLayer));
    if (app.dark !== undefined) {
      const dark = app.dark ?? {}, darkLayers = Array.isArray(dark.layers) ? dark.layers : [];
      if (!hex6(dark.background)) errors.push('app.dark.background must be a six-digit hex');
      if (darkLayers.length < 1 || darkLayers.length > 4) errors.push('app.dark.layers needs 1 to 4 SVG files, bottom to top, drawn for dark mode');
      darkLayers.forEach((file, i) => errors.push(...fileErrors(dir, file, `app.dark.layers[${i}]`, checkAppLayer)));
    }
  }
  return { errors };
}
/** Each glyph at 16, 24, 32 and 48 px in text colour on light and dark. */
async function glyphSheet(browser, set, file) {
  const cell = g => `<figure>${[16, 24, 32, 48].map(n => g.svg.replace('<svg ', `<svg width="${n}" height="${n}" `)).join('')}<figcaption>${g.name}</figcaption></figure>`;
  const page = await browser.newPage({ viewport: { width: 1200, height: 600 } });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;font:13px ui-monospace,monospace}section{display:grid;grid-template-columns:repeat(4,1fr);gap:32px;padding:40px}figure{margin:0;display:flex;flex-wrap:wrap;gap:14px;align-items:end}figcaption{width:100%}</style></head><body><section style="background:#ffffff;color:#111111">${set.map(cell).join('')}</section><section style="background:#111111;color:#f5f5f5">${set.map(cell).join('')}</section></body></html>`);
  await page.screenshot({ path: file, fullPage: true });
  await page.close();
}

/** The icon under square, rounded and circle masks with both safe zones drawn, then at small sizes on light, on dark (with
 * the dark drawing when there is one) and in grayscale. */
async function appSheet(browser, flat, darkFlat, foreground, background, file) {
  const src = svg => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  const zone = share => `<i style="position:absolute;inset:${((0.5 - share) * 100).toFixed(2)}%;border:2px dashed #e5484d;border-radius:50%"></i>`;
  const masks = [['Square, Android and maskable safe zones', '0', true], ['Rounded (iOS approximation)', '22.4%', false], ['Circle (Android)', '50%', false]]
    .map(([label, radius, zones]) => `<figure><div style="position:relative;width:256px;height:256px;border-radius:${radius};overflow:hidden;background:${background}"><img src="${src(foreground)}" width="256" height="256" alt="">${zones ? zone(safeZones.android) + zone(safeZones.maskable) : ''}</div><figcaption>${label}</figcaption></figure>`).join('');
  const small = (bg, svg, label, filter = 'none') => `<figure style="background:${bg};padding:16px">${[180, 48, 32, 16].map(n => `<img src="${src(svg)}" width="${n}" height="${n}" alt="" style="border-radius:22.4%;filter:${filter}">`).join('')}<figcaption style="color:#888">${label}</figcaption></figure>`;
  const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:40px;display:flex;flex-wrap:wrap;gap:40px;align-items:end;font:13px ui-monospace,monospace;background:#fff}figure{margin:0;display:flex;flex-wrap:wrap;gap:16px;align-items:end}figcaption{width:100%}</style></head><body>${masks}${small('#ffffff', flat, 'light')}${small('#111111', darkFlat, 'dark')}${small('#ffffff', flat, 'grayscale', 'grayscale(1)')}</body></html>`);
  await page.screenshot({ path: file, fullPage: true });
  await page.close();
}

/** Warnings for layers with under 20% of their pixels at 3:1 against the background and the layers below them. */
async function faintLayers(page, files, layers, background) {
  const found = [];
  for (const [i, file] of files.entries()) {
    const share = visibleShare(await pixels(page, layers[i], 256), await pixels(page, composeApp(layers.slice(0, i), background), 256));
    if (share < 0.2) found.push(`app icon: ${file} keeps ${Math.round(share * 100)}% of its pixels at 3:1 against the background and the layers below; change its colour or give it an edge that contrasts`);
  }
  return found;
}

/** Write every app icon export and the review sheet; return problems and warnings. */
async function exportApp(browser, page, app, read, out, sheetFile) {
  const layers = app.layers.map(read);
  const foreground = composeApp(layers), flat = composeApp(layers, app.background);
  const dark = app.dark && { files: app.dark.layers, layers: app.dark.layers.map(read), background: app.dark.background };
  const darkFlat = dark ? composeApp(dark.layers, dark.background) : flat;
  const problems = [], warnings = await faintLayers(page, app.layers, layers, app.background);
  if (dark) warnings.push(...await faintLayers(page, dark.files, dark.layers, dark.background));
  const outside = outsideCircle(await mask(page, foreground, 256), 256, safeZones.android);
  if (outside) problems.push(`app icon: ${outside} pixels at 256 px fall outside Android's 66 dp safe zone; scale the mark toward the centre`);
  for (const sub of ['ios', 'android', 'pwa', 'web']) mkdirSync(path.join(out, sub), { recursive: true });
  app.layers.forEach((file, i) => writeFileSync(path.join(out, 'ios', `${i + 1}-${path.basename(file)}`), read(file)));
  for (const t of appTargets) {
    const svg = t.kind === 'mono' && app.monochrome ? read(app.monochrome) : t.kind === 'flat' ? flat : foreground;
    const px = await pixels(page, svg, t.size, t.kind === 'flat' ? app.background : undefined);
    if (t.kind === 'mono' && !app.monochrome) for (let i = 0; i < px.length; i += 4) px[i] = px[i + 1] = px[i + 2] = 0;
    writeFileSync(path.join(out, t.file), encodePng(t.size, t.size, px, { alpha: t.kind !== 'flat' }));
  }
  writeFileSync(path.join(out, 'web', 'favicon.svg'), `${faviconSvg(flat, dark && darkFlat)}\n`);
  const ico = [];
  for (const size of [16, 32, 48]) ico.push({ size, png: encodePng(size, size, await pixels(page, flat, size, app.background)) });
  writeFileSync(path.join(out, 'web', 'favicon.ico'), encodeIco(ico));
  writeFileSync(path.join(out, 'manifest-icons.json'), `${JSON.stringify(manifestIcons, null, 2)}\n`);
  await appSheet(browser, flat, darkFlat, foreground, app.background, sheetFile);
  return { problems, warnings };
}

async function main() {
  const argv = process.argv.slice(2), input = argv[0];
  if (!input || input.startsWith('--')) throw new Error('Usage: node icons.mjs <dir>/icons.json [--out DIR]');
  const dir = path.dirname(path.resolve(input));
  const spec = JSON.parse(readFileSync(input, 'utf8'));
  const { errors } = validateIcons(spec, { root: dir });
  if (errors.length) throw new Error(errors.join('\n'));
  const at = argv.indexOf('--out');
  const out = path.resolve(at > 0 ? argv[at + 1] : path.join(dir, 'out'));
  const read = file => readFileSync(path.resolve(dir, file), 'utf8');
  const grid = spec.grid ?? 24, stroke = spec.stroke ?? 2, style = spec.style ?? 'outline', glyphs = spec.glyphs ?? [];
  const problems = [], warnings = [];
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.setContent('<!doctype html><html><body></body></html>');
    if (glyphs.length) {
      const set = glyphs.map(g => ({ name: g.name, svg: normalizeGlyph(read(g.file), { grid, stroke, style }) }));
      mkdirSync(path.join(out, 'glyphs'), { recursive: true });
      for (const g of set) {
        writeFileSync(path.join(out, 'glyphs', `${g.name}.svg`), `${g.svg}\n`);
        // The drawn box plus half the stroke, if any, must stay 1 px inside the canvas (Lucide canvas rule 3).
        const [x0, y0, x1, y1] = await page.evaluate(svg => {
          document.body.innerHTML = svg.replace(/(<svg[^>]*>)/, '$1<g id="drawn">').replace('</svg>', '</g></svg>');
          const b = document.getElementById('drawn').getBBox();
          return [b.x, b.y, b.x + b.width, b.y + b.height];
        }, g.svg);
        const gap = Math.min(x0, y0, grid - x1, grid - y1) - (style === 'solid' ? 0 : stroke / 2);
        if (gap < 1 - 1e-6) problems.push(`${g.name}: strokes come within ${gap.toFixed(2)} px of the edge; keep 1 px clear`);
      }
      writeFileSync(path.join(out, 'sprite.svg'), sprite(set, { prefix: spec.prefix, grid, stroke, style }));
      await glyphSheet(browser, set, path.join(out, 'glyph-sheet.png'));
    }
    if (spec.app) {
      const app = await exportApp(browser, page, spec.app, read, path.join(out, 'app'), path.join(out, 'app-sheet.png'));
      problems.push(...app.problems); warnings.push(...app.warnings);
    }
  } finally { await browser.close(); }
  for (const w of warnings) console.warn(`warning: ${w}`);
  if (problems.length) throw new Error(problems.join('\n'));
  console.log(`Icons exported to ${path.relative(process.cwd(), out) || '.'}: ${glyphs.length} glyphs${spec.app ? ' and the app icon' : ''}. Review the sheets at 16 px; importing the iOS layers into Icon Composer is a manual step.`);
}

// realpath: Node resolves a symlinked script to its target, so compare against the resolved path.
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
